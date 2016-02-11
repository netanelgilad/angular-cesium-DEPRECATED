/**
 * Created by bipol on 01/20/16.
 */

angular.module('angularCesium').directive('acGeocoder', function() {
  'use strict';
  return {
    restrict : 'E',
    require : '^acMap',
    transclude: true,
    template : '<div id="geocoderContainer" class="cesium-viewer-geocoderContainer"></div>',
    controller : function($scope) {
    },
    link :{
      pre: function(scope, element, attrs, acMapCtrl) {
        scope.geocoder = null;

        scope.geocoder = new Cesium.Geocoder({
          container: 'geocoderContainer',
          scene: acMapCtrl.getCesiumWidget().scene,
        });

        scope.$on('$destroy', function() {
          acMapCtrl.getCesiumWidget().geocoder.destroy();
        });
      },
    }
  }
});
