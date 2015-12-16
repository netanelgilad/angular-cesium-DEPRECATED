/**
 * Created by netanel on 09/01/15.
 */
'use strict';

angular.module('angularCesium').directive('acWebMapServiceLayer', function() {
  return {
    restrict : 'E',
    require : '^acMap',
    scope : {
      url : '&',
      layers : '&'
    },
    controller : function($scope) {
    },
    link : function(scope, element, attrs, acMapCtrl) {
      var provider = new Cesium.WebMapServiceImageryProvider({
        url: scope.url(),
        layers : scope.layers()
      });

      var layer = acMapCtrl.getCesiumWidget().scene.imageryLayers.addImageryProvider(provider);

      scope.$on('$destroy', function() {
        acMapCtrl.getCesiumWidget().scene.imageryLayers.remove(layer);
      });
    }
  };
});
