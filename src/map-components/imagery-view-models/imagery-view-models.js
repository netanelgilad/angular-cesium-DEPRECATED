/**
 * Created by bipol on 01/20/16.
 */
'use strict';

angular.module('angularCesium').directive('acImageryViewModels', function() {
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

      acBaseLayerPickerCtrl.pushImageryViewModel(item);

      scope.$on('$destroy', function() {
        angular.forEach(acBaseLayerPickerCtrl.getImageryViewModels(), function(val, key) {
          // remove the element
          if (val === provider) {
            acBaseLayerPickerCtrl.getImageryViewModels().splice(key, 1);
          }
        });
      });
    }
  }
});
