(function() {
  (function() {
    angular.module('gilbox.kineticSlider.helpers', []).factory('browserHelper', [
      '$window', function($window) {
        var _has3d;
        _has3d = void 0;
        return {
          has3d: function() {
            if (_has3d !== undefined) {
              return _has3d;
            }
            return _has3d = (function() {
              var el, has3d, t, transforms;
              el = document.createElement("p");
              has3d = void 0;
              transforms = {
                webkitTransform: "-webkit-transform",
                OTransform: "-o-transform",
                msTransform: "-ms-transform",
                MozTransform: "-moz-transform",
                transform: "transform"
              };
              document.body.insertBefore(el, null);
              for (t in transforms) {
                if (el.style[t] !== undefined) {
                  el.style[t] = "translate3d(1px,1px,1px)";
                  has3d = $window.getComputedStyle(el).getPropertyValue(transforms[t]);
                }
              }
              document.body.removeChild(el);
              return has3d !== undefined && has3d.length > 0 && has3d !== "none";
            })();
          },
          getTouchPoint: function(event) {
            var e;
            if (event.touches != null) {
              e = event.touches[0];
            } else if ((event.originalEvent != null) && (event.originalEvent.touches != null) && event.originalEvent.touches.length) {
              e = event.originalEvent.touches[0];
            } else {
              e = event;
            }
            return angular.extend({
              x: e.pageX,
              y: e.pageY
            }, e);
          }
        };
      }
    ]);
    return angular.module('gilbox.kineticSlider', ['monospaced.mousewheel', 'gilbox.kineticSlider.helpers']).directive('kineticSlider', [
      '$window', '$document', 'browserHelper', function($window, $document, browserHelper) {
        return {
          restrict: 'A',
          scope: {
            contentWidth: '=?'
          },
          replace: true,
          transclude: true,
          template: '<div ng-transclude msd-wheel="wheel($event, $delta, $deltaX, $deltaY)"></div>',
          link: function(scope, element, attrs) {
            var a, allowClick, calcContentWidth, calcxMin, clickFudge, contElm, contentWidth, doTransform, endTypes, f, has3d, interactionCurrent, interactionStart, maxv, moveTypes, moveTypesArray, naxv, onWinResize, prevInteraction, run, spring, startTypes, v, winElm, xMin, xOff;
            a = attrs.acceleration || 1.05;
            f = attrs.friction || 0.95;
            spring = attrs.springBack || 0.1;
            clickFudge = attrs.clickFudge || 2;
            maxv = attrs.maxVelocity || 50;
            v = 0;
            xOff = 0;
            xMin = 0;
            naxv = -maxv;
            winElm = angular.element($window);
            contElm = angular.element(element.children()[0]);
            endTypes = 'touchend touchcancel mouseup mouseleave';
            moveTypes = 'touchmove mousemove';
            startTypes = 'touchstart mousedown';
            moveTypesArray = moveTypes.split(' ');
            allowClick = true;
            interactionStart = null;
            interactionCurrent = null;
            prevInteraction = null;
            contentWidth = scope.contentWidth;
            has3d = browserHelper.has3d();
            $document.bind(endTypes, function(event) {
              var el, type, _i, _len, _results;
              if (!allowClick) {
                event.preventDefault();
                if (interactionStart === null || (Math.abs(interactionCurrent.x - interactionStart.x) < clickFudge && Math.abs(interactionCurrent.y - interactionStart.y) < clickFudge)) {
                  allowClick = true;
                  el = document.elementFromPoint(interactionCurrent.x, interactionCurrent.y);
                  if ((el != null) && !interactionCurrent.button) {
                    document.elementFromPoint(interactionCurrent.clientX, interactionCurrent.clientY).click();
                  }
                } else {
                  v = prevInteraction.x - interactionCurrent.x;
                  setTimeout((function() {
                    return allowClick = true;
                  }), 100);
                }
              }
              interactionStart = null;
              _results = [];
              for (_i = 0, _len = moveTypesArray.length; _i < _len; _i++) {
                type = moveTypesArray[_i];
                _results.push($document.unbind(type));
              }
              return _results;
            });
            contElm.bind(startTypes, function(event) {
              var elementStartX;
              event.preventDefault();
              allowClick = false;
              v = 0;
              elementStartX = xOff;
              interactionStart = interactionCurrent = browserHelper.getTouchPoint(event);
              return $document.bind(moveTypes, function(event) {
                var dx, dy;
                event.preventDefault();
                if (interactionCurrent) {
                  prevInteraction = interactionCurrent;
                }
                interactionCurrent = browserHelper.getTouchPoint(event);
                if (prevInteraction) {
                  dy = prevInteraction.y - interactionCurrent.y;
                  dx = prevInteraction.x - interactionCurrent.x;
                  if (Math.abs(dy) > Math.abs(dx)) {
                    $window.scrollBy(0, dy);
                    prevInteraction.y += dy;
                    interactionCurrent.y += dy;
                  }
                }
                xOff = elementStartX + (interactionCurrent.x - interactionStart.x);
                return doTransform();
              });
            });
            contElm.bind('click', function(event) {
              if (!allowClick) {
                event.preventDefault();
              }
              return allowClick;
            });
            run = function() {
              return setInterval((function() {
                if (v) {
                  v *= f;
                  xOff -= v;
                  if (Math.abs(v) < 0.001) {
                    v = 0;
                  }
                  doTransform();
                }
                if (allowClick) {
                  if (xOff > 0) {
                    xOff -= xOff * spring;
                    return doTransform();
                  } else {
                    if (xOff < xMin) {
                      xOff += (xMin - xOff) * spring;
                      return doTransform();
                    }
                  }
                }
              }), 20);
            };
            doTransform = function() {
              var x;
              x = xOff;
              if (xOff > 0) {
                x = xOff / 2;
              } else if (xOff < xMin) {
                x = xMin - (xMin - xOff) / 2;
              }
              if (has3d) {
                return contElm.css({
                  "-webkit-transform": 'translate3d(' + x + 'px, 0px, 0px)',
                  "-moz-transform": 'translate3d(' + x + 'px, 0px, 0px)',
                  "-o-transform": 'translate3d(' + x + 'px, 0px, 0px)',
                  "-ms-transform": 'translate3d(' + x + 'px, 0px, 0px)',
                  transform: 'translate3d(' + x + 'px, 0px,0px)'
                });
              } else {
                return contElm.css('left', xOff);
              }
            };
            calcxMin = function() {
              return xMin = $window.innerWidth - contentWidth;
            };
            calcContentWidth = function() {
              var c, chs, _i, _len;
              if (scope.contentWidth) {
                contentWidth = scope.contentWidth;
              } else {
                chs = element.children().eq(0).children();
                contentWidth = 0;
                for (_i = 0, _len = chs.length; _i < _len; _i++) {
                  c = chs[_i];
                  contentWidth += c.clientWidth;
                }
              }
              return contElm.css('width', contentWidth + 'px');
            };
            calcContentWidth();
            if (attrs.hasOwnProperty('contentWidth')) {
              scope.$watch('contentWidth', calcContentWidth);
            }
            onWinResize = function() {
              calcContentWidth();
              calcxMin();
              if (xOff < xMin) {
                return xOff = xMin;
              }
            };
            scope.wheel = function(event, delta, deltaX, deltaY) {
              if (deltaX) {
                event.preventDefault();
                if (deltaX > 0) {
                  if (v < 1) {
                    v = 1;
                  }
                  return v = Math.min(maxv, (v + 2) * a);
                } else {
                  if (v > -1) {
                    v = -1;
                  }
                  return v = Math.max(naxv, (v - 2) * a);
                }
              }
            };
            calcxMin();
            run();
            return winElm.on('resize', onWinResize);
          }
        };
      }
    ]);
  })();

}).call(this);
