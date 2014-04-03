##
## <infinite-slider> attributes
##
##  acceleration  || 1.15       # "acceleration"  > 1
##  friction      || 0.95       # "friction" < 1
##  spring-back   || 0.1        # spring-back 0..1 1=fastest
##  click-fudge   || 2          # pixels of movement that still allow click
##  max-velocity  || 70         # maximum scrollwheel velocity
##  snap          || false      # per-item snapping **ONLY WORKS IF ALL ITEMS ARE THE SAME WIDTH
##
(->

  angular.module('gilbox.infiniteSlider.helpers', []).factory 'browserHelper', ['$window', ($window) ->
    _has3d = undefined

    has3d: ->   # perform check the first time the function is invoked
      return _has3d if _has3d isnt `undefined`
      return _has3d = (-> # http://stackoverflow.com/questions/5661671/detecting-transform-translate3d-support
        el = document.createElement("p")
        has3d = undefined
        transforms =
          webkitTransform: "-webkit-transform"
          OTransform: "-o-transform"
          msTransform: "-ms-transform"
          MozTransform: "-moz-transform"
          transform: "transform"
        document.body.insertBefore el, null
        for t of transforms
          if el.style[t] isnt `undefined`
            el.style[t] = "translate3d(1px,1px,1px)"
            has3d = $window.getComputedStyle(el).getPropertyValue(transforms[t])
        document.body.removeChild el
        has3d isnt `undefined` and has3d.length > 0 and has3d isnt "none")()

    getTouchPoint: (event) ->
      #console.log "-->event", event
      e = switch
        when event.touches?
          event.touches[0]
        when event.originalEvent? && event.originalEvent.touches? && event.originalEvent.touches.length
          event.originalEvent.touches[0]
        else event
      angular.extend e, {x: e.pageX, y: e.pageY}

  ] # /browserHelper

  angular.module('gilbox.infiniteSlider', ['monospaced.mousewheel', 'gilbox.infiniteSlider.helpers'])

    # define a touch-region using infinite-slider-boundary
    # must be a parent of the infinite-slider element.
    .directive 'infiniteSliderBoundary', ->
      restrict: 'AE'
      transclude: true
      template: '<div ng-transclude msd-wheel="wheel($event, $delta, $deltaX, $deltaY)"></div>'
      controller: ['$scope', '$element', ($scope, $element) ->
        @elm = $element
        @setWheelFn = (fn) -> $scope.wheel = fn
        @
      ]

    .directive 'infiniteSlider', ['$window', '$document', 'browserHelper', ($window, $document, browserHelper) ->
      restrict: 'A'
      scope: {
        slides: '=?',
        snappedItemId: '='
      }
      require: '^infiniteSliderBoundary'
      link: (scope, element, attrs, boundaryCtrl) ->
        a = attrs.acceleration || 1.05         # "acceleration"  > 1
        f = attrs.friction || 0.95            # "friction" < 1
        spring = attrs.springBack || 0.1      # spring-back 0..1 1=fastest
        clickFudge = attrs.clickFudge || 2    # pixels of movement that still allow click
        maxv = attrs.maxVelocity || 50        # maximum scrollwheel velocity
        snap = attrs.snap && attrs.snap != 'false'
        classifyClosest = attrs.classifyClosest && attrs.classifyClosest != 'false'

        v = 0           # "velocity"
        xCont = 0
        naxv = -maxv
        winElm = angular.element($window)
        boundaryElm = (boundaryCtrl && boundaryCtrl.elm) || element;
        contElm = element.children().eq(0)
        items = null
        endTypes = 'touchend touchcancel mouseup mouseleave'
        moveTypes = 'touchmove mousemove'
        startTypes = 'touchstart mousedown'
        moveTypesArray = moveTypes.split ' '
        allowClick = true
        interactionStart = null
        interactionCurrent = null
        prevInteraction = null
        xMin = 0
        xMax = 0
        firstItem = null
        lastItem = null
        itemWidth = 0
        enableRun = true

        has3d = browserHelper.has3d()

        scope.$watch 'snappedItemId', (newId) ->
          newId = parseInt(newId)
          # the second condition determines if the id was changed internally,
          # because if it was then we don't need to do this stuff
          if 0 <= newId < items.length and scope.snappedItemId != scope.snappedItemElm.idx
            setSnappedItem items[newId].elm
            xCont = -itemWidth * newId
            calcContentWidth()
            rearrange()
            doTransform(true)

        setAllowClick = (v) ->
          allowClick = v
          element.toggleClass 'allow-click', !v

        setAllowClick true

        $document.bind endTypes, (event) -> # drag end
          unless (allowClick)
            event.preventDefault()
            if (interactionStart == null || (Math.abs(interactionCurrent.x - interactionStart.x) < clickFudge && Math.abs(interactionCurrent.y - interactionStart.y) < clickFudge))
              setAllowClick true # click now
              el = document.elementFromPoint(interactionCurrent.x, interactionCurrent.y);
              if el? and !interactionCurrent.button
                document.elementFromPoint(interactionCurrent.clientX, interactionCurrent.clientY).click();
            else
              v = prevInteraction.x - interactionCurrent.x  # momentum-generated velocity
              setTimeout (-> setAllowClick true), 100  # don't allow click todo: seems hacky, a better way to do this?

          interactionStart = null
          for type in moveTypesArray
            $document.unbind type


        boundaryElm.bind startTypes, (event) ->  # drag start
          event.preventDefault()
          setAllowClick false
          v = 0
          elementStartX = xCont
          interactionStart = interactionCurrent = browserHelper.getTouchPoint event

          $document.bind moveTypes, (event) ->  # drag move
            event.preventDefault()
            prevInteraction = interactionCurrent if interactionCurrent
            interactionCurrent = browserHelper.getTouchPoint event

            if prevInteraction # viewport scrolling (up/down)
              dy = prevInteraction.y - interactionCurrent.y
              dx = prevInteraction.x - interactionCurrent.x
              if (Math.abs(dy) > Math.abs(dx))
                $window.scrollBy(0, dy)
                prevInteraction.y += dy
                interactionCurrent.y += dy

            xCont = elementStartX + (interactionCurrent.x - interactionStart.x)
            doTransform()


        boundaryElm.bind 'click', (event) ->
          event.preventDefault() if (!allowClick)
          allowClick


        setSnappedItem = (newSnappedItem) ->
          scope.snappedItemElm.removeClass 'snapped' if scope.snappedItemElm
          newSnappedItem.addClass 'snapped'
          scope.snappedItemElm = newSnappedItem
          scope.snappedItemId = newSnappedItem.idx


        setClosestItem = (newClosestItem) ->
          scope.closestItem.removeClass 'closest' if scope.closestItem
          newClosestItem.addClass 'closest'
          scope.closestItem = newClosestItem


        run = ->
          setInterval (->
            if enableRun
              xchanged = false

              if v
                v *= f
                xCont -= v
                v = 0 if Math.abs(v) < 0.001
                xchanged = true

              if classifyClosest || snap

                snapTargetX = itemWidth * Math.round(xCont / itemWidth)
                newSnappedItemId = (firstItem.idx + Math.abs(firstItem.x + snapTargetX)/itemWidth) % items.length
                newSnappedItem = items[newSnappedItemId].elm

                if classifyClosest && scope.closestItem != newSnappedItem
                  setClosestItem newSnappedItem

                if allowClick && Math.abs(v) < 2
                  if newSnappedItemId != scope.snappedItemId
                    setSnappedItem newSnappedItem
                    scope.$apply()

                  if xCont != snapTargetX
                    xCont += (snapTargetX-xCont)*spring
                    xchanged = true

              if xchanged
                doTransform()
                rearrange()

          ), 20


        # endless loop rearrange
        rearrange = ->
          return if !items || !items.length
          if lastItem.x + xCont > xMax + lastItem.clientWidth * 0.51
            lastItem.x = firstItem.x - lastItem.clientWidth
            positionItem lastItem
            [firstItem, lastItem] = [lastItem, lastItem.prevItem]
            rearrange()

          else if firstItem.x + xCont < xMin - firstItem.clientWidth * 0.51
            firstItem.x = lastItem.x + firstItem.clientWidth
            positionItem firstItem
            [firstItem, lastItem] = [firstItem.nextItem, firstItem]
            rearrange()


        positionItem = (item) ->
          item.style.left = item.x + 'px'


        # use css transition (transition==true) for a smooth animation
        # when jumping to a new snapped-item-id
        doTransform = (transition)->
          if has3d
            if transition
              contElm.css
                '-webkit-transition': '-webkit-transform .5s'
                'transition': 'transform .5s'
              enableRun = false

              setTimeout ->
                # todo: calling doTransform(true) before timeout completes could be trouble
                contElm.css
                  '-webkit-transition': 'none'
                  'transition': 'none'
                enableRun = true
              , 500

            contElm.css
              '-webkit-transform': 'translate3d(' + xCont + 'px, 0px, 0px)'
              '-moz-transform': 'translate3d(' + xCont + 'px, 0px, 0px)'
              '-o-transform': 'translate3d(' + xCont + 'px, 0px, 0px)'
              '-ms-transform': 'translate3d(' + xCont + 'px, 0px, 0px)'
              'transform': 'translate3d(' + xCont + 'px, 0px,0px)'

          else
            contElm.css('left', xCont);


        calcContentWidth = ->
          return if !items || !items.length
          contentWidth = 0
          lastidx = items.length-1
          firstItem = items[0]
          lastItem = items[lastidx]
          itemWidth = firstItem.clientWidth
          for item,i in items
            if item is lastItem then item.nextItem = firstItem else item.nextItem = items[i+1]
            if item is firstItem then item.prevItem = lastItem else item.prevItem = items[i-1]

            item.x = contentWidth
            item.elm = items.eq(i)
            item.idx = item.elm.idx = i
            positionItem(item)
            contentWidth += item.clientWidth

          boundsOffsetX = element[0].clientWidth/2 - itemWidth/2
          xMax = contentWidth/2 + boundsOffsetX
          xMin = boundsOffsetX - contentWidth/2


        onWinResize = ->
          calcContentWidth()

          if items? and items.length
            if snap && ! scope.snappedItemElm          then setSnappedItem items[0].elm
            if classifyClosest && ! scope.closestItem  then setClosestItem items[0].elm

          rearrange()

          # todo: to prevent snapped item from changing on window resize, we could calculate
          #       change in position of element and offset xCont accordingliny, although responsive
          #       layout could still pose a problem


        boundaryCtrl.setWheelFn (event, delta, deltaX, deltaY) ->
          if deltaX
            event.preventDefault()
            if deltaX > 0
              v = 1  if v < 1
              v = Math.min(maxv, (v + 2) * a)
            else
              v = -1  if v > -1
              v = Math.max(naxv, (v - 2) * a)


        if scope.slides
          scope.$watch 'slides', ->
            items = contElm.children()
            onWinResize()

        # initialize

        onWinResize()


        run()
        winElm.on 'resize', onWinResize
    ] # /infiniteSlider
)()