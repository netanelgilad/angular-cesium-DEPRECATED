/**
 * Created by bipol on 01/20/16.
 */
'use strict';

angular.module('angularCesium').directive('acBaseLayerPicker', function() {
  return {
    restrict : 'E',
    require : '^acMap',
    transclude: true,
    template : '<div id="baseLayerPickerContainer" style="position:absolute;top:24px;right:24px;width:38px;height:38px;"><div ng-transclude></div></div>',
    controller : function($scope) {
      this.getImageryViewModels = getImageryViewModels;
      this.pushImageryViewModel = pushImageryViewModel;

      function getImageryViewModels() {
        return $scope.imageryViewModels;
      }

      function pushImageryViewModel(item) {
        $scope.imageryViewModels.push(item);
      }
    },
    link :{
      pre: function(scope, element, attrs, acMapCtrl) {
        scope.imageryViewModels = [];
        scope.baseLayerPicker = null;

        scope.$on('$destroy', function() {
          acMapCtrl.getCesiumWidget().baseLayerPicker.destroy();
        });
      },
      post: function(scope, element, attrs, acMapCtrl) {
        scope.$watch(function() { return scope.imageryViewModels }, function(val) {
            if (!scope.baseLayerPicker) {
              scope.baseLayerPicker = new Cesium.BaseLayerPicker('baseLayerPickerContainer', {
                  globe : acMapCtrl.getCesiumWidget().scene.globe,
                  imageryProviderViewModels : scope.imageryViewModels
              });
            } else {
              scope.baseLayerPicker.destroy();
              scope.baseLayerPicker = new Cesium.BaseLayerPicker('baseLayerPickerContainer', {
                  globe : acMapCtrl.getCesiumWidget().scene.globe,
                  imageryProviderViewModels : scope.imageryViewModels
              });
            }
        }, true);
      }
    }
  }
});
