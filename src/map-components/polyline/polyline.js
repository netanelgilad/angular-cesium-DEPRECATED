/**
 * Created by gilnis2 on 18/01/15.
 */
angular.module('angularCesium').directive('polyline', function() {
  return {
    restrict : 'E',
    require : '^polylinesLayer',
    scope : {
      color : '&',
      width : '&',
      positions : '&'
    },
    link : function(scope, element, attrs, polylinesLayerCtrl) {
      var polylineDesc = {};

      if (angular.isDefined(scope.positions) || angular.isFunction(scope.positions)){
        throw "Polyline positions must be defined as a function";
      }
      var positions = scope.positions();
      angular.forEach(positions, function(position) {
        polylineDesc.positions.push(Cesium.Cartesian3.fromDegrees(Number(position.latitude) || 0, Number(position.longitude) || 0, Number(position.altitude) || 0));
      });

      polylineDesc.color = Cesium.Color.fromCssColorString('black');
      if (angular.isDefined(scope.color) && angular.isFunction(scope.color)){
          polylineDesc.color = scope.color();
        }

      polylineDesc.width = 1;
      if (angular.isDefined(scope.width) && angular.isFunction(scope.width)){
        polylineDesc.width = scope.width();
      }

      var polyline = polylinesLayerCtrl.getPolylineCollection().add(polylineDesc);

      scope.$on('$destroy', function() {
        polylinesLayerCtrl.getPolylineCollection().remove(polyline);
      });
    }
  }
});
