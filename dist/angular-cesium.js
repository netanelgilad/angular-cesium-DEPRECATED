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
'use strict';

angular.module('angularCesium').directive('acWebMapServiceLayer', function() {
  return {
    restrict : 'E',
    require : '^acMap',
    scope : {
      url : '&',
      layers : '&'
    },
    controller : function($scope) {
    },
    link : function(scope, element, attrs, acMapCtrl) {
      var provider = new Cesium.WebMapServiceImageryProvider({
        url: scope.url(),
        layers : scope.layers()
      });

      var layer = acMapCtrl.getCesiumWidget().scene.imageryLayers.addImageryProvider(provider);

      scope.$on('$destroy', function() {
        acMapCtrl.getCesiumWidget().scene.imageryLayers.remove(layer);
      });
    }
  };
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi5qcyIsInNlcnZpY2VzL2JpbGxib2FyZC1hdHRycy5qcyIsInNlcnZpY2VzL2Nlc2l1bS5qcyIsIm1hcC1jb21wb25lbnRzL2JpbGxib2FyZHMtbGF5ZXIvYmlsbGJvYXJkcy1sYXllci5qcyIsIm1hcC1jb21wb25lbnRzL2JpbGxib2FyZC9iaWxsYm9hcmQuanMiLCJtYXAtY29tcG9uZW50cy9jb21wbGV4LWxheWVyL2NvbXBsZXgtbGF5ZXIuanMiLCJtYXAtY29tcG9uZW50cy9sYWJlbC9sYWJlbC5qcyIsIm1hcC1jb21wb25lbnRzL2xhYmVscy1sYXllci9sYWJlbHMtbGF5ZXIuanMiLCJtYXAtY29tcG9uZW50cy9tYXAvbWFwLWRpcmVjdGl2ZS5qcyIsIm1hcC1jb21wb25lbnRzL3BvbHlsaW5lL3BvbHlsaW5lLmpzIiwibWFwLWNvbXBvbmVudHMvcG9seWxpbmVzLWxheWVyL3BvbHlsaW5lcy1sYXllci5qcyIsIm1hcC1jb21wb25lbnRzL3dlYi1tYXAtc2VydmljZS1sYXllci93ZWItbWFwLXNlcnZpY2UtbGF5ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhbmd1bGFyLWNlc2l1bS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ3JlYXRlZCBieSBuZXRhbmVsIG9uIDEwLzAxLzE1LlxuICovXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScsIFsnb2JzZXJ2YWJsZUNvbGxlY3Rpb24nXSk7IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMTAvMDEvMTUuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuc2VydmljZSgnQmlsbEJvYXJkQXR0cmlidXRlcycsIGZ1bmN0aW9uKCRwYXJzZSkge1xuICB0aGlzLmNhbGNBdHRyaWJ1dGVzID0gZnVuY3Rpb24oYXR0cnMsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgaW1hZ2UgOiAkcGFyc2UoYXR0cnMuaW1hZ2UpKGNvbnRleHQpXG4gICAgfTtcbiAgICB2YXIgcG9zaXRpb25BdHRyID0gJHBhcnNlKGF0dHJzLnBvc2l0aW9uKShjb250ZXh0KTtcbiAgICByZXN1bHQucG9zaXRpb24gPSBDZXNpdW0uQ2FydGVzaWFuMy5mcm9tRGVncmVlcyhOdW1iZXIocG9zaXRpb25BdHRyLmxvbmdpdHVkZSkgfHwgMCwgTnVtYmVyKHBvc2l0aW9uQXR0ci5sYXRpdHVkZSkgfHwgMCwgTnVtYmVyKHBvc2l0aW9uQXR0ci5hbHRpdHVkZSkgfHwgMCk7XG5cbiAgICB2YXIgY29sb3IgPSAkcGFyc2UoYXR0cnMuY29sb3IpKGNvbnRleHQpO1xuICAgIGlmIChjb2xvcikge1xuICAgICAgcmVzdWx0LmNvbG9yID0gQ2VzaXVtLkNvbG9yLmZyb21Dc3NDb2xvclN0cmluZyhjb2xvcik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59KTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBuZXRhbmVsIG9uIDEwLzAxLzE1LlxuICovXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmZhY3RvcnkoJ0Nlc2l1bScsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gQ2VzaXVtO1xufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAwOS8wMS8xNi5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2FjQmlsbGJvYXJkc0xheWVyJywgZnVuY3Rpb24oJHBhcnNlLCBPYnNlcnZhYmxlQ29sbGVjdGlvbiwgQmlsbEJvYXJkQXR0cmlidXRlcywgQ2VzaXVtKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgcmVxdWlyZSA6ICdeYWNNYXAnLFxuICAgIGNvbnRyb2xsZXIgOiBmdW5jdGlvbigkc2NvcGUsICRhdHRycykge1xuICAgICAgdGhpcy5nZXRCaWxsYm9hcmRDb2xsZWN0aW9uID0gZ2V0QmlsbGJvYXJkQ29sbGVjdGlvbjtcblxuICAgICAgZnVuY3Rpb24gZ2V0QmlsbGJvYXJkQ29sbGVjdGlvbigpIHtcbiAgICAgICAgaWYgKCRhdHRycy5vYnNlcnZhYmxlQ29sbGVjdGlvbikge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY2Fubm90IGdldCBjb2xsZWN0aW9uIGlmIGxheWVyIGlzIGJvdW5kIHRvIE9ic2VydmFibGVDb2xsZWN0aW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICRzY29wZS5jb2xsZWN0aW9uO1xuICAgICAgfVxuICAgIH0sXG4gICAgbGluayA6IHtcbiAgICAgIHByZTogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNNYXBDdHJsKSB7XG4gICAgICAgIHNjb3BlLmNvbGxlY3Rpb24gPSBuZXcgQ2VzaXVtLkJpbGxib2FyZENvbGxlY3Rpb24oKTtcblxuICAgICAgICBpZiAoYXR0cnMub2JzZXJ2YWJsZUNvbGxlY3Rpb24pIHtcbiAgICAgICAgICB2YXIgQ09MTEVDVElPTl9SRUdFWFAgPSAvXFxzKihbXFwkXFx3XSspXFxzK2luXFxzKygoPzpbXFwkXFx3XStcXC4pKltcXCRcXHddKykvO1xuICAgICAgICAgIHZhciBtYXRjaCA9IGF0dHJzLm9ic2VydmFibGVDb2xsZWN0aW9uLm1hdGNoKENPTExFQ1RJT05fUkVHRVhQKTtcbiAgICAgICAgICB2YXIgaXRlbU5hbWUgPSBtYXRjaFsxXTtcbiAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9ICRwYXJzZShtYXRjaFsyXSkoc2NvcGUpO1xuICAgICAgICAgIGlmICghY29sbGVjdGlvbiBpbnN0YW5jZW9mIE9ic2VydmFibGVDb2xsZWN0aW9uKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ29ic2VydmFibGUtY29sbGVjdGlvbiBtdXN0IGJlIG9mIHR5cGUgT2JzZXJ2YWJsZUNvbGxlY3Rpb24uJyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjb2xsZWN0aW9uLmdldERhdGEoKSwgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgICBhZGRCaWxsYm9hcmQoaXRlbSlcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb2xsZWN0aW9uLm9uQWRkKGFkZEJpbGxib2FyZCk7XG4gICAgICAgICAgICBjb2xsZWN0aW9uLm9uVXBkYXRlKHVwZGF0ZSk7XG4gICAgICAgICAgICBjb2xsZWN0aW9uLm9uUmVtb3ZlKHJlbW92ZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3Rpb24gYWRkQmlsbGJvYXJkKGl0ZW0pIHtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0ge307XG4gICAgICAgICAgICBjb250ZXh0W2l0ZW1OYW1lXSA9IGl0ZW07XG4gICAgICAgICAgICB2YXIgYmlsbERlc2MgPSBCaWxsQm9hcmRBdHRyaWJ1dGVzLmNhbGNBdHRyaWJ1dGVzKGF0dHJzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIHJldHVybiBzY29wZS5jb2xsZWN0aW9uLmFkZChiaWxsRGVzYyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3Rpb24gdXBkYXRlKGl0ZW0sIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgYmlsbGJvYXJkID0gc2NvcGUuY29sbGVjdGlvbi5nZXQoaW5kZXgpO1xuICAgICAgICAgICAgYmlsbGJvYXJkLnBvc2l0aW9uID0gQ2VzaXVtLkNhcnRlc2lhbjMuZnJvbURlZ3JlZXMoTnVtYmVyKGl0ZW0ucG9zaXRpb24ubG9uZ2l0dWRlKSB8fCAwLCBOdW1iZXIoaXRlbS5wb3NpdGlvbi5sYXRpdHVkZSkgfHwgMCwgTnVtYmVyKGl0ZW0ucG9zaXRpb24uYWx0aXR1ZGUpIHx8IDApO1xuICAgICAgICAgICAgYmlsbGJvYXJkLmltYWdlID0gaXRlbS5pbWFnZTtcbiAgICAgICAgICAgIGJpbGxib2FyZC5jb2xvciA9IENlc2l1bS5Db2xvci5mcm9tQ3NzQ29sb3JTdHJpbmcoaXRlbS5jb2xvcik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3Rpb24gcmVtb3ZlKGl0ZW0sIGluZGV4KSB7XG4gICAgICAgICAgICBzY29wZS5jb2xsZWN0aW9uLnJlbW92ZShzY29wZS5jb2xsZWN0aW9uLmdldChpbmRleCkpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICAgICAgYWNNYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLnByaW1pdGl2ZXMuYWRkKHNjb3BlLmNvbGxlY3Rpb24pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgYWNNYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLnByaW1pdGl2ZXMucmVtb3ZlKHNjb3BlLmNvbGxlY3Rpb24pO1xuICAgICAgICB9KTtcblxuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAwOS8wMS8xNS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2FjQmlsbGJvYXJkJywgZnVuY3Rpb24oQmlsbEJvYXJkQXR0cmlidXRlcykge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0IDogJ0UnLFxuICAgIHJlcXVpcmUgOiAnXmFjQmlsbGJvYXJkc0xheWVyJyxcbiAgICBsaW5rIDogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBhY0JpbGxib2FyZHNMYXllckN0cmwpIHtcbiAgICAgIHZhciBiaWxsRGVzYyA9IEJpbGxCb2FyZEF0dHJpYnV0ZXMuY2FsY0F0dHJpYnV0ZXMoYXR0cnMsIHNjb3BlKTtcblxuICAgICAgdmFyIGJpbGxib2FyZCA9IGFjQmlsbGJvYXJkc0xheWVyQ3RybC5nZXRCaWxsYm9hcmRDb2xsZWN0aW9uKCkuYWRkKGJpbGxEZXNjKTtcblxuICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBhY0JpbGxib2FyZHNMYXllckN0cmwuZ2V0QmlsbGJvYXJkQ29sbGVjdGlvbigpLnJlbW92ZShiaWxsYm9hcmQpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59KTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBuZXRhbmVsIG9uIDE3LzAxLzE1LlxuICovXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYWNDb21wbGV4TGF5ZXInLCBmdW5jdGlvbigkbG9nKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgcmVxdWlyZSA6ICdeYWNNYXAnLFxuICAgIGNvbXBpbGUgOiBmdW5jdGlvbihlbGVtZW50LCBhdHRycykge1xuICAgICAgaWYgKGF0dHJzLm9ic2VydmFibGVDb2xsZWN0aW9uKSB7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChlbGVtZW50LmNoaWxkcmVuKCksIGZ1bmN0aW9uIChjaGlsZCkge1xuXG4gICAgICAgICAgdmFyIGxheWVyID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgaWYgKGNoaWxkLnRhZ05hbWUgPT09ICdCSUxMQk9BUkQnKSB7XG4gICAgICAgICAgICBsYXllciA9IGFuZ3VsYXIuZWxlbWVudCgnPGJpbGxib2FyZHMtbGF5ZXI+PC9iaWxsYm9hcmRzLWxheWVyPicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChjaGlsZC50YWdOYW1lID09PSAnTEFCRUwnKSB7XG4gICAgICAgICAgICBsYXllciA9IGFuZ3VsYXIuZWxlbWVudCgnPGxhYmVscy1sYXllcj48L2xhYmVscy1sYXllcj4nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIWxheWVyKSB7XG4gICAgICAgICAgICAkbG9nLndhcm4oJ0ZvdW5kIGFuIHVua25vd24gY2hpbGQgb2Ygb2YgY29tcGxleC1sYXllci4gUmVtb3ZpbmcuLi4nKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudChjaGlsZCkucmVtb3ZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNoaWxkLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgICAgICAgIGxheWVyLmF0dHIoYXR0ci5uYW1lLCBhdHRyLnZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGVsZW1lbnRbMF0uYXR0cmlidXRlcywgZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgICAgICAgICAgaWYgKCFhbmd1bGFyLmVsZW1lbnQoY2hpbGQpLmF0dHIoYXR0ci5uYW1lKSkge1xuICAgICAgICAgICAgICAgIGxheWVyLmF0dHIoYXR0ci5uYW1lLCBhdHRyLnZhbHVlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoY2hpbGQpLnJlcGxhY2VXaXRoKGxheWVyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAwOS8wMS8xNS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2FjTGFiZWwnLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICByZXF1aXJlIDogJ15hY0xhYmVsc0xheWVyJyxcbiAgICBzY29wZSA6IHtcbiAgICAgIGNvbG9yIDogJyYnLFxuICAgICAgdGV4dCA6ICcmJyxcbiAgICAgIHBvc2l0aW9uIDogJyYnXG4gICAgfSxcbiAgICBsaW5rIDogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBhY0xhYmVsc0xheWVyQ3RybCkge1xuICAgICAgdmFyIGxhYmVsRGVzYyA9IHt9O1xuXG4gICAgICB2YXIgcG9zaXRpb24gPSBzY29wZS5wb3NpdGlvbigpO1xuICAgICAgbGFiZWxEZXNjLnBvc2l0aW9uID0gQ2VzaXVtLkNhcnRlc2lhbjMuZnJvbURlZ3JlZXMoTnVtYmVyKHBvc2l0aW9uLmxvbmdpdHVkZSkgfHwgMCwgTnVtYmVyKHBvc2l0aW9uLmxhdGl0dWRlKSB8fCAwLCBOdW1iZXIocG9zaXRpb24uYWx0aXR1ZGUpIHx8IDApO1xuXG4gICAgICB2YXIgY29sb3IgPSBzY29wZS5jb2xvcigpO1xuICAgICAgaWYgKGNvbG9yKSB7XG4gICAgICAgIGxhYmVsRGVzYy5jb2xvciA9IGNvbG9yO1xuICAgICAgfVxuXG4gICAgICBsYWJlbERlc2MudGV4dCA9IHNjb3BlLnRleHQoKTtcblxuICAgICAgdmFyIGxhYmVsID0gYWNMYWJlbHNMYXllckN0cmwuZ2V0TGFiZWxDb2xsZWN0aW9uKCkuYWRkKGxhYmVsRGVzYyk7XG5cbiAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgYWNMYWJlbHNMYXllckN0cmwuZ2V0TGFiZWxDb2xsZWN0aW9uKCkucmVtb3ZlKGxhYmVsKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAwOS8wMS8xNS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2FjTGFiZWxzTGF5ZXInLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICByZXF1aXJlIDogJ15hY01hcCcsXG4gICAgc2NvcGUgOiB7fSxcbiAgICBjb250cm9sbGVyIDogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICB0aGlzLmdldExhYmVsQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJHNjb3BlLmNvbGxlY3Rpb247XG4gICAgICB9XG4gICAgfSxcbiAgICBsaW5rIDoge1xuICAgICAgcHJlOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBhY01hcEN0cmwpIHtcbiAgICAgICAgc2NvcGUuY29sbGVjdGlvbiA9IG5ldyBDZXNpdW0uTGFiZWxDb2xsZWN0aW9uKCk7XG4gICAgICAgIGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5wcmltaXRpdmVzLmFkZChzY29wZS5jb2xsZWN0aW9uKTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5wcmltaXRpdmVzLnJlbW92ZShzY29wZS5jb2xsZWN0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBuZXRhbmVsIG9uIDA5LzAxLzE1LlxuICovXG4ndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY01hcCcsIGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiBnZXRTY2VuZU1vZGUoZGltZW5zaW9ucykge1xuICAgIGlmIChkaW1lbnNpb25zID09IDIpIHtcbiAgICAgIHJldHVybiBDZXNpdW0uU2NlbmVNb2RlLlNDRU5FMkQ7XG4gICAgfVxuICAgIGVsc2UgaWYgKGRpbWVuc2lvbnMgPT0gMi41KSB7XG4gICAgICByZXR1cm4gQ2VzaXVtLlNjZW5lTW9kZS5DT0xVTUJVU19WSUVXO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBDZXNpdW0uU2NlbmVNb2RlLlNDRU5FM0Q7XG4gICAgfVxuICB9XG5cblxuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0IDogJ0UnLFxuICAgIHRlbXBsYXRlIDogJzxkaXY+IDxuZy10cmFuc2NsdWRlPjwvbmctdHJhbnNjbHVkZT4gPGRpdiBjbGFzcz1cIm1hcC1jb250YWluZXJcIj48L2Rpdj4gPC9kaXY+JyxcbiAgICB0cmFuc2NsdWRlIDogdHJ1ZSxcbiAgICBzY29wZSA6IHtcbiAgICAgIGRpbWVuc2lvbnMgOiAnQCdcbiAgICB9LFxuICAgIGNvbnRyb2xsZXIgOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgIHRoaXMuZ2V0Q2VzaXVtV2lkZ2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUuY2VzaXVtO1xuICAgICAgfVxuICAgIH0sXG4gICAgbGluayA6IHtcbiAgICAgIHByZTogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIGlmICghc2NvcGUuZGltZW5zaW9ucykge1xuICAgICAgICAgIHNjb3BlLmRpbWVuc2lvbnMgPSAzO1xuICAgICAgICB9XG5cbiAgICAgICAgc2NvcGUuY2VzaXVtID0gbmV3IENlc2l1bS5DZXNpdW1XaWRnZXQoZWxlbWVudC5maW5kKCdkaXYnKVswXSwge1xuICAgICAgICAgIHNjZW5lTW9kZTogZ2V0U2NlbmVNb2RlKHNjb3BlLmRpbWVuc2lvbnMpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGdpbG5pczIgb24gMTgvMDEvMTUuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY1BvbHlsaW5lJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgcmVxdWlyZSA6ICdeYWNQb2x5bGluZXNMYXllcicsXG4gICAgc2NvcGUgOiB7XG4gICAgICBjb2xvciA6ICcmJyxcbiAgICAgIHdpZHRoIDogJyYnLFxuICAgICAgcG9zaXRpb25zIDogJyYnXG4gICAgfSxcbiAgICBsaW5rIDogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBhY1BvbHlsaW5lc0xheWVyQ3RybCkge1xuICAgICAgdmFyIHBvbHlsaW5lRGVzYyA9IHt9O1xuXG4gICAgICBpZiAoIWFuZ3VsYXIuaXNEZWZpbmVkKHNjb3BlLnBvc2l0aW9ucykgfHwgIWFuZ3VsYXIuaXNGdW5jdGlvbihzY29wZS5wb3NpdGlvbnMpKXtcbiAgICAgICAgdGhyb3cgXCJQb2x5bGluZSBwb3NpdGlvbnMgbXVzdCBiZSBkZWZpbmVkIGFzIGEgZnVuY3Rpb25cIjtcbiAgICAgIH1cbiAgICAgIHZhciBwb3NpdGlvbnMgPSBzY29wZS5wb3NpdGlvbnMoKTtcbiAgICAgIHBvbHlsaW5lRGVzYy5wb3NpdGlvbnMgPSBbXTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChwb3NpdGlvbnMsIGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG4gICAgICAgIHBvbHlsaW5lRGVzYy5wb3NpdGlvbnMucHVzaChDZXNpdW0uQ2FydGVzaWFuMy5mcm9tRGVncmVlcyhOdW1iZXIocG9zaXRpb24ubG9uZ2l0dWRlKSB8fCAwLCBOdW1iZXIocG9zaXRpb24ubGF0aXR1ZGUpIHx8IDAsIE51bWJlcihwb3NpdGlvbi5hbHRpdHVkZSkgfHwgMCkpO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBjZXNpdW1Db2xvciA9IENlc2l1bS5Db2xvci5mcm9tQ3NzQ29sb3JTdHJpbmcoJ2JsYWNrJyk7XG4gICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQoc2NvcGUuY29sb3IpICYmIGFuZ3VsYXIuaXNGdW5jdGlvbihzY29wZS5jb2xvcikpe1xuICAgICAgICBjZXNpdW1Db2xvciA9IENlc2l1bS5Db2xvci5mcm9tQ3NzQ29sb3JTdHJpbmcoc2NvcGUuY29sb3IoKSk7XG4gICAgICAgIH1cbiAgICAgIHBvbHlsaW5lRGVzYy5tYXRlcmlhbCA9IENlc2l1bS5NYXRlcmlhbC5mcm9tVHlwZSgnQ29sb3InKTtcbiAgICAgIHBvbHlsaW5lRGVzYy5tYXRlcmlhbC51bmlmb3Jtcy5jb2xvciA9IGNlc2l1bUNvbG9yO1xuXG4gICAgICBwb2x5bGluZURlc2Mud2lkdGggPSAxO1xuICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHNjb3BlLndpZHRoKSAmJiBhbmd1bGFyLmlzRnVuY3Rpb24oc2NvcGUud2lkdGgpKXtcbiAgICAgICAgcG9seWxpbmVEZXNjLndpZHRoID0gc2NvcGUud2lkdGgoKTtcbiAgICAgIH1cblxuICAgICAgdmFyIHBvbHlsaW5lID0gYWNQb2x5bGluZXNMYXllckN0cmwuZ2V0UG9seWxpbmVDb2xsZWN0aW9uKCkuYWRkKHBvbHlsaW5lRGVzYyk7XG5cbiAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgYWNQb2x5bGluZXNMYXllckN0cmwuZ2V0UG9seWxpbmVDb2xsZWN0aW9uKCkucmVtb3ZlKHBvbHlsaW5lKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgZ2lsbmlzMiBvbiAxOC8wMS8xNS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2FjUG9seWxpbmVzTGF5ZXInLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICByZXF1aXJlIDogJ15hY01hcCcsXG4gICAgc2NvcGUgOiB7fSxcbiAgICBjb250cm9sbGVyIDogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICB0aGlzLmdldFBvbHlsaW5lQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJHNjb3BlLmNvbGxlY3Rpb247XG4gICAgICB9XG4gICAgfSxcbiAgICBsaW5rIDoge1xuICAgICAgcHJlOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBhY01hcEN0cmwpIHtcbiAgICAgICAgc2NvcGUuY29sbGVjdGlvbiA9IG5ldyBDZXNpdW0uUG9seWxpbmVDb2xsZWN0aW9uKCk7XG4gICAgICAgIGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5wcmltaXRpdmVzLmFkZChzY29wZS5jb2xsZWN0aW9uKTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5wcmltaXRpdmVzLnJlbW92ZShzY29wZS5jb2xsZWN0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBuZXRhbmVsIG9uIDA5LzAxLzE1LlxuICovXG4ndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY1dlYk1hcFNlcnZpY2VMYXllcicsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0IDogJ0UnLFxuICAgIHJlcXVpcmUgOiAnXmFjTWFwJyxcbiAgICBzY29wZSA6IHtcbiAgICAgIHVybCA6ICcmJyxcbiAgICAgIGxheWVycyA6ICcmJ1xuICAgIH0sXG4gICAgY29udHJvbGxlciA6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgIH0sXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNNYXBDdHJsKSB7XG4gICAgICB2YXIgcHJvdmlkZXIgPSBuZXcgQ2VzaXVtLldlYk1hcFNlcnZpY2VJbWFnZXJ5UHJvdmlkZXIoe1xuICAgICAgICB1cmw6IHNjb3BlLnVybCgpLFxuICAgICAgICBsYXllcnMgOiBzY29wZS5sYXllcnMoKVxuICAgICAgfSk7XG5cbiAgICAgIHZhciBsYXllciA9IGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5pbWFnZXJ5TGF5ZXJzLmFkZEltYWdlcnlQcm92aWRlcihwcm92aWRlcik7XG5cbiAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgYWNNYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLmltYWdlcnlMYXllcnMucmVtb3ZlKGxheWVyKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9