/**
 * Created by netanel on 09/01/15.
 */
angular.module('angularCesium').directive('label', function() {
  return {
    restrict : 'E',
    require : '^labelsLayer',
    scope : {
      color : '&',
      text : '&',
      position : '&'
    },
    link : function(scope, element, attrs, labelsLayerCtrl) {
      var labelDesc = {};

      var position = scope.position();
      labelDesc.position = Cesium.Cartesian3.fromDegrees(Number(position.longitude) || 0, Number(position.latitude) || 0, Number(position.altitude) || 0);

      var color = scope.color();
      if (color) {
        labelDesc.color = color;
      }

      labelDesc.text = scope.text();

      var label = labelsLayerCtrl.getLabelCollection().add(labelDesc);

      scope.$on('$destroy', function() {
        labelsLayerCtrl.getLabelCollection().remove(label);
      });
    }
  }
});
