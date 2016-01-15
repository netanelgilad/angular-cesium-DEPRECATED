/**
 * Created by netanel on 09/01/15.
 */
angular.module('angularCesium').directive('acBillboardsLayer', function($parse, ObservableCollection, BillBoardAttributes, Cesium) {
  return {
    restrict : 'E',
    require : '^acMap',
    controller : function($scope, $attrs) {
      this.getBillboardCollection = getBillboardCollection;

      function getBillboardCollection() {
        if ($attrs.observableCollection) {
          throw new Error('cannot get collection if layer is bound to ObservableCollection');
        }
        return $scope.collection;
      }
    },
    link : {
      pre: function (scope, element, attrs, acMapCtrl) {
        scope.collection = new Cesium.BillboardCollection();

        if (attrs.observableCollection) {
          var COLLECTION_REGEXP = /\s*([\$\w]+)\s+in\s+((?:[\$\w]+\.)*[\$\w]+)/;
          var match = attrs.observableCollection.match(COLLECTION_REGEXP);
          var itemName = match[1];
          var collection = $parse(match[2])(scope);
          if (!collection instanceof ObservableCollection) {
            throw new Error('observable-collection must be of type ObservableCollection.');
          } else {
            angular.forEach(collection.getData(), function(item) {
              addBillboard(item)
            });

            collection.onAdd(addBillboard);
            collection.onUpdate(update);
            collection.onRemove(remove);
          }

          function addBillboard(item) {
            var context = {};
            context[itemName] = item;
            var billDesc = BillBoardAttributes.calcAttributes(attrs, context);
            return scope.collection.add(billDesc);
          }

          function update(item, index) {
            var billboard = scope.collection.get(index);
            billboard.position = Cesium.Cartesian3.fromDegrees(Number(item.position.longitude) || 0, Number(item.position.latitude) || 0, Number(item.position.altitude) || 0);
            billboard.image = item.image;
            billboard.color = Cesium.Color.fromCssColorString(item.color);
          }

          function remove(item, index) {
            scope.collection.remove(scope.collection.get(index));
          }

        }

        acMapCtrl.getCesiumWidget().scene.primitives.add(scope.collection);

        scope.$on('$destroy', function () {
          acMapCtrl.getCesiumWidget().scene.primitives.remove(scope.collection);
        });

      }
    }
  }
});
