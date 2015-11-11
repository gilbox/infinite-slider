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
    e = switch
      when event.touches?
        event.touches[0]
      when event.originalEvent? && event.originalEvent.touches? && event.originalEvent.touches.length
        event.originalEvent.touches[0]
      else event
    # TODO: Make this more efficient. We are extending the new object here because mobile safari re-uses touch event objects.
    angular.extend {x: e.pageX, y: e.pageY}, e

] # /browserHelper

# Optional mousewheel support
deps = ['gilbox.infiniteSlider.helpers']
try
  angular.module 'monospaced.mousewheel'
  deps.unshift 'monospaced.mousewheel'
catch e

angular.module('gilbox.infiniteSlider', deps)

# define a touch-region using infinite-slider-boundary
# may be a parent, or child, of the infinite-slider element.
.directive 'infiniteSliderBoundary', ->
  restrict: 'AE'
  scope: {} # necessary to isolate msd-wheel scope with multiple sliders
  transclude: true
  replace: true
  template: '<div ng-transclude msd-wheel="wheel($event, $delta, $deltaX, $deltaY)"></div>'
  require: '?^infiniteSlider'
  controller: ['$scope', '$element', ($scope, $element) ->
    @elm = $element
    @setWheelFn = (fn) -> $scope.wheel = fn
    @ # why is this necessary?
  ]
  link: (scope, element, attrs, ctrl) ->
    if ctrl
      ctrl.setBoundaryElm(element)
      scope.wheel = ctrl.wheelFn

.directive 'infiniteSliderContent', ->
  restrict: 'AE'
  require: '^infiniteSlider'
  link: (scope, element, attrs, ctrl) -> ctrl.setContElm element

.directive 'infiniteSlider', ['$window', '$document', '$timeout', 'browserHelper', ($window, $document, $timeout, browserHelper) ->
  restrict: 'AE'
  scope: {
    snappedItemId: '=?',
    closestItemId: '=?',
    isJumping: '=?'
  }
  require: '?^infiniteSliderBoundary'
  controller: [ '$scope', ($scope) ->
    @setBoundaryElm = (elm) -> $scope.boundaryElm = elm
    @setContElm = (elm) -> $scope.contElm = elm
    @wheelFn = (event, delta, deltaX, deltaY) -> $scope.wheelFn(event, delta, deltaX, deltaY)
    @
  ]
  link: (scope, element, attrs, boundaryCtrl) ->
    animationFrame = new AnimationFrame()
    a = attrs.acceleration || 1.05         # "acceleration"  > 1
    f = attrs.friction || 0.95            # 0 < "friction" < 1
    spring = attrs.springBack || 0.3      # spring-back 0..1 1=fastest
    clickFudge = attrs.clickFudge || 2    # pixels of movement that still allow click
    snap = attrs.hasOwnProperty('snap') && attrs.snap != 'false'
    snapVelocityTrigger = attrs.snapVelocityTrigger || 5
    classifyClosest = attrs.hasOwnProperty('classifyClosest') && attrs.classifyClosest != 'false'
    classifySnapped = attrs.hasOwnProperty('classifySnapped') && attrs.classifySnapped != 'false'

    elmScope = element.scope()
    v = 0           # "velocity"
    xCont = 0
    winElm = angular.element($window)
    boundaryElm = scope.boundaryElm || (boundaryCtrl && boundaryCtrl.elm) || element;
    contElm = scope.contElm || element.children().eq(0)
    items = null
    endTypes = 'touchend touchcancel mouseup mouseleave'
    moveTypes = 'touchmove mousemove'
    startTypes = 'touchstart mousedown'
    allowClick = true
    elementStartX = 0
    interactionStart = null
    interactionCurrent = null
    prevInteraction = null
    xMin = 0
    xMax = 0
    firstItem = null
    lastItem = null
    itemWidth = 0
    jumping = false
    snappedItemId = scope.snappedItemId # we'll keep track of snapped item id even if an attribute isn't present
    snappedItemId_isBound = scope.hasOwnProperty('snappedItemId')
    closestItemId_isBound = scope.hasOwnProperty('closestItemId')
    isJumping_isBound = scope.hasOwnProperty('isJumping')
    scope.isJumping = false if isJumping_isBound
    lastWheelTime = new Date()
    running = false

    has3d = browserHelper.has3d()

    # declare this variable here which is calculated in run() so it may be utilized by the snappedItemId $watcher
    snapTargetX = 0

    toIds = {}
    setTimeoutWithId = (fn, ms, id) ->
      clearTimeout toIds[id]
      toIds[id] = setTimeout fn, ms


    setAllowClick = (v) ->
      allowClick = v
      element.toggleClass 'allow-click', !v

    setAllowClick true


    endHandler = (event) -> # drag end
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
      $document.off moveTypes, moveHandler

    moveHandler = (event) ->  # drag move
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

    startHandler = (event) ->  # drag start
      event.preventDefault()
      setAllowClick false
      v = 0
      elementStartX = xCont
      interactionStart = interactionCurrent = browserHelper.getTouchPoint event

      $document.on moveTypes, moveHandler

    clickHandler = (event) ->
      event.preventDefault() if (!allowClick)
      allowClick
    
    attrs.$observe 'disableDrag',
      (next) -> 
        if next != 'true'
          $document.on endTypes, endHandler
          boundaryElm.on startTypes, startHandler
          boundaryElm.on 'click', clickHandler
        else
          $document.off endTypes, endHandler
          boundaryElm.off startTypes, startHandler
          boundaryElm.off 'click', clickHandler

    setSnappedItem = (newSnappedItem) ->
      scope.snappedItemElm.removeClass 'snapped' if scope.snappedItemElm and classifySnapped
      newSnappedItem.addClass 'snapped' if classifySnapped
      scope.snappedItemElm = newSnappedItem
      snappedItemId = newSnappedItem.idx
      scope.snappedItemId = snappedItemId if snappedItemId_isBound


    setClosestItem = (newClosestItem) ->
      scope.closestItem.removeClass 'closest' if scope.closestItem
      newClosestItem.addClass 'closest'
      if closestItemId_isBound && scope.closestItem # skip first call by checking if cloestItem is undefined
        scope.closestItemId = newClosestItem.idx
        scope.$apply()
      scope.closestItem = newClosestItem


    onFrame = ->
      if !jumping && items && itemWidth
        xchanged = false


        if classifyClosest || snap

          snapTargetX = itemWidth * Math.round(xCont / itemWidth)
          newSnappedItemId = (firstItem.idx + Math.abs(firstItem.x + snapTargetX)/itemWidth) %% items.length
          newSnappedItem = items[newSnappedItemId].elm

          if classifyClosest && scope.closestItem != newSnappedItem
            setClosestItem newSnappedItem

          if allowClick && Math.abs(v) < snapVelocityTrigger

            if xCont != snapTargetX
              xCont += (snapTargetX-xCont)*spring
              xCont = snapTargetX if Math.abs(snapTargetX-xCont)<1
              xchanged = true
              v = 0
            else
              if newSnappedItemId != snappedItemId
                setSnappedItem newSnappedItem
                scope.$apply() if snappedItemId_isBound

        if v
          v *= f
          xCont -= v
          v = 0 if Math.abs(v) < 0.001
          xchanged = true

        if xchanged
          doTransform()
          rearrange()

      animationFrame.request(onFrame) if running

    run = ->
      running = true
      animationFrame.request(onFrame)


    # endless loop rearrange
    rearrange = ->
      if items
        rearr = (prevItem)->
          if firstItem.x + xCont < xMin - firstItem.clientWidth * 0.51
            prev = firstItem
            firstItem.x = lastItem.x + firstItem.clientWidth
            positionItem firstItem
            [firstItem, lastItem] = [firstItem.nextItem, firstItem]
            rearrange(prev) if prevItem != firstItem

          else if lastItem.x + xCont > xMax #+ lastItem.clientWidth * 0.51
            prev = lastItem
            lastItem.x = firstItem.x - lastItem.clientWidth
            positionItem lastItem
            [firstItem, lastItem] = [lastItem, lastItem.prevItem]
            rearrange(prev)
        rearr()


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
          jumping = true
          scope.isJumping = true if isJumping_isBound

          setTimeoutWithId ->
            contElm.css
              '-webkit-transition': 'none'
              'transition': 'none'
            jumping = false
            scope.isJumping = false if isJumping_isBound
          , 500, 1

        contElm.css
          '-webkit-transform': 'translate3d(' + xCont + 'px, 0px, 0px)'
          '-moz-transform': 'translate3d(' + xCont + 'px, 0px, 0px)'
          '-o-transform': 'translate3d(' + xCont + 'px, 0px, 0px)'
          '-ms-transform': 'translate3d(' + xCont + 'px, 0px, 0px)'
          'transform': 'translate3d(' + xCont + 'px, 0px,0px)'

      else
        contElm.css('left', xCont + 'px');


    # returns false if unable to calculate a content width,
    # otherwise assigns the value to contentWidth
    calcContentWidth = ->
      return if !items
      contentWidth = 0
      lastidx = items.length-1
      firstItem = items[0]
      lastItem = items[lastidx]
      itemWidth = firstItem.clientWidth
      unless itemWidth
        setTimeoutWithId calcContentWidth, 200, 2  # todo: a better way? seems hacky
        return false

      for item,i in items
        if item is lastItem then item.nextItem = firstItem else item.nextItem = items[i+1]
        if item is firstItem then item.prevItem = lastItem else item.prevItem = items[i-1]

        item.x = contentWidth
        item.elm = items.eq(i)
        item.idx = item.elm.idx = i
        positionItem(item)
        contentWidth += item.clientWidth

      boundsOffsetX = element[0].clientWidth/2 - itemWidth/2

      if attrs.infiniteSliderAlign == 'left'
        xMax = contentWidth - boundsOffsetX
        xMin = boundsOffsetX
      else
        xMax = contentWidth/2 + boundsOffsetX
        xMin = boundsOffsetX - contentWidth/2

      true


    onWinResize = ->
      if calcContentWidth()

        if items
          if snap && ! scope.snappedItemElm          then setSnappedItem items[snappedItemId || 0].elm
          if classifyClosest && ! scope.closestItem  then setClosestItem items[snappedItemId || 0].elm

        if snappedItemId?

          # to prevent snapped item from changing on window resize, we recalculate
          # xCont accordingly, but will responsive layout still pose a problem ??

          xCont = -itemWidth * snappedItemId
          rearrange()
          doTransform()

        else
          rearrange()


    scope.wheelFn = (event, delta, deltaX, deltaY) ->
      # note: because of the refactor described below, when snapping behavior is turned off the wheel doesn't work
      #
      # - Wheeling modifies the snappedItemId instead of effecting velocity
      # - To overcome the erratic behavior of inertial scrolling on OS X we ignore wheel
      #   events when:
      #     the previous deltaX was greater than the current delta X
      #     when the last wheel event was also less than 100ms ago

      newTime = (new Date()).getTime()

      if deltaX and !jumping and Math.abs(deltaX) > Math.abs(deltaY) and (newTime - lastWheelTime > 50)
        event.preventDefault()

        if deltaX > 0
          scope.closestItemId = scope.snappedItemId = (scope.snappedItemId+1) %% items.length
        else
          scope.closestItemId = scope.snappedItemId = (scope.snappedItemId-1) %% items.length

      lastWheelTime = newTime
      return true


    if boundaryCtrl and snap then boundaryCtrl.setWheelFn(scope.wheelFn)


    readItems = ->
      items = contElm.children()
      items =  null if !items? || !items.length


    if attrs.slides
      elmScope.$watch attrs.slides, ->
        readItems()
        onWinResize()
      , true
    else
      $timeout ->
        readItems()
        onWinResize()


    onSnappedItemIdChange = (newId) ->
      # the third condition determines if the id was changed internally,
      # because if it was then we don't need to do this stuff
      if items and 0 <= newId < items.length and scope.snappedItemId != scope.snappedItemElm.idx
        # calculate the shortest distance to the newId item because otherwise it breaks the endless effect
        # @todo: there might be a simpler way to do this
        vId = if newId<snappedItemId then items.length+newId else newId-items.length
        targetId = if Math.abs(vId-snappedItemId) < Math.abs(newId-snappedItemId) then vId else newId
        deltaId = targetId - snappedItemId

        setSnappedItem items[newId].elm
        xCont = snapTargetX - itemWidth * deltaId
        calcContentWidth()
        rearrange()
        doTransform(true)


    scope.$watch 'snappedItemId', (newId) ->
      onWinResize()
      onSnappedItemIdChange(parseInt(newId))


    run()
    winElm.on 'resize', onWinResize

    scope.$on '$destroy', ->
      winElm.off 'resize', onWinResize
      $document.off endTypes, endHandler
      boundaryElm.off startTypes, startHandler
      $document.off moveTypes, moveHandler
      boundaryElm.off 'click', clickHandler
      running = false

] # /infiniteSlider