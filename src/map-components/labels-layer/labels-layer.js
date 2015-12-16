/**
 * Created by netanel on 09/01/15.
 */
angular.module('angularCesium').directive('acLabelsLayer', function() {
  return {
    restrict : 'E',
    require : '^acMap',
    scope : {},
    controller : function($scope) {
      this.getLabelCollection = function() {
        return $scope.collection;
      }
    },
    link : {
      pre: function (scope, element, attrs, acMapCtrl) {
        scope.collection = new Cesium.LabelCollection();
        acMapCtrl.getCesiumWidget().scene.primitives.add(scope.collection);

        scope.$on('$destroy', function () {
          acMapCtrl.getCesiumWidget().scene.primitives.remove(scope.collection);
        });
      }
    }
  }
});
