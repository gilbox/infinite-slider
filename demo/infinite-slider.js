(function() {
  (function() {
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
            return angular.extend(e, {
              x: e.pageX,
              y: e.pageY
            });
          }
        };
      }
    ]);
    return angular.module('gilbox.infiniteSlider', ['monospaced.mousewheel', 'gilbox.infiniteSlider.helpers']).directive('infiniteSliderBoundary', function() {
      return {
        restrict: 'AE',
        transclude: true,
        replace: true,
        template: '<div ng-transclude msd-wheel="wheel($event, $delta, $deltaX, $deltaY)"></div>',
        controller: [
          '$scope', '$element', function($scope, $element) {
            this.elm = $element;
            this.setWheelFn = function(fn) {
              return $scope.wheel = fn;
            };
            return this;
          }
        ]
      };
    }).directive('infiniteSlider', [
      '$window', '$document', 'browserHelper', function($window, $document, browserHelper) {
        return {
          restrict: 'A',
          scope: {
            slides: '=?',
            snappedItemId: '=?'
          },
          require: '^infiniteSliderBoundary',
          link: function(scope, element, attrs, boundaryCtrl) {
            var a, allowClick, boundaryElm, calcContentWidth, classifyClosest, classifySnapped, clickFudge, contElm, doTransform, endTypes, f, firstItem, has3d, interactionCurrent, interactionStart, itemWidth, items, jumping, lastItem, maxv, moveTypes, moveTypesArray, naxv, onWinResize, positionItem, prevInteraction, readItems, rearrange, run, setAllowClick, setClosestItem, setSnappedItem, snap, snapVelocityTrigger, snappedItemId, snappedItemId_isBound, spring, startTypes, timeoutId, v, winElm, xCont, xMax, xMin;
            a = attrs.acceleration || 1.05;
            f = attrs.friction || 0.95;
            spring = attrs.springBack || 0.3;
            clickFudge = attrs.clickFudge || 2;
            maxv = attrs.maxVelocity || 50;
            snap = attrs.hasOwnProperty('snap') && attrs.snap !== 'false';
            snapVelocityTrigger = attrs.snapVelocityTrigger || 3;
            classifyClosest = attrs.hasOwnProperty('classifyClosest') && attrs.classifyClosest !== 'false';
            classifySnapped = attrs.hasOwnProperty('classifySnapped') && attrs.classifySnapped !== 'false';
            v = 0;
            xCont = 0;
            naxv = -maxv;
            winElm = angular.element($window);
            boundaryElm = (boundaryCtrl && boundaryCtrl.elm) || element;
            contElm = element.children().eq(0);
            items = null;
            endTypes = 'touchend touchcancel mouseup mouseleave';
            moveTypes = 'touchmove mousemove';
            startTypes = 'touchstart mousedown';
            moveTypesArray = moveTypes.split(' ');
            allowClick = true;
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
            has3d = browserHelper.has3d();
            scope.$watch('snappedItemId', function(newId) {
              newId = parseInt(newId);
              if ((0 <= newId && newId < items.length) && scope.snappedItemId !== scope.snappedItemElm.idx) {
                setSnappedItem(items[newId].elm);
                xCont = -itemWidth * newId;
                calcContentWidth();
                rearrange();
                return doTransform(true);
              }
            });
            setAllowClick = function(v) {
              allowClick = v;
              return element.toggleClass('allow-click', !v);
            };
            setAllowClick(true);
            $document.bind(endTypes, function(event) {
              var el, type, _i, _len, _results;
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
              _results = [];
              for (_i = 0, _len = moveTypesArray.length; _i < _len; _i++) {
                type = moveTypesArray[_i];
                _results.push($document.unbind(type));
              }
              return _results;
            });
            boundaryElm.bind(startTypes, function(event) {
              var elementStartX;
              event.preventDefault();
              setAllowClick(false);
              v = 0;
              elementStartX = xCont;
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
                xCont = elementStartX + (interactionCurrent.x - interactionStart.x);
                return doTransform();
              });
            });
            boundaryElm.bind('click', function(event) {
              if (!allowClick) {
                event.preventDefault();
              }
              return allowClick;
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
              return scope.closestItem = newClosestItem;
            };
            run = function() {
              return setInterval((function() {
                var newSnappedItem, newSnappedItemId, snapTargetX, xchanged;
                if (!jumping && items && itemWidth) {
                  xchanged = false;
                  if (classifyClosest || snap) {
                    snapTargetX = itemWidth * Math.round(xCont / itemWidth);
                    newSnappedItemId = (firstItem.idx + Math.abs(firstItem.x + snapTargetX) / itemWidth) % items.length;
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
                    return rearrange();
                  }
                }
              }), 20);
            };
            rearrange = function() {
              var _ref, _ref1;
              if (!items) {
                return;
              }
              if (lastItem.x + xCont > xMax + lastItem.clientWidth * 0.51) {
                lastItem.x = firstItem.x - lastItem.clientWidth;
                positionItem(lastItem);
                _ref = [lastItem, lastItem.prevItem], firstItem = _ref[0], lastItem = _ref[1];
                return rearrange();
              } else if (firstItem.x + xCont < xMin - firstItem.clientWidth * 0.51) {
                firstItem.x = lastItem.x + firstItem.clientWidth;
                positionItem(firstItem);
                _ref1 = [firstItem.nextItem, firstItem], firstItem = _ref1[0], lastItem = _ref1[1];
                return rearrange();
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
                  setTimeout(function() {
                    contElm.css({
                      '-webkit-transition': 'none',
                      'transition': 'none'
                    });
                    return jumping = false;
                  }, 500);
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
            timeoutId = null;
            calcContentWidth = function() {
              var boundsOffsetX, contentWidth, i, item, lastidx, _i, _len;
              if (!items) {
                return;
              }
              clearTimeout(timeoutId);
              contentWidth = 0;
              lastidx = items.length - 1;
              firstItem = items[0];
              lastItem = items[lastidx];
              itemWidth = firstItem.clientWidth;
              if (!itemWidth) {
                timeoutId = setTimeout(calcContentWidth, 50);
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
              xMax = contentWidth / 2 + boundsOffsetX;
              xMin = boundsOffsetX - contentWidth / 2;
              return true;
            };
            onWinResize = function() {
              if (calcContentWidth()) {
                if (items) {
                  if (snap && !scope.snappedItemElm) {
                    setSnappedItem(items[0].elm);
                  }
                  if (classifyClosest && !scope.closestItem) {
                    setClosestItem(items[0].elm);
                  }
                }
                return rearrange();
              }
            };
            boundaryCtrl.setWheelFn(function(event, delta, deltaX, deltaY) {
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
            });
            readItems = function() {
              items = contElm.children();
              if ((items == null) || !items.length) {
                return items = null;
              }
            };
            if (scope.slides) {
              scope.$watch('slides', function() {
                readItems();
                return onWinResize();
              });
            }
            readItems();
            onWinResize();
            run();
            return winElm.on('resize', onWinResize);
          }
        };
      }
    ]);
  })();

}).call(this);

/*
//# sourceMappingURL=infinite-slider.js.map
*/
