/**
 * Created by netanel on 09/01/15.
 */
angular.module('angularCesium').directive('billboard', function(BillBoardAttributes) {
  return {
    restrict : 'E',
    require : '^billboardsLayer',
    link : function(scope, element, attrs, billboardsLayerCtrl) {
      var billDesc = BillBoardAttributes.calcAttributes(attrs, scope);

      var billboard = billboardsLayerCtrl.getBillboardCollection().add(billDesc);

      scope.$on('$destroy', function() {
        billboardsLayerCtrl.getBillboardCollection().remove(billboard);
      });
    }
  }
});
