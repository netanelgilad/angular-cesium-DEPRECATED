/**
 * Created by netanel on 09/01/15.
 */
angular.module('angularCesium').directive('acBillboard', function(BillBoardAttributes) {
  return {
    restrict : 'E',
    require : '^acBillboardsLayer',
    link : function(scope, element, attrs, acBillboardsLayerCtrl) {
      var billDesc = BillBoardAttributes.calcAttributes(attrs, scope);

      var billboard = billboardsLayerCtrl.getBillboardCollection().add(billDesc);

      scope.$on('$destroy', function() {
        billboardsLayerCtrl.getBillboardCollection().remove(billboard);
      });
    }
  }
});
