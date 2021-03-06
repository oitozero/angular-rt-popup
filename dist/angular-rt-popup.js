var mod = angular.module('rt.popup', []);
mod.factory('Popup', [
  '$window',
  '$document',
  '$timeout',
  '$compile',
  '$parse',
  '$sce',
  function ($window, $document, $timeout, $compile, $parse, $sce) {
    var openedPopup = null;
    var template = '<div class="popover"><div ng-include="popupView" onload="$reposition()"></div></div>';
    var templateHtml = '<div class="popover"><div ng-bind-html="content"></div></div>';
    // Padding towards edges of screen.
    var padding = 10;
    function loseFocus(e) {
      if (openedPopup && !$.contains(openedPopup.el[0], e.target)) {
        hidePopup();
      }
    }
    function hidePopup() {
      if (!openedPopup) {
        return;
      }
      var popup = openedPopup;
      openedPopup = null;
      $timeout(function () {
        $parse(popup.options.popupHidden)(popup.scope);
        popup.el.hide().remove();
        $document.off('click', loseFocus);
      });
    }
    function extend(obj, values) {
      for (var key in values) {
        if (!obj[key]) {
          obj[key] = values[key];
        }
      }
    }
    function showPopup(anchor, scope, attrs) {
      extend(attrs, {
        popupPlacement: 'right',
        popupClass: '',
        popupShown: '',
        popupHidden: '',
        popupOverlap: 5
      });
      scope.popupView = attrs.popupShow;
      scope.content = $sce.trustAsHtml(attrs.popupHtml);
      scope.hidePopover = hidePopup;
      $timeout(function () {
        makePopup(anchor, scope, attrs);
      });
    }
    function offset(el) {
      var rect = el[0].getBoundingClientRect();
      return {
        width: rect.width || el.prop('offsetWidth'),
        height: rect.height || el.prop('offsetHeight'),
        top: rect.top + ($window.pageYOffset || $document[0].documentElement.scrollTop),
        left: rect.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft)
      };
    }
    function fixPosition(scope, anchor, element, arrow, options) {
      var popupPosition = null;
      var arrowPosition = null;
      var anchorPoint = null;
      var anchorGeom = offset(anchor);
      var placement = options.popupPlacement;
      var extra_class = options.popupClass;
      var maxHeight = $window.innerHeight - 2 * padding;
      var overlap = options.popupOverlap;
      // Calculate popup position
      if (placement === 'right') {
        anchorPoint = {
          top: anchorGeom.top + anchorGeom.height / 2,
          left: anchorGeom.left + anchorGeom.width - overlap
        };
        popupPosition = {
          top: anchorPoint.top - element.height() / 2,
          left: anchorPoint.left
        };
        // Clamp for edge of screen
        popupPosition.top = Math.max(padding, popupPosition.top);
        arrowPosition = { top: anchorPoint.top - popupPosition.top };
      } else if (placement === 'left') {
        anchorPoint = {
          top: anchorGeom.top + anchorGeom.height / 2,
          left: anchorGeom.left + overlap - 2
        };
        popupPosition = {
          top: anchorPoint.top - element.height() / 2,
          left: anchorPoint.left - element.width()
        };
        // Clamp for edge of screen
        popupPosition.top = Math.max(padding, popupPosition.top);
        arrowPosition = { top: anchorPoint.top - popupPosition.top };
      } else if (placement === 'bottom') {
        anchorPoint = {
          top: anchorGeom.top + anchorGeom.height,
          left: anchorGeom.left + anchorGeom.width / 2
        };
        popupPosition = {
          top: anchorPoint.top - overlap,
          left: anchorPoint.left - element.width() / 2
        };
        // Clamp for edge of screen
        popupPosition.left = Math.max(padding, popupPosition.left);
        maxHeight -= popupPosition.top;
        arrowPosition = { left: anchorPoint.left - popupPosition.left };
      } else if (placement === 'top') {
        anchorPoint = {
          top: anchorGeom.top - element.outerHeight(),
          left: anchorGeom.left + anchorGeom.width / 2
        };
        popupPosition = {
          top: anchorPoint.top + overlap,
          left: anchorPoint.left - element.width() / 2
        };
        // Clamp for edge of screen
        popupPosition.left = Math.max(padding, popupPosition.left);
        maxHeight -= popupPosition.top;
        arrowPosition = { left: anchorPoint.left - popupPosition.left };
      } else {
        throw new Error('Unsupported placement ' + placement);
      }
      element.removeClass('left right bottom top');
      element.addClass(placement);
      if (extra_class) {
        element.addClass(extra_class);
      }
      element.css({
        top: popupPosition.top + 'px',
        left: popupPosition.left + 'px',
        display: 'block',
        maxHeight: maxHeight
      });
      var header = element.find('.popover-title');
      var content = element.find('.popover-content');
      var footer = element.find('.popover-footer');
      content.css({
        maxHeight: maxHeight - footer.outerHeight() - header.outerHeight() - 4,
        overflow: 'auto'
      });
      if (arrowPosition) {
        arrow.css(arrowPosition);
      }
      element.removeClass('hide');
      $document.on('click', loseFocus);
      $parse(options.popupShown)(scope);
    }
    function makePopup(anchor, scope, options) {
      var element = null;
      if (scope.popupView) {
        element = $compile(template)(scope);
      } else {
        element = $compile(templateHtml)(scope);
      }
      openedPopup = {
        el: element,
        options: options,
        scope: scope
      };
      var body = $document.find('body');
      body.append(element);
      // Add arrow
      var arrow = $('<div />', { 'class': 'arrow' });
      element.children('.arrow').remove();
      element.append(arrow);
      if (scope.popupView) {
        scope.$reposition = function () {
          $timeout(function () {
            fixPosition(scope, anchor, element, arrow, options);
          });
        };
      } else {
        $timeout(function () {
          fixPosition(scope, anchor, element, arrow, options);
        });
      }
    }
    return {
      show: showPopup,
      close: hidePopup
    };
  }
]);
mod.directive('popupShow', [
  'Popup',
  '$parse',
  '$timeout',
  function (Popup, $parse, $timeout) {
    return {
      restrict: 'A',
      scope: true,
      link: function (scope, element, attrs) {
        element.click(function () {
          $timeout(function () {
            Popup.close();
            var shouldShow = $parse(attrs.popupIf || 'true');
            if (shouldShow(scope)) {
              Popup.show(element, scope, attrs);
            }
          });
        });
      }
    };
  }
]);
mod.directive('popupAutoShow', [
  'Popup',
  '$parse',
  function (Popup, $parse) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        scope.$watch(attrs.popupAutoShow, function (val) {
          if (val) {
            Popup.close();
            var shouldShow = $parse(attrs.popupIf || 'true');
            if (shouldShow(scope)) {
              Popup.show(element, scope, attrs);
            }
          }
        });
      }
    };
  }
]);
mod.directive('popupHtml', [
  'Popup',
  '$parse',
  '$timeout',
  function (Popup, $parse, $timeout) {
    return {
      restrict: 'A',
      scope: true,
      link: function (scope, element, attrs) {
        element.click(function () {
          $timeout(function () {
            Popup.close();
            var shouldShow = $parse(attrs.popupIf || 'true');
            if (shouldShow(scope)) {
              Popup.show(element, scope, attrs);
            }
          });
        });
      }
    };
  }
]);