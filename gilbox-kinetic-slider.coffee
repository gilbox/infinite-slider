##
## <kinetic-slider> attributes
##
##  content-width (required)    # width of the content
##
##  acceleration  || 1.15       # "acceleration"  > 1
##  friction      || 0.95       # "friction" < 1
##  spring-back   || 0.1        # spring-back 0..1 1=fastest
##  click-fudge   || 2          # pixels of movement that still allow click
##  max-velocity  || 70         # maximum scrollwheel velocity
##
(->

  angular.module('gilbox.kineticSlider.helpers', []).factory 'browserHelper', ['$window', ($window) ->
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
      if event.touches?
        e = event.touches[0]
      else if event.originalEvent? && event.originalEvent.touches? && event.originalEvent.touches.length
        e = event.originalEvent.touches[0]
      else
        e = event
      angular.extend {x: e.pageX, y: e.pageY}, e

  ] # /browserHelper

  angular.module('gilbox.kineticSlider', ['monospaced.mousewheel', 'gilbox.kineticSlider.helpers']).directive 'kineticSlider', ['$window', '$document', 'browserHelper', ($window, $document, browserHelper) ->
    restrict: 'A'
    scope:
      contentWidth: '=?'
    replace: true
    transclude: true
    template: '<div ng-transclude msd-wheel="wheel($event, $delta, $deltaX, $deltaY)"></div>'
    link: (scope, element, attrs) ->

      a = attrs.acceleration || 1.05         # "acceleration"  > 1
      f = attrs.friction || 0.95            # "friction" < 1
      spring = attrs.springBack || 0.1      # spring-back 0..1 1=fastest
      clickFudge = attrs.clickFudge || 2    # pixels of movement that still allow click
      maxv = attrs.maxVelocity || 50        # maximum scrollwheel velocity

      v = 0           # "velocity"
      xOff = 0
      xMin = 0
      naxv = -maxv
      winElm = angular.element($window)
      contElm = angular.element(element.children()[0])
      endTypes = 'touchend touchcancel mouseup mouseleave'
      moveTypes = 'touchmove mousemove'
      startTypes = 'touchstart mousedown'
      moveTypesArray = moveTypes.split ' '
      allowClick = true
      interactionStart = null
      interactionCurrent = null
      prevInteraction = null

      contentWidth = scope.contentWidth

      has3d = browserHelper.has3d()

      $document.bind endTypes, (event) -> # drag end
        unless (allowClick)
          event.preventDefault()
          if (interactionStart == null || (Math.abs(interactionCurrent.x - interactionStart.x) < clickFudge && Math.abs(interactionCurrent.y - interactionStart.y) < clickFudge))
            allowClick = true # click now
            el = document.elementFromPoint(interactionCurrent.x, interactionCurrent.y);
            if el? and !interactionCurrent.button
              document.elementFromPoint(interactionCurrent.clientX, interactionCurrent.clientY).click();

              # this fails on scroll
#              ev = document.createEvent('MouseEvent')
#              ev.initMouseEvent 'click', true, true, window, event.detail, interactionCurrent.screenX, interactionCurrent.screenY, 0, 0, event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, event.button, null
#              el.dispatchEvent ev

              # This fails on chrome with touch emulation:
#              if ev instanceof MouseEvent
#                  ...
#              else  # TouchEvent
#                ev = document.createEvent('TouchEvent')
#                ev.initTouchEvent event.type, true, true, window, event.detail, interactionCurrent.x, interactionCurrent.y, 0, 0, event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, event.touches, event.targetTouches, event.changedTouches, event.scale, event.rotation
#                el.dispatchEvent ev

          else
            v = prevInteraction.x - interactionCurrent.x  # momentum-generated velocity
            setTimeout (-> allowClick = true), 100  # don't allow click todo: seems hacky, a better way to do this?

        interactionStart = null
        for type in moveTypesArray
          $document.unbind type


      contElm.bind startTypes, (event) ->  # drag start
        event.preventDefault()   # was commented out because it prevents clicking on mobile, but added click simulation above
        allowClick = false
        v = 0
        elementStartX = xOff
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

          xOff = elementStartX + (interactionCurrent.x - interactionStart.x)
          doTransform()


      contElm.bind 'click', (event) ->
        event.preventDefault() if (!allowClick)
        allowClick


      run = ->
        setInterval (->
          if v
            v *= f
            xOff -= v
            v = 0 if Math.abs(v) < 0.001
            doTransform()

          if (allowClick)
            if xOff > 0
              xOff -= xOff*spring
              doTransform()
            else
              if xOff < xMin
                xOff += (xMin-xOff)*spring
                doTransform()
        ), 20


      doTransform = ->
        x = xOff

        # out of bounds extra friction
        if xOff > 0
          x = xOff/2
        else if xOff < xMin
          x = xMin - (xMin-xOff)/2

        if has3d
          contElm.css
            "-webkit-transform": 'translate3d(' + x + 'px, 0px, 0px)'
            "-moz-transform": 'translate3d(' + x + 'px, 0px, 0px)'
            "-o-transform": 'translate3d(' + x + 'px, 0px, 0px)'
            "-ms-transform": 'translate3d(' + x + 'px, 0px, 0px)'
            transform: 'translate3d(' + x + 'px, 0px,0px)'
        else
          contElm.css('left', xOff);


      calcxMin = ->
        xMin = $window.innerWidth - contentWidth


      calcContentWidth = ->
        if scope.contentWidth
          # explicit contentWidth was set
          contentWidth = scope.contentWidth
        else
          # calculate contentWidth by checking widths of the children
          chs = element.children().eq(0).children()
          contentWidth = 0
          contentWidth += c.clientWidth for c in chs

        contElm.css 'width', contentWidth + 'px'

      calcContentWidth()
      scope.$watch('contentWidth', calcContentWidth) if attrs.hasOwnProperty('contentWidth')

      onWinResize = ->
        calcContentWidth()
        calcxMin()
        xOff = xMin  if xOff < xMin

      scope.wheel = (event, delta, deltaX, deltaY) ->
        if deltaX
          event.preventDefault()
          if deltaX > 0
            v = 1  if v < 1
            v = Math.min(maxv, (v + 2) * a)
          else
            v = -1  if v > -1
            v = Math.max(naxv, (v - 2) * a)

      # initialize
      calcxMin()
      run()
      winElm.on 'resize', onWinResize
  ] # /kineticSlider
)()