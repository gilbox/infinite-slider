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
    return angular.module('gilbox.infiniteSlider', ['monospaced.mousewheel', 'gilbox.infiniteSlider.helpers']).directive('infiniteSlider', [
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
            var a, allowClick, calcContentWidth, clickFudge, contElm, contentWidth, doTransform, endTypes, f, firstItem, has3d, interactionCurrent, interactionStart, items, lastItem, maxv, moveTypes, moveTypesArray, naxv, onWinResize, positionItem, prevInteraction, rearrange, run, snap, spring, startTypes, v, winElm, xCont, xMax, xMin;
            a = attrs.acceleration || 1.05;
            f = attrs.friction || 0.95;
            spring = attrs.springBack || 0.1;
            clickFudge = attrs.clickFudge || 2;
            maxv = attrs.maxVelocity || 50;
            snap = attrs.snap || false;
            v = 0;
            xCont = 0;
            naxv = -maxv;
            winElm = angular.element($window);
            contElm = angular.element(element.children()[0]);
            items = angular.element(contElm.children());
            console.log("-->items", items);
            window.itms = items;
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
            element.bind(startTypes, function(event) {
              var elementStartX;
              event.preventDefault();
              allowClick = false;
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
            element.bind('click', function(event) {
              if (!allowClick) {
                event.preventDefault();
              }
              return allowClick;
            });
            run = function() {
              return setInterval((function() {
                if (v) {
                  v *= f;
                  xCont -= v;
                  if (Math.abs(v) < 0.001) {
                    v = 0;
                  }
                  doTransform();
                  return rearrange();
                }
              }), 20);
            };
            rearrange = function() {
              var _ref, _ref1;
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
            doTransform = function() {
              if (has3d) {
                return contElm.css({
                  "-webkit-transform": 'translate3d(' + xCont + 'px, 0px, 0px)',
                  "-moz-transform": 'translate3d(' + xCont + 'px, 0px, 0px)',
                  "-o-transform": 'translate3d(' + xCont + 'px, 0px, 0px)',
                  "-ms-transform": 'translate3d(' + xCont + 'px, 0px, 0px)',
                  transform: 'translate3d(' + xCont + 'px, 0px,0px)'
                });
              } else {
                return contElm.css('left', xCont);
              }
            };
            calcContentWidth = function() {
              var i, item, lastidx, _i, _len;
              contentWidth = 0;
              lastidx = items.length - 1;
              firstItem = items[0];
              lastItem = items[lastidx];
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
                positionItem(item);
                contentWidth += item.clientWidth;
              }
              xMax = contentWidth / 2;
              xMin = -xMax;
              console.log("-->contentWidth", contentWidth);
              console.log("-->xMin, xMax", xMin, xMax);
              return contElm.css('width', contentWidth + 'px');
            };
            onWinResize = function() {
              calcContentWidth();
              return rearrange();
            };
            onWinResize();
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
            run();
            return winElm.on('resize', onWinResize);
          }
        };
      }
    ]);
  })();

}).call(this);
