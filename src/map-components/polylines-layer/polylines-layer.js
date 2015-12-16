/**
 * Created by gilnis2 on 18/01/15.
 */
angular.module('angularCesium').directive('acPolylinesLayer', function() {
  return {
    restrict : 'E',
    require : '^acMap',
    scope : {},
    controller : function($scope) {
      this.getPolylineCollection = function() {
        return $scope.collection;
      }
    },
    link : {
      pre: function (scope, element, attrs, acMapCtrl) {
        scope.collection = new Cesium.PolylineCollection();
        acMapCtrl.getCesiumWidget().scene.primitives.add(scope.collection);

        scope.$on('$destroy', function () {
          acMapCtrl.getCesiumWidget().scene.primitives.remove(scope.collection);
        });
      }
    }
  }
});
