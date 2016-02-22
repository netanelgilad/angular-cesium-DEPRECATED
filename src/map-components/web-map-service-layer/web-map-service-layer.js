/**
 * Created by netanel on 09/01/15.
 */

angular.module('angularCesium').directive('acWebMapServiceLayer', function() {
  'use strict';
  return {
    restrict : 'E',
    require : '^acMap',
    scope : {
      url : '&',
      layers : '&',
      alpha: '&',
    },
    controller : function($scope) {
    },
    link : function(scope, element, attrs, acMapCtrl) {
      var provider = new Cesium.WebMapServiceImageryProvider({
        url: scope.url(),
        layers : scope.layers()
      });

      var layer = acMapCtrl.getCesiumWidget().scene.imageryLayers.addImageryProvider(provider);

      if (scope.alpha()) {
        layer.alpha = scope.alpha();
      }

      scope.$on('$destroy', function() {
        acMapCtrl.getCesiumWidget().scene.imageryLayers.remove(layer);
      });
    }
  };
});
