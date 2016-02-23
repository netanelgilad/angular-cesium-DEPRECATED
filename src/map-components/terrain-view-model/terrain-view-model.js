/**
 * Created by bipol on 01/25/16.
 */
'use strict';

angular.module('angularCesium').directive('acTerrainViewModels', function() {
  return {
    restrict : 'E',
    require : '^acBaseLayerPicker',
    scope : {
      name: '&',
      iconUrl: '&',
      tooltip: '&',
      creationFunction: '&'
    },
    controller: function($scope, Cesium) {
      $scope.cesiumFactory = Cesium;
    },
    link : function(scope, element, attrs, acBaseLayerPickerCtrl) {
      var item = new scope.cesiumFactory.ProviderViewModel({
        name: scope.name(),
        iconUrl: scope.iconUrl(),
        tooltip: scope.tooltip(),
        creationFunction: scope.creationFunction
      });

      acBaseLayerPickerCtrl.pushProviderViewModel('terrainProviderViewModels', item);

      scope.$on('$destroy', function() {
        angular.forEach(acBaseLayerPickerCtrl.getTerrainViewModels(), function(val, key) {
          // remove the element
          if (val === provider) {
            acBaseLayerPickerCtrl.getTerrainViewModels().splice(key, 1);
          }
        });
      });
    }
  }
});
