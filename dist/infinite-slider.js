(function() {
  var deps, e,
    __modulo = function(a, b) { return (a % b + +b) % b; };

  angular.module('gilbox.infiniteSlider.helpers', []).factory('browserHelper', [
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
          e = (function() {
            switch (false) {
              case event.touches == null:
                return event.touches[0];
              case !((event.originalEvent != null) && (event.originalEvent.touches != null) && event.originalEvent.touches.length):
                return event.originalEvent.touches[0];
              default:
                return event;
            }
          })();
          return angular.extend({
            x: e.pageX,
            y: e.pageY
          }, e);
        }
      };
    }
  ]);

  deps = ['gilbox.infiniteSlider.helpers'];

  try {
    angular.module('monospaced.mousewheel');
    deps.unshift('monospaced.mousewheel');
  } catch (_error) {
    e = _error;
  }

  angular.module('gilbox.infiniteSlider', deps).directive('infiniteSliderBoundary', function() {
    return {
      restrict: 'AE',
      scope: {},
      transclude: true,
      replace: true,
      template: '<div ng-transclude msd-wheel="wheel($event, $delta, $deltaX, $deltaY)"></div>',
      require: '?^infiniteSlider',
      controller: [
        '$scope', '$element', function($scope, $element) {
          this.elm = $element;
          this.setWheelFn = function(fn) {
            return $scope.wheel = fn;
          };
          return this;
        }
      ],
      link: function(scope, element, attrs, ctrl) {
        if (ctrl) {
          ctrl.setBoundaryElm(element);
          return scope.wheel = ctrl.wheelFn;
        }
      }
    };
  }).directive('infiniteSliderContent', function() {
    return {
      restrict: 'AE',
      require: '^infiniteSlider',
      link: function(scope, element, attrs, ctrl) {
        return ctrl.setContElm(element);
      }
    };
  }).directive('infiniteSlider', [
    '$window', '$document', '$timeout', 'browserHelper', function($window, $document, $timeout, browserHelper) {
      return {
        restrict: 'AE',
        scope: {
          snappedItemId: '=?',
          closestItemId: '=?',
          isJumping: '=?'
        },
        require: '?^infiniteSliderBoundary',
        controller: [
          '$scope', function($scope) {
            this.setBoundaryElm = function(elm) {
              return $scope.boundaryElm = elm;
            };
            this.setContElm = function(elm) {
              return $scope.contElm = elm;
            };
            this.wheelFn = function(event, delta, deltaX, deltaY) {
              return $scope.wheelFn(event, delta, deltaX, deltaY);
            };
            return this;
          }
        ],
        link: function(scope, element, attrs, boundaryCtrl) {
          var a, allowClick, animationFrame, boundaryElm, calcContentWidth, classifyClosest, classifySnapped, clickFudge, clickHandler, closestItemId_isBound, contElm, doTransform, elementStartX, elmScope, endHandler, endTypes, f, firstItem, has3d, interactionCurrent, interactionStart, isJumping_isBound, itemWidth, items, jumping, lastItem, lastWheelTime, moveHandler, moveTypes, onFrame, onSnappedItemIdChange, onWinResize, positionItem, prevInteraction, readItems, rearrange, run, running, setAllowClick, setClosestItem, setSnappedItem, setTimeoutWithId, snap, snapTargetX, snapVelocityTrigger, snappedItemId, snappedItemId_isBound, spring, startHandler, startTypes, toIds, v, winElm, xCont, xMax, xMin;
          animationFrame = new AnimationFrame();
          a = attrs.acceleration || 1.05;
          f = attrs.friction || 0.95;
          spring = attrs.springBack || 0.3;
          clickFudge = attrs.clickFudge || 2;
          snap = attrs.hasOwnProperty('snap') && attrs.snap !== 'false';
          snapVelocityTrigger = attrs.snapVelocityTrigger || 5;
          classifyClosest = attrs.hasOwnProperty('classifyClosest') && attrs.classifyClosest !== 'false';
          classifySnapped = attrs.hasOwnProperty('classifySnapped') && attrs.classifySnapped !== 'false';
          elmScope = element.scope();
          v = 0;
          xCont = 0;
          winElm = angular.element($window);
          boundaryElm = scope.boundaryElm || (boundaryCtrl && boundaryCtrl.elm) || element;
          contElm = scope.contElm || element.children().eq(0);
          items = null;
          endTypes = 'touchend touchcancel mouseup mouseleave';
          moveTypes = 'touchmove mousemove';
          startTypes = 'touchstart mousedown';
          allowClick = true;
          elementStartX = 0;
          interactionStart = null;
          interactionCurrent = null;
          prevInteraction = null;
          xMin = 0;
          xMax = 0;
          firstItem = null;
          lastItem = null;
          itemWidth = 0;
          jumping = false;
          snappedItemId = scope.snappedItemId;
          snappedItemId_isBound = scope.hasOwnProperty('snappedItemId');
          closestItemId_isBound = scope.hasOwnProperty('closestItemId');
          isJumping_isBound = scope.hasOwnProperty('isJumping');
          if (isJumping_isBound) {
            scope.isJumping = false;
          }
          lastWheelTime = new Date();
          running = false;
          has3d = browserHelper.has3d();
          snapTargetX = 0;
          toIds = {};
          setTimeoutWithId = function(fn, ms, id) {
            clearTimeout(toIds[id]);
            return toIds[id] = setTimeout(fn, ms);
          };
          setAllowClick = function(v) {
            allowClick = v;
            return element.toggleClass('allow-click', !v);
          };
          setAllowClick(true);
          endHandler = function(event) {
            var el;
            if (!allowClick) {
              event.preventDefault();
              if (interactionStart === null || (Math.abs(interactionCurrent.x - interactionStart.x) < clickFudge && Math.abs(interactionCurrent.y - interactionStart.y) < clickFudge)) {
                setAllowClick(true);
                el = document.elementFromPoint(interactionCurrent.x, interactionCurrent.y);
                if ((el != null) && !interactionCurrent.button) {
                  document.elementFromPoint(interactionCurrent.clientX, interactionCurrent.clientY).click();
                }
              } else {
                v = prevInteraction.x - interactionCurrent.x;
                setTimeout((function() {
                  return setAllowClick(true);
                }), 100);
              }
            }
            interactionStart = null;
            return $document.off(moveTypes, moveHandler);
          };
          moveHandler = function(event) {
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
            xCont = elementStartX + (interactionCurrent.x - interactionStart.x);
            return doTransform();
          };
          startHandler = function(event) {
            event.preventDefault();
            setAllowClick(false);
            v = 0;
            elementStartX = xCont;
            interactionStart = interactionCurrent = browserHelper.getTouchPoint(event);
            return $document.on(moveTypes, moveHandler);
          };
          clickHandler = function(event) {
            if (!allowClick) {
              event.preventDefault();
            }
            return allowClick;
          };
          attrs.$observe('disableDrag', function(next) {
            if (next !== 'true') {
              $document.on(endTypes, endHandler);
              boundaryElm.on(startTypes, startHandler);
              return boundaryElm.on('click', clickHandler);
            } else {
              $document.off(endTypes, endHandler);
              boundaryElm.off(startTypes, startHandler);
              return boundaryElm.off('click', clickHandler);
            }
          });
          setSnappedItem = function(newSnappedItem) {
            if (scope.snappedItemElm && classifySnapped) {
              scope.snappedItemElm.removeClass('snapped');
            }
            if (classifySnapped) {
              newSnappedItem.addClass('snapped');
            }
            scope.snappedItemElm = newSnappedItem;
            snappedItemId = newSnappedItem.idx;
            if (snappedItemId_isBound) {
              return scope.snappedItemId = snappedItemId;
            }
          };
          setClosestItem = function(newClosestItem) {
            if (scope.closestItem) {
              scope.closestItem.removeClass('closest');
            }
            newClosestItem.addClass('closest');
            if (closestItemId_isBound && scope.closestItem) {
              scope.closestItemId = newClosestItem.idx;
              scope.$apply();
            }
            return scope.closestItem = newClosestItem;
          };
          onFrame = function() {
            var newSnappedItem, newSnappedItemId, xchanged;
            if (!jumping && items && itemWidth) {
              xchanged = false;
              if (classifyClosest || snap) {
                snapTargetX = itemWidth * Math.round(xCont / itemWidth);
                newSnappedItemId = __modulo(firstItem.idx + Math.abs(firstItem.x + snapTargetX) / itemWidth, items.length);
                newSnappedItem = items[newSnappedItemId].elm;
                if (classifyClosest && scope.closestItem !== newSnappedItem) {
                  setClosestItem(newSnappedItem);
                }
                if (allowClick && Math.abs(v) < snapVelocityTrigger) {
                  if (xCont !== snapTargetX) {
                    xCont += (snapTargetX - xCont) * spring;
                    if (Math.abs(snapTargetX - xCont) < 1) {
                      xCont = snapTargetX;
                    }
                    xchanged = true;
                    v = 0;
                  } else {
                    if (newSnappedItemId !== snappedItemId) {
                      setSnappedItem(newSnappedItem);
                      if (snappedItemId_isBound) {
                        scope.$apply();
                      }
                    }
                  }
                }
              }
              if (v) {
                v *= f;
                xCont -= v;
                if (Math.abs(v) < 0.001) {
                  v = 0;
                }
                xchanged = true;
              }
              if (xchanged) {
                doTransform();
                rearrange();
              }
            }
            if (running) {
              return animationFrame.request(onFrame);
            }
          };
          run = function() {
            running = true;
            return animationFrame.request(onFrame);
          };
          rearrange = function() {
            var rearr;
            if (items) {
              rearr = function(prevItem) {
                var prev, _ref, _ref1;
                if (firstItem.x + xCont < xMin - firstItem.clientWidth * 0.51) {
                  prev = firstItem;
                  firstItem.x = lastItem.x + firstItem.clientWidth;
                  positionItem(firstItem);
                  _ref = [firstItem.nextItem, firstItem], firstItem = _ref[0], lastItem = _ref[1];
                  if (prevItem !== firstItem) {
                    return rearrange(prev);
                  }
                } else if (lastItem.x + xCont > xMax) {
                  prev = lastItem;
                  lastItem.x = firstItem.x - lastItem.clientWidth;
                  positionItem(lastItem);
                  _ref1 = [lastItem, lastItem.prevItem], firstItem = _ref1[0], lastItem = _ref1[1];
                  return rearrange(prev);
                }
              };
              return rearr();
            }
          };
          positionItem = function(item) {
            return item.style.left = item.x + 'px';
          };
          doTransform = function(transition) {
            if (has3d) {
              if (transition) {
                contElm.css({
                  '-webkit-transition': '-webkit-transform .5s',
                  'transition': 'transform .5s'
                });
                jumping = true;
                if (isJumping_isBound) {
                  scope.isJumping = true;
                }
                setTimeoutWithId(function() {
                  contElm.css({
                    '-webkit-transition': 'none',
                    'transition': 'none'
                  });
                  jumping = false;
                  if (isJumping_isBound) {
                    return scope.isJumping = false;
                  }
                }, 500, 1);
              }
              return contElm.css({
                '-webkit-transform': 'translate3d(' + xCont + 'px, 0px, 0px)',
                '-moz-transform': 'translate3d(' + xCont + 'px, 0px, 0px)',
                '-o-transform': 'translate3d(' + xCont + 'px, 0px, 0px)',
                '-ms-transform': 'translate3d(' + xCont + 'px, 0px, 0px)',
                'transform': 'translate3d(' + xCont + 'px, 0px,0px)'
              });
            } else {
              return contElm.css('left', xCont + 'px');
            }
          };
          calcContentWidth = function() {
            var boundsOffsetX, contentWidth, i, item, lastidx, _i, _len;
            if (!items) {
              return;
            }
            contentWidth = 0;
            lastidx = items.length - 1;
            firstItem = items[0];
            lastItem = items[lastidx];
            itemWidth = firstItem.clientWidth;
            if (!itemWidth) {
              setTimeoutWithId(calcContentWidth, 200, 2);
              return false;
            }
            for (i = _i = 0, _len = items.length; _i < _len; i = ++_i) {
              item = items[i];
              if (item === lastItem) {
                item.nextItem = firstItem;
              } else {
                item.nextItem = items[i + 1];
              }
              if (item === firstItem) {
                item.prevItem = lastItem;
              } else {
                item.prevItem = items[i - 1];
              }
              item.x = contentWidth;
              item.elm = items.eq(i);
              item.idx = item.elm.idx = i;
              positionItem(item);
              contentWidth += item.clientWidth;
            }
            boundsOffsetX = element[0].clientWidth / 2 - itemWidth / 2;
            if (attrs.infiniteSliderAlign === 'left') {
              xMax = contentWidth - boundsOffsetX;
              xMin = boundsOffsetX;
            } else {
              xMax = contentWidth / 2 + boundsOffsetX;
              xMin = boundsOffsetX - contentWidth / 2;
            }
            return true;
          };
          onWinResize = function() {
            if (calcContentWidth()) {
              if (items) {
                if (snap && !scope.snappedItemElm) {
                  setSnappedItem(items[snappedItemId || 0].elm);
                }
                if (classifyClosest && !scope.closestItem) {
                  setClosestItem(items[snappedItemId || 0].elm);
                }
              }
              if (snappedItemId != null) {
                xCont = -itemWidth * snappedItemId;
                rearrange();
                return doTransform();
              } else {
                return rearrange();
              }
            }
          };
          scope.wheelFn = function(event, delta, deltaX, deltaY) {
            var newTime;
            newTime = (new Date()).getTime();
            if (deltaX && !jumping && Math.abs(deltaX) > Math.abs(deltaY) && (newTime - lastWheelTime > 50)) {
              event.preventDefault();
              if (deltaX > 0) {
                scope.closestItemId = scope.snappedItemId = __modulo(scope.snappedItemId + 1, items.length);
              } else {
                scope.closestItemId = scope.snappedItemId = __modulo(scope.snappedItemId - 1, items.length);
              }
            }
            lastWheelTime = newTime;
            return true;
          };
          if (boundaryCtrl && snap) {
            boundaryCtrl.setWheelFn(scope.wheelFn);
          }
          readItems = function() {
            items = contElm.children();
            if ((items == null) || !items.length) {
              return items = null;
            }
          };
          if (attrs.slides) {
            elmScope.$watch(attrs.slides, function() {
              readItems();
              return onWinResize();
            }, true);
          } else {
            $timeout(function() {
              readItems();
              return onWinResize();
            });
          }
          onSnappedItemIdChange = function(newId) {
            var deltaId, targetId, vId;
            if (items && (0 <= newId && newId < items.length) && scope.snappedItemId !== scope.snappedItemElm.idx) {
              vId = newId < snappedItemId ? items.length + newId : newId - items.length;
              targetId = Math.abs(vId - snappedItemId) < Math.abs(newId - snappedItemId) ? vId : newId;
              deltaId = targetId - snappedItemId;
              setSnappedItem(items[newId].elm);
              xCont = snapTargetX - itemWidth * deltaId;
              calcContentWidth();
              rearrange();
              return doTransform(true);
            }
          };
          scope.$watch('snappedItemId', function(newId) {
            return onSnappedItemIdChange(parseInt(newId));
          });
          run();
          winElm.on('resize', onWinResize);
          return scope.$on('$destroy', function() {
            winElm.off('resize', onWinResize);
            $document.off(endTypes, endHandler);
            boundaryElm.off(startTypes, startHandler);
            $document.off(moveTypes, moveHandler);
            boundaryElm.off('click', clickHandler);
            return running = false;
          });
        }
      };
    }
  ]);

}).call(this);

/*
//# sourceMappingURL=infinite-slider.js.map
*/
