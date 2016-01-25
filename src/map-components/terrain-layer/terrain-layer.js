/**
 * Created by bipolalam on 12/21/15.
 */
'use strict';

angular.module('angularCesium').directive('acTerrainLayer', function() {
  return {
    restrict : 'E',
    require : '^acMap',
    scope : {
      url : '&',
    },
    controller : function($scope) {
    },
    link : function(scope, element, attrs, acMapCtrl) {
      var provider = new Cesium.CesiumTerrainProvider({
        url: scope.url(),
      });

      acMapCtrl.setTerrainProvider(provider);

      scope.$on('$destroy', function() {
        acMapCtrl.getCesiumWidget().scene.terrainProvider.remove(layer);
      });
    }
  };
});
