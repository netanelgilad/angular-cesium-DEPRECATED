/**
 * Created by netanel on 10/01/15.
 */
angular.module('angularCesium', ['observableCollection']);
/**
 * Created by netanel on 10/01/15.
 */
angular.module('angularCesium').service('BillBoardAttributes', function($parse) {
  this.calcAttributes = function(attrs, context) {
    var result = {
      image : $parse(attrs.image)(context)
    };
    var positionAttr = $parse(attrs.position)(context);
    result.position = Cesium.Cartesian3.fromDegrees(Number(positionAttr.longitude) || 0, Number(positionAttr.latitude) || 0, Number(positionAttr.altitude) || 0);

    var color = $parse(attrs.color)(context);
    if (color) {
      result.color = Cesium.Color.fromCssColorString(color);
    }
    return result;
  };
});

/**
 * Created by netanel on 10/01/15.
 */
angular.module('angularCesium').factory('Cesium', function() {
  return Cesium;
});

/**
 * Created by netanel on 09/01/15.
 */
angular.module('angularCesium').directive('acBillboard', function(BillBoardAttributes) {
  return {
    restrict : 'E',
    require : '^acBillboardsLayer',
    link : function(scope, element, attrs, acBillboardsLayerCtrl) {
      var billDesc = BillBoardAttributes.calcAttributes(attrs, scope);

      var billboard = acBillboardsLayerCtrl.getBillboardCollection().add(billDesc);

      scope.$on('$destroy', function() {
        acBillboardsLayerCtrl.getBillboardCollection().remove(billboard);
      });
    }
  }
});

/**
 * Created by netanel on 09/01/16.
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

/**
 * Created by netanel on 17/01/15.
 */
angular.module('angularCesium').directive('acComplexLayer', function($log) {
  return {
    restrict : 'E',
    require : '^acMap',
    compile : function(element, attrs) {
      if (attrs.observableCollection) {
        angular.forEach(element.children(), function (child) {

          var layer = undefined;

          if (child.tagName === 'BILLBOARD') {
            layer = angular.element('<billboards-layer></billboards-layer>');
          }
          else if (child.tagName === 'LABEL') {
            layer = angular.element('<labels-layer></labels-layer>');
          }

          if (!layer) {
            $log.warn('Found an unknown child of of complex-layer. Removing...');
            angular.element(child).remove();
          }
          else {
            angular.forEach(child.attributes, function (attr) {
              layer.attr(attr.name, attr.value);
            });
            angular.forEach(element[0].attributes, function (attr) {
              if (!angular.element(child).attr(attr.name)) {
                layer.attr(attr.name, attr.value);
              }
            });
            angular.element(child).replaceWith(layer);
          }
        });
      }
    }
  }
});

/**
 * Created by netanel on 09/01/15.
 */
angular.module('angularCesium').directive('acLabel', function() {
  return {
    restrict : 'E',
    require : '^acLabelsLayer',
    scope : {
      color : '&',
      text : '&',
      position : '&'
    },
    link : function(scope, element, attrs, acLabelsLayerCtrl) {
      var labelDesc = {};

      var position = scope.position();
      labelDesc.position = Cesium.Cartesian3.fromDegrees(Number(position.longitude) || 0, Number(position.latitude) || 0, Number(position.altitude) || 0);

      var color = scope.color();
      if (color) {
        labelDesc.color = color;
      }

      labelDesc.text = scope.text();

      var label = acLabelsLayerCtrl.getLabelCollection().add(labelDesc);

      scope.$on('$destroy', function() {
        acLabelsLayerCtrl.getLabelCollection().remove(label);
      });
    }
  }
});

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

/**
 * Created by netanel on 09/01/15.
 */
'use strict';

angular.module('angularCesium').directive('acMap', function() {
  function getSceneMode(dimensions) {
    if (dimensions == 2) {
      return Cesium.SceneMode.SCENE2D;
    }
    else if (dimensions == 2.5) {
      return Cesium.SceneMode.COLUMBUS_VIEW;
    }
    else {
      return Cesium.SceneMode.SCENE3D;
    }
  }


  return {
    restrict : 'E',
    template : '<div> <ng-transclude></ng-transclude> <div class="map-container"></div> </div>',
    transclude : true,
    scope : {
      dimensions : '@'
    },
    controller : function($scope) {
      this.getCesiumWidget = function() {
        return $scope.cesium;
      }
    },
    link : {
      pre: function (scope, element) {
        if (!scope.dimensions) {
          scope.dimensions = 3;
        }

        scope.cesium = new Cesium.CesiumWidget(element.find('div')[0], {
          sceneMode: getSceneMode(scope.dimensions)
        });
      }
    }
  };
});

/**
 * Created by gilnis2 on 18/01/15.
 */
angular.module('angularCesium').directive('acPolyline', function() {
  return {
    restrict : 'E',
    require : '^acPolylinesLayer',
    scope : {
      color : '&',
      width : '&',
      positions : '&'
    },
    link : function(scope, element, attrs, acPolylinesLayerCtrl) {
      var polylineDesc = {};

      if (!angular.isDefined(scope.positions) || !angular.isFunction(scope.positions)){
        throw "Polyline positions must be defined as a function";
      }
      var positions = scope.positions();
      polylineDesc.positions = [];
      angular.forEach(positions, function(position) {
        polylineDesc.positions.push(Cesium.Cartesian3.fromDegrees(Number(position.longitude) || 0, Number(position.latitude) || 0, Number(position.altitude) || 0));
      });

      var cesiumColor = Cesium.Color.fromCssColorString('black');
      if (angular.isDefined(scope.color) && angular.isFunction(scope.color)){
        cesiumColor = Cesium.Color.fromCssColorString(scope.color());
        }
      polylineDesc.material = Cesium.Material.fromType('Color');
      polylineDesc.material.uniforms.color = cesiumColor;

      polylineDesc.width = 1;
      if (angular.isDefined(scope.width) && angular.isFunction(scope.width)){
        polylineDesc.width = scope.width();
      }

      var polyline = acPolylinesLayerCtrl.getPolylineCollection().add(polylineDesc);

      scope.$on('$destroy', function() {
        acPolylinesLayerCtrl.getPolylineCollection().remove(polyline);
      });
    }
  }
});

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

/**
 * Created by netanel on 09/01/15.
 */

angular.module('angularCesium').directive('acWebMapServiceLayer', function() {
  'use strict';
  return {
    restrict : 'E',
    require : '^acMap',
    scope : {
      url : '&',
      layers : '&',
      alpha: '&',
    },
    controller : function($scope) {
    },
    link : function(scope, element, attrs, acMapCtrl) {
      var provider = new Cesium.WebMapServiceImageryProvider({
        url: scope.url(),
        layers : scope.layers()
      });

      var layer = acMapCtrl.getCesiumWidget().scene.imageryLayers.addImageryProvider(provider);

      if (scope.alpha()) {
        layer.alpha = scope.alpha();
      }

      scope.$on('$destroy', function() {
        acMapCtrl.getCesiumWidget().scene.imageryLayers.remove(layer);
      });
    }
  };
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi5qcyIsInNlcnZpY2VzL2JpbGxib2FyZC1hdHRycy5qcyIsInNlcnZpY2VzL2Nlc2l1bS5qcyIsIm1hcC1jb21wb25lbnRzL2JpbGxib2FyZC9iaWxsYm9hcmQuanMiLCJtYXAtY29tcG9uZW50cy9iaWxsYm9hcmRzLWxheWVyL2JpbGxib2FyZHMtbGF5ZXIuanMiLCJtYXAtY29tcG9uZW50cy9jb21wbGV4LWxheWVyL2NvbXBsZXgtbGF5ZXIuanMiLCJtYXAtY29tcG9uZW50cy9sYWJlbC9sYWJlbC5qcyIsIm1hcC1jb21wb25lbnRzL2xhYmVscy1sYXllci9sYWJlbHMtbGF5ZXIuanMiLCJtYXAtY29tcG9uZW50cy9tYXAvbWFwLWRpcmVjdGl2ZS5qcyIsIm1hcC1jb21wb25lbnRzL3BvbHlsaW5lL3BvbHlsaW5lLmpzIiwibWFwLWNvbXBvbmVudHMvcG9seWxpbmVzLWxheWVyL3BvbHlsaW5lcy1sYXllci5qcyIsIm1hcC1jb21wb25lbnRzL3dlYi1tYXAtc2VydmljZS1sYXllci93ZWItbWFwLXNlcnZpY2UtbGF5ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYW5ndWxhci1jZXNpdW0uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAxMC8wMS8xNS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nLCBbJ29ic2VydmFibGVDb2xsZWN0aW9uJ10pOyIsIi8qKlxuICogQ3JlYXRlZCBieSBuZXRhbmVsIG9uIDEwLzAxLzE1LlxuICovXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLnNlcnZpY2UoJ0JpbGxCb2FyZEF0dHJpYnV0ZXMnLCBmdW5jdGlvbigkcGFyc2UpIHtcbiAgdGhpcy5jYWxjQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGF0dHJzLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgIGltYWdlIDogJHBhcnNlKGF0dHJzLmltYWdlKShjb250ZXh0KVxuICAgIH07XG4gICAgdmFyIHBvc2l0aW9uQXR0ciA9ICRwYXJzZShhdHRycy5wb3NpdGlvbikoY29udGV4dCk7XG4gICAgcmVzdWx0LnBvc2l0aW9uID0gQ2VzaXVtLkNhcnRlc2lhbjMuZnJvbURlZ3JlZXMoTnVtYmVyKHBvc2l0aW9uQXR0ci5sb25naXR1ZGUpIHx8IDAsIE51bWJlcihwb3NpdGlvbkF0dHIubGF0aXR1ZGUpIHx8IDAsIE51bWJlcihwb3NpdGlvbkF0dHIuYWx0aXR1ZGUpIHx8IDApO1xuXG4gICAgdmFyIGNvbG9yID0gJHBhcnNlKGF0dHJzLmNvbG9yKShjb250ZXh0KTtcbiAgICBpZiAoY29sb3IpIHtcbiAgICAgIHJlc3VsdC5jb2xvciA9IENlc2l1bS5Db2xvci5mcm9tQ3NzQ29sb3JTdHJpbmcoY29sb3IpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAxMC8wMS8xNS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5mYWN0b3J5KCdDZXNpdW0nLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIENlc2l1bTtcbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMDkvMDEvMTUuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY0JpbGxib2FyZCcsIGZ1bmN0aW9uKEJpbGxCb2FyZEF0dHJpYnV0ZXMpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICByZXF1aXJlIDogJ15hY0JpbGxib2FyZHNMYXllcicsXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNCaWxsYm9hcmRzTGF5ZXJDdHJsKSB7XG4gICAgICB2YXIgYmlsbERlc2MgPSBCaWxsQm9hcmRBdHRyaWJ1dGVzLmNhbGNBdHRyaWJ1dGVzKGF0dHJzLCBzY29wZSk7XG5cbiAgICAgIHZhciBiaWxsYm9hcmQgPSBhY0JpbGxib2FyZHNMYXllckN0cmwuZ2V0QmlsbGJvYXJkQ29sbGVjdGlvbigpLmFkZChiaWxsRGVzYyk7XG5cbiAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgYWNCaWxsYm9hcmRzTGF5ZXJDdHJsLmdldEJpbGxib2FyZENvbGxlY3Rpb24oKS5yZW1vdmUoYmlsbGJvYXJkKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAwOS8wMS8xNi5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2FjQmlsbGJvYXJkc0xheWVyJywgZnVuY3Rpb24oJHBhcnNlLCBPYnNlcnZhYmxlQ29sbGVjdGlvbiwgQmlsbEJvYXJkQXR0cmlidXRlcywgQ2VzaXVtKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgcmVxdWlyZSA6ICdeYWNNYXAnLFxuICAgIGNvbnRyb2xsZXIgOiBmdW5jdGlvbigkc2NvcGUsICRhdHRycykge1xuICAgICAgdGhpcy5nZXRCaWxsYm9hcmRDb2xsZWN0aW9uID0gZ2V0QmlsbGJvYXJkQ29sbGVjdGlvbjtcblxuICAgICAgZnVuY3Rpb24gZ2V0QmlsbGJvYXJkQ29sbGVjdGlvbigpIHtcbiAgICAgICAgaWYgKCRhdHRycy5vYnNlcnZhYmxlQ29sbGVjdGlvbikge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY2Fubm90IGdldCBjb2xsZWN0aW9uIGlmIGxheWVyIGlzIGJvdW5kIHRvIE9ic2VydmFibGVDb2xsZWN0aW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICRzY29wZS5jb2xsZWN0aW9uO1xuICAgICAgfVxuICAgIH0sXG4gICAgbGluayA6IHtcbiAgICAgIHByZTogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNNYXBDdHJsKSB7XG4gICAgICAgIHNjb3BlLmNvbGxlY3Rpb24gPSBuZXcgQ2VzaXVtLkJpbGxib2FyZENvbGxlY3Rpb24oKTtcblxuICAgICAgICBpZiAoYXR0cnMub2JzZXJ2YWJsZUNvbGxlY3Rpb24pIHtcbiAgICAgICAgICB2YXIgQ09MTEVDVElPTl9SRUdFWFAgPSAvXFxzKihbXFwkXFx3XSspXFxzK2luXFxzKygoPzpbXFwkXFx3XStcXC4pKltcXCRcXHddKykvO1xuICAgICAgICAgIHZhciBtYXRjaCA9IGF0dHJzLm9ic2VydmFibGVDb2xsZWN0aW9uLm1hdGNoKENPTExFQ1RJT05fUkVHRVhQKTtcbiAgICAgICAgICB2YXIgaXRlbU5hbWUgPSBtYXRjaFsxXTtcbiAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9ICRwYXJzZShtYXRjaFsyXSkoc2NvcGUpO1xuICAgICAgICAgIGlmICghY29sbGVjdGlvbiBpbnN0YW5jZW9mIE9ic2VydmFibGVDb2xsZWN0aW9uKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ29ic2VydmFibGUtY29sbGVjdGlvbiBtdXN0IGJlIG9mIHR5cGUgT2JzZXJ2YWJsZUNvbGxlY3Rpb24uJyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjb2xsZWN0aW9uLmdldERhdGEoKSwgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgICBhZGRCaWxsYm9hcmQoaXRlbSlcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb2xsZWN0aW9uLm9uQWRkKGFkZEJpbGxib2FyZCk7XG4gICAgICAgICAgICBjb2xsZWN0aW9uLm9uVXBkYXRlKHVwZGF0ZSk7XG4gICAgICAgICAgICBjb2xsZWN0aW9uLm9uUmVtb3ZlKHJlbW92ZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3Rpb24gYWRkQmlsbGJvYXJkKGl0ZW0pIHtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0ge307XG4gICAgICAgICAgICBjb250ZXh0W2l0ZW1OYW1lXSA9IGl0ZW07XG4gICAgICAgICAgICB2YXIgYmlsbERlc2MgPSBCaWxsQm9hcmRBdHRyaWJ1dGVzLmNhbGNBdHRyaWJ1dGVzKGF0dHJzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIHJldHVybiBzY29wZS5jb2xsZWN0aW9uLmFkZChiaWxsRGVzYyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3Rpb24gdXBkYXRlKGl0ZW0sIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgYmlsbGJvYXJkID0gc2NvcGUuY29sbGVjdGlvbi5nZXQoaW5kZXgpO1xuICAgICAgICAgICAgYmlsbGJvYXJkLnBvc2l0aW9uID0gQ2VzaXVtLkNhcnRlc2lhbjMuZnJvbURlZ3JlZXMoTnVtYmVyKGl0ZW0ucG9zaXRpb24ubG9uZ2l0dWRlKSB8fCAwLCBOdW1iZXIoaXRlbS5wb3NpdGlvbi5sYXRpdHVkZSkgfHwgMCwgTnVtYmVyKGl0ZW0ucG9zaXRpb24uYWx0aXR1ZGUpIHx8IDApO1xuICAgICAgICAgICAgYmlsbGJvYXJkLmltYWdlID0gaXRlbS5pbWFnZTtcbiAgICAgICAgICAgIGJpbGxib2FyZC5jb2xvciA9IENlc2l1bS5Db2xvci5mcm9tQ3NzQ29sb3JTdHJpbmcoaXRlbS5jb2xvcik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3Rpb24gcmVtb3ZlKGl0ZW0sIGluZGV4KSB7XG4gICAgICAgICAgICBzY29wZS5jb2xsZWN0aW9uLnJlbW92ZShzY29wZS5jb2xsZWN0aW9uLmdldChpbmRleCkpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICAgICAgYWNNYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLnByaW1pdGl2ZXMuYWRkKHNjb3BlLmNvbGxlY3Rpb24pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgYWNNYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLnByaW1pdGl2ZXMucmVtb3ZlKHNjb3BlLmNvbGxlY3Rpb24pO1xuICAgICAgICB9KTtcblxuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAxNy8wMS8xNS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2FjQ29tcGxleExheWVyJywgZnVuY3Rpb24oJGxvZykge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0IDogJ0UnLFxuICAgIHJlcXVpcmUgOiAnXmFjTWFwJyxcbiAgICBjb21waWxlIDogZnVuY3Rpb24oZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgIGlmIChhdHRycy5vYnNlcnZhYmxlQ29sbGVjdGlvbikge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goZWxlbWVudC5jaGlsZHJlbigpLCBmdW5jdGlvbiAoY2hpbGQpIHtcblxuICAgICAgICAgIHZhciBsYXllciA9IHVuZGVmaW5lZDtcblxuICAgICAgICAgIGlmIChjaGlsZC50YWdOYW1lID09PSAnQklMTEJPQVJEJykge1xuICAgICAgICAgICAgbGF5ZXIgPSBhbmd1bGFyLmVsZW1lbnQoJzxiaWxsYm9hcmRzLWxheWVyPjwvYmlsbGJvYXJkcy1sYXllcj4nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoY2hpbGQudGFnTmFtZSA9PT0gJ0xBQkVMJykge1xuICAgICAgICAgICAgbGF5ZXIgPSBhbmd1bGFyLmVsZW1lbnQoJzxsYWJlbHMtbGF5ZXI+PC9sYWJlbHMtbGF5ZXI+Jyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFsYXllcikge1xuICAgICAgICAgICAgJGxvZy53YXJuKCdGb3VuZCBhbiB1bmtub3duIGNoaWxkIG9mIG9mIGNvbXBsZXgtbGF5ZXIuIFJlbW92aW5nLi4uJyk7XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoY2hpbGQpLnJlbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjaGlsZC5hdHRyaWJ1dGVzLCBmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICAgICAgICBsYXllci5hdHRyKGF0dHIubmFtZSwgYXR0ci52YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChlbGVtZW50WzBdLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgICAgICAgIGlmICghYW5ndWxhci5lbGVtZW50KGNoaWxkKS5hdHRyKGF0dHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICBsYXllci5hdHRyKGF0dHIubmFtZSwgYXR0ci52YWx1ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KGNoaWxkKS5yZXBsYWNlV2l0aChsYXllcik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMDkvMDEvMTUuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY0xhYmVsJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgcmVxdWlyZSA6ICdeYWNMYWJlbHNMYXllcicsXG4gICAgc2NvcGUgOiB7XG4gICAgICBjb2xvciA6ICcmJyxcbiAgICAgIHRleHQgOiAnJicsXG4gICAgICBwb3NpdGlvbiA6ICcmJ1xuICAgIH0sXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNMYWJlbHNMYXllckN0cmwpIHtcbiAgICAgIHZhciBsYWJlbERlc2MgPSB7fTtcblxuICAgICAgdmFyIHBvc2l0aW9uID0gc2NvcGUucG9zaXRpb24oKTtcbiAgICAgIGxhYmVsRGVzYy5wb3NpdGlvbiA9IENlc2l1bS5DYXJ0ZXNpYW4zLmZyb21EZWdyZWVzKE51bWJlcihwb3NpdGlvbi5sb25naXR1ZGUpIHx8IDAsIE51bWJlcihwb3NpdGlvbi5sYXRpdHVkZSkgfHwgMCwgTnVtYmVyKHBvc2l0aW9uLmFsdGl0dWRlKSB8fCAwKTtcblxuICAgICAgdmFyIGNvbG9yID0gc2NvcGUuY29sb3IoKTtcbiAgICAgIGlmIChjb2xvcikge1xuICAgICAgICBsYWJlbERlc2MuY29sb3IgPSBjb2xvcjtcbiAgICAgIH1cblxuICAgICAgbGFiZWxEZXNjLnRleHQgPSBzY29wZS50ZXh0KCk7XG5cbiAgICAgIHZhciBsYWJlbCA9IGFjTGFiZWxzTGF5ZXJDdHJsLmdldExhYmVsQ29sbGVjdGlvbigpLmFkZChsYWJlbERlc2MpO1xuXG4gICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGFjTGFiZWxzTGF5ZXJDdHJsLmdldExhYmVsQ29sbGVjdGlvbigpLnJlbW92ZShsYWJlbCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMDkvMDEvMTUuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY0xhYmVsc0xheWVyJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgcmVxdWlyZSA6ICdeYWNNYXAnLFxuICAgIHNjb3BlIDoge30sXG4gICAgY29udHJvbGxlciA6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgdGhpcy5nZXRMYWJlbENvbGxlY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICRzY29wZS5jb2xsZWN0aW9uO1xuICAgICAgfVxuICAgIH0sXG4gICAgbGluayA6IHtcbiAgICAgIHByZTogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNNYXBDdHJsKSB7XG4gICAgICAgIHNjb3BlLmNvbGxlY3Rpb24gPSBuZXcgQ2VzaXVtLkxhYmVsQ29sbGVjdGlvbigpO1xuICAgICAgICBhY01hcEN0cmwuZ2V0Q2VzaXVtV2lkZ2V0KCkuc2NlbmUucHJpbWl0aXZlcy5hZGQoc2NvcGUuY29sbGVjdGlvbik7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBhY01hcEN0cmwuZ2V0Q2VzaXVtV2lkZ2V0KCkuc2NlbmUucHJpbWl0aXZlcy5yZW1vdmUoc2NvcGUuY29sbGVjdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAwOS8wMS8xNS5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYWNNYXAnLCBmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gZ2V0U2NlbmVNb2RlKGRpbWVuc2lvbnMpIHtcbiAgICBpZiAoZGltZW5zaW9ucyA9PSAyKSB7XG4gICAgICByZXR1cm4gQ2VzaXVtLlNjZW5lTW9kZS5TQ0VORTJEO1xuICAgIH1cbiAgICBlbHNlIGlmIChkaW1lbnNpb25zID09IDIuNSkge1xuICAgICAgcmV0dXJuIENlc2l1bS5TY2VuZU1vZGUuQ09MVU1CVVNfVklFVztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gQ2VzaXVtLlNjZW5lTW9kZS5TQ0VORTNEO1xuICAgIH1cbiAgfVxuXG5cbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICB0ZW1wbGF0ZSA6ICc8ZGl2PiA8bmctdHJhbnNjbHVkZT48L25nLXRyYW5zY2x1ZGU+IDxkaXYgY2xhc3M9XCJtYXAtY29udGFpbmVyXCI+PC9kaXY+IDwvZGl2PicsXG4gICAgdHJhbnNjbHVkZSA6IHRydWUsXG4gICAgc2NvcGUgOiB7XG4gICAgICBkaW1lbnNpb25zIDogJ0AnXG4gICAgfSxcbiAgICBjb250cm9sbGVyIDogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICB0aGlzLmdldENlc2l1bVdpZGdldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJHNjb3BlLmNlc2l1bTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGxpbmsgOiB7XG4gICAgICBwcmU6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCkge1xuICAgICAgICBpZiAoIXNjb3BlLmRpbWVuc2lvbnMpIHtcbiAgICAgICAgICBzY29wZS5kaW1lbnNpb25zID0gMztcbiAgICAgICAgfVxuXG4gICAgICAgIHNjb3BlLmNlc2l1bSA9IG5ldyBDZXNpdW0uQ2VzaXVtV2lkZ2V0KGVsZW1lbnQuZmluZCgnZGl2JylbMF0sIHtcbiAgICAgICAgICBzY2VuZU1vZGU6IGdldFNjZW5lTW9kZShzY29wZS5kaW1lbnNpb25zKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59KTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBnaWxuaXMyIG9uIDE4LzAxLzE1LlxuICovXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYWNQb2x5bGluZScsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0IDogJ0UnLFxuICAgIHJlcXVpcmUgOiAnXmFjUG9seWxpbmVzTGF5ZXInLFxuICAgIHNjb3BlIDoge1xuICAgICAgY29sb3IgOiAnJicsXG4gICAgICB3aWR0aCA6ICcmJyxcbiAgICAgIHBvc2l0aW9ucyA6ICcmJ1xuICAgIH0sXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNQb2x5bGluZXNMYXllckN0cmwpIHtcbiAgICAgIHZhciBwb2x5bGluZURlc2MgPSB7fTtcblxuICAgICAgaWYgKCFhbmd1bGFyLmlzRGVmaW5lZChzY29wZS5wb3NpdGlvbnMpIHx8ICFhbmd1bGFyLmlzRnVuY3Rpb24oc2NvcGUucG9zaXRpb25zKSl7XG4gICAgICAgIHRocm93IFwiUG9seWxpbmUgcG9zaXRpb25zIG11c3QgYmUgZGVmaW5lZCBhcyBhIGZ1bmN0aW9uXCI7XG4gICAgICB9XG4gICAgICB2YXIgcG9zaXRpb25zID0gc2NvcGUucG9zaXRpb25zKCk7XG4gICAgICBwb2x5bGluZURlc2MucG9zaXRpb25zID0gW107XG4gICAgICBhbmd1bGFyLmZvckVhY2gocG9zaXRpb25zLCBmdW5jdGlvbihwb3NpdGlvbikge1xuICAgICAgICBwb2x5bGluZURlc2MucG9zaXRpb25zLnB1c2goQ2VzaXVtLkNhcnRlc2lhbjMuZnJvbURlZ3JlZXMoTnVtYmVyKHBvc2l0aW9uLmxvbmdpdHVkZSkgfHwgMCwgTnVtYmVyKHBvc2l0aW9uLmxhdGl0dWRlKSB8fCAwLCBOdW1iZXIocG9zaXRpb24uYWx0aXR1ZGUpIHx8IDApKTtcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgY2VzaXVtQ29sb3IgPSBDZXNpdW0uQ29sb3IuZnJvbUNzc0NvbG9yU3RyaW5nKCdibGFjaycpO1xuICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHNjb3BlLmNvbG9yKSAmJiBhbmd1bGFyLmlzRnVuY3Rpb24oc2NvcGUuY29sb3IpKXtcbiAgICAgICAgY2VzaXVtQ29sb3IgPSBDZXNpdW0uQ29sb3IuZnJvbUNzc0NvbG9yU3RyaW5nKHNjb3BlLmNvbG9yKCkpO1xuICAgICAgICB9XG4gICAgICBwb2x5bGluZURlc2MubWF0ZXJpYWwgPSBDZXNpdW0uTWF0ZXJpYWwuZnJvbVR5cGUoJ0NvbG9yJyk7XG4gICAgICBwb2x5bGluZURlc2MubWF0ZXJpYWwudW5pZm9ybXMuY29sb3IgPSBjZXNpdW1Db2xvcjtcblxuICAgICAgcG9seWxpbmVEZXNjLndpZHRoID0gMTtcbiAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChzY29wZS53aWR0aCkgJiYgYW5ndWxhci5pc0Z1bmN0aW9uKHNjb3BlLndpZHRoKSl7XG4gICAgICAgIHBvbHlsaW5lRGVzYy53aWR0aCA9IHNjb3BlLndpZHRoKCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBwb2x5bGluZSA9IGFjUG9seWxpbmVzTGF5ZXJDdHJsLmdldFBvbHlsaW5lQ29sbGVjdGlvbigpLmFkZChwb2x5bGluZURlc2MpO1xuXG4gICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGFjUG9seWxpbmVzTGF5ZXJDdHJsLmdldFBvbHlsaW5lQ29sbGVjdGlvbigpLnJlbW92ZShwb2x5bGluZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGdpbG5pczIgb24gMTgvMDEvMTUuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY1BvbHlsaW5lc0xheWVyJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgcmVxdWlyZSA6ICdeYWNNYXAnLFxuICAgIHNjb3BlIDoge30sXG4gICAgY29udHJvbGxlciA6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgdGhpcy5nZXRQb2x5bGluZUNvbGxlY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICRzY29wZS5jb2xsZWN0aW9uO1xuICAgICAgfVxuICAgIH0sXG4gICAgbGluayA6IHtcbiAgICAgIHByZTogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNNYXBDdHJsKSB7XG4gICAgICAgIHNjb3BlLmNvbGxlY3Rpb24gPSBuZXcgQ2VzaXVtLlBvbHlsaW5lQ29sbGVjdGlvbigpO1xuICAgICAgICBhY01hcEN0cmwuZ2V0Q2VzaXVtV2lkZ2V0KCkuc2NlbmUucHJpbWl0aXZlcy5hZGQoc2NvcGUuY29sbGVjdGlvbik7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBhY01hcEN0cmwuZ2V0Q2VzaXVtV2lkZ2V0KCkuc2NlbmUucHJpbWl0aXZlcy5yZW1vdmUoc2NvcGUuY29sbGVjdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAwOS8wMS8xNS5cbiAqL1xuXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYWNXZWJNYXBTZXJ2aWNlTGF5ZXInLCBmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0IDogJ0UnLFxuICAgIHJlcXVpcmUgOiAnXmFjTWFwJyxcbiAgICBzY29wZSA6IHtcbiAgICAgIHVybCA6ICcmJyxcbiAgICAgIGxheWVycyA6ICcmJyxcbiAgICAgIGFscGhhOiAnJicsXG4gICAgfSxcbiAgICBjb250cm9sbGVyIDogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgfSxcbiAgICBsaW5rIDogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBhY01hcEN0cmwpIHtcbiAgICAgIHZhciBwcm92aWRlciA9IG5ldyBDZXNpdW0uV2ViTWFwU2VydmljZUltYWdlcnlQcm92aWRlcih7XG4gICAgICAgIHVybDogc2NvcGUudXJsKCksXG4gICAgICAgIGxheWVycyA6IHNjb3BlLmxheWVycygpXG4gICAgICB9KTtcblxuICAgICAgdmFyIGxheWVyID0gYWNNYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLmltYWdlcnlMYXllcnMuYWRkSW1hZ2VyeVByb3ZpZGVyKHByb3ZpZGVyKTtcblxuICAgICAgaWYgKHNjb3BlLmFscGhhKCkpIHtcbiAgICAgICAgbGF5ZXIuYWxwaGEgPSBzY29wZS5hbHBoYSgpO1xuICAgICAgfVxuXG4gICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5pbWFnZXJ5TGF5ZXJzLnJlbW92ZShsYXllcik7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==