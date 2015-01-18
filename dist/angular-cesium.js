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
    result.position = Cesium.Cartesian3.fromDegrees(Number(positionAttr.latitude) || 0, Number(positionAttr.longitude) || 0, Number(positionAttr.altitude) || 0);

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
 * Created by netanel on 17/01/15.
 */
angular.module('angularCesium').directive('complexLayer', function($log) {
  return {
    restrict : 'E',
    require : '^map',
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
      labelDesc.position = Cesium.Cartesian3.fromDegrees(Number(position.latitude) || 0, Number(position.longitude) || 0, Number(position.altitude) || 0);

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

/**
 * Created by netanel on 09/01/15.
 */
angular.module('angularCesium').directive('labelsLayer', function() {
  return {
    restrict : 'E',
    require : '^map',
    scope : {},
    controller : function($scope) {
      this.getLabelCollection = function() {
        return $scope.collection;
      }
    },
    link : {
      pre: function (scope, element, attrs, mapCtrl) {
        scope.collection = new Cesium.LabelCollection();
        mapCtrl.getCesiumWidget().scene.primitives.add(scope.collection);

        scope.$on('$destroy', function () {
          mapCtrl.getCesiumWidget().scene.primitives.remove(scope.collection);
        });
      }
    }
  }
});

/**
 * Created by netanel on 09/01/15.
 */
'use strict';

angular.module('angularCesium').directive('map', function() {
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

/**
 * Created by gilnis2 on 18/01/15.
 */
angular.module('angularCesium').directive('polylinesLayer', function() {
  return {
    restrict : 'E',
    require : '^map',
    scope : {},
    controller : function($scope) {
      this.getPolylineCollection = function() {
        return $scope.collection;
      }
    },
    link : {
      pre: function (scope, element, attrs, mapCtrl) {
        scope.collection = new Cesium.PolylineCollection();
        mapCtrl.getCesiumWidget().scene.primitives.add(scope.collection);

        scope.$on('$destroy', function () {
          mapCtrl.getCesiumWidget().scene.primitives.remove(scope.collection);
        });
      }
    }
  }
});

/**
 * Created by netanel on 09/01/15.
 */
'use strict';

angular.module('angularCesium').directive('webMapServiceLayer', function() {
  return {
    restrict : 'E',
    require : '^map',
    scope : {
      url : '&',
      layers : '&'
    },
    controller : function($scope) {
    },
    link : function(scope, element, attrs, mapCtrl) {
      var provider = new Cesium.WebMapServiceImageryProvider({
        url: scope.url(),
        layers : scope.layers()
      });

      var layer = mapCtrl.getCesiumWidget().scene.imageryLayers.addImageryProvider(provider);

      scope.$on('$destroy', function() {
        mapCtrl.getCesiumWidget().scene.imageryLayers.remove(layer);
      });
    }
  };
});

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

/**
 * Created by netanel on 09/01/15.
 */
angular.module('angularCesium').directive('billboardsLayer', function($parse, ObservableCollection, BillBoardAttributes, Cesium) {
  return {
    restrict : 'E',
    require : '^map',
    controller : function($scope, $attrs) {
      this.getBillboardCollection = function() {
        if ($attrs.observableCollection) {
          throw new Error('cannot get collection if layer is bound to ObservableCollection');
        }

        return $scope.collection;
      }
    },
    link : {
      pre: function (scope, element, attrs, mapCtrl) {
        scope.collection = new Cesium.BillboardCollection();
        if (attrs.observableCollection) {
          var COLLECTION_REGEXP = /\s*([\$\w][\$\w]*)\s+in\s+([\$\w][\$\w]*)/;
          var match = attrs.observableCollection.match(COLLECTION_REGEXP);
          var itemName = match[1];
          var collection = $parse(match[2])(scope);
          if (!collection instanceof ObservableCollection) {
            throw new Error('observable-collection must be of type ObservableCollection.');
          }
          else {
            var addBillboard = function(item) {
              var context = {};
              context[itemName] = item;
              var billDesc = BillBoardAttributes.calcAttributes(attrs, context);

              scope.collection.add(billDesc);
            };

            angular.forEach(collection.getData(), function(item) {
              addBillboard(item)
            });
            collection.onAdd(addBillboard);
            collection.onUpdate(function(item, index) {

            });
            collection.onRemove(function(item, index) {
              scope.collection.remove(scope.collection.get(index));
            });
          }
        }

        mapCtrl.getCesiumWidget().scene.primitives.add(scope.collection);

        scope.$on('$destroy', function () {
          mapCtrl.getCesiumWidget().scene.primitives.remove(scope.collection);
        });
      }
    }
  }
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi5qcyIsInNlcnZpY2VzL2JpbGxib2FyZC1hdHRycy5qcyIsInNlcnZpY2VzL2Nlc2l1bS5qcyIsIm1hcC1jb21wb25lbnRzL2NvbXBsZXgtbGF5ZXIvY29tcGxleC1sYXllci5qcyIsIm1hcC1jb21wb25lbnRzL2xhYmVsL2xhYmVsLmpzIiwibWFwLWNvbXBvbmVudHMvbGFiZWxzLWxheWVyL2xhYmVscy1sYXllci5qcyIsIm1hcC1jb21wb25lbnRzL21hcC9tYXAtZGlyZWN0aXZlLmpzIiwibWFwLWNvbXBvbmVudHMvcG9seWxpbmUvcG9seWxpbmUuanMiLCJtYXAtY29tcG9uZW50cy9wb2x5bGluZXMtbGF5ZXIvcG9seWxpbmVzLWxheWVyLmpzIiwibWFwLWNvbXBvbmVudHMvd2ViLW1hcC1zZXJ2aWNlLWxheWVyL3dlYi1tYXAtc2VydmljZS1sYXllci5qcyIsIm1hcC1jb21wb25lbnRzL2JpbGxib2FyZC9iaWxsYm9hcmQuanMiLCJtYXAtY29tcG9uZW50cy9iaWxsYm9hcmRzLWxheWVyL2JpbGxib2FyZHMtbGF5ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFuZ3VsYXItY2VzaXVtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAxMC8wMS8xNS5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJywgWydvYnNlcnZhYmxlQ29sbGVjdGlvbiddKTsiLCIvKipcclxuICogQ3JlYXRlZCBieSBuZXRhbmVsIG9uIDEwLzAxLzE1LlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5zZXJ2aWNlKCdCaWxsQm9hcmRBdHRyaWJ1dGVzJywgZnVuY3Rpb24oJHBhcnNlKSB7XHJcbiAgdGhpcy5jYWxjQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGF0dHJzLCBjb250ZXh0KSB7XHJcbiAgICB2YXIgcmVzdWx0ID0ge1xyXG4gICAgICBpbWFnZSA6ICRwYXJzZShhdHRycy5pbWFnZSkoY29udGV4dClcclxuICAgIH07XHJcbiAgICB2YXIgcG9zaXRpb25BdHRyID0gJHBhcnNlKGF0dHJzLnBvc2l0aW9uKShjb250ZXh0KTtcclxuICAgIHJlc3VsdC5wb3NpdGlvbiA9IENlc2l1bS5DYXJ0ZXNpYW4zLmZyb21EZWdyZWVzKE51bWJlcihwb3NpdGlvbkF0dHIubGF0aXR1ZGUpIHx8IDAsIE51bWJlcihwb3NpdGlvbkF0dHIubG9uZ2l0dWRlKSB8fCAwLCBOdW1iZXIocG9zaXRpb25BdHRyLmFsdGl0dWRlKSB8fCAwKTtcclxuXHJcbiAgICB2YXIgY29sb3IgPSAkcGFyc2UoYXR0cnMuY29sb3IpKGNvbnRleHQpO1xyXG4gICAgaWYgKGNvbG9yKSB7XHJcbiAgICAgIHJlc3VsdC5jb2xvciA9IENlc2l1bS5Db2xvci5mcm9tQ3NzQ29sb3JTdHJpbmcoY29sb3IpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9O1xyXG59KTtcclxuIiwiLyoqXHJcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAxMC8wMS8xNS5cclxuICovXHJcbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZmFjdG9yeSgnQ2VzaXVtJywgZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIENlc2l1bTtcclxufSk7XHJcbiIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMTcvMDEvMTUuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnY29tcGxleExheWVyJywgZnVuY3Rpb24oJGxvZykge1xyXG4gIHJldHVybiB7XHJcbiAgICByZXN0cmljdCA6ICdFJyxcclxuICAgIHJlcXVpcmUgOiAnXm1hcCcsXHJcbiAgICBjb21waWxlIDogZnVuY3Rpb24oZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgaWYgKGF0dHJzLm9ic2VydmFibGVDb2xsZWN0aW9uKSB7XHJcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGVsZW1lbnQuY2hpbGRyZW4oKSwgZnVuY3Rpb24gKGNoaWxkKSB7XHJcblxyXG4gICAgICAgICAgdmFyIGxheWVyID0gdW5kZWZpbmVkO1xyXG5cclxuICAgICAgICAgIGlmIChjaGlsZC50YWdOYW1lID09PSAnQklMTEJPQVJEJykge1xyXG4gICAgICAgICAgICBsYXllciA9IGFuZ3VsYXIuZWxlbWVudCgnPGJpbGxib2FyZHMtbGF5ZXI+PC9iaWxsYm9hcmRzLWxheWVyPicpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSBpZiAoY2hpbGQudGFnTmFtZSA9PT0gJ0xBQkVMJykge1xyXG4gICAgICAgICAgICBsYXllciA9IGFuZ3VsYXIuZWxlbWVudCgnPGxhYmVscy1sYXllcj48L2xhYmVscy1sYXllcj4nKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAoIWxheWVyKSB7XHJcbiAgICAgICAgICAgICRsb2cud2FybignRm91bmQgYW4gdW5rbm93biBjaGlsZCBvZiBvZiBjb21wbGV4LWxheWVyLiBSZW1vdmluZy4uLicpO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoY2hpbGQpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjaGlsZC5hdHRyaWJ1dGVzLCBmdW5jdGlvbiAoYXR0cikge1xyXG4gICAgICAgICAgICAgIGxheWVyLmF0dHIoYXR0ci5uYW1lLCBhdHRyLnZhbHVlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChlbGVtZW50WzBdLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uIChhdHRyKSB7XHJcbiAgICAgICAgICAgICAgaWYgKCFhbmd1bGFyLmVsZW1lbnQoY2hpbGQpLmF0dHIoYXR0ci5uYW1lKSkge1xyXG4gICAgICAgICAgICAgICAgbGF5ZXIuYXR0cihhdHRyLm5hbWUsIGF0dHIudmFsdWUpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudChjaGlsZCkucmVwbGFjZVdpdGgobGF5ZXIpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59KTsiLCIvKipcclxuICogQ3JlYXRlZCBieSBuZXRhbmVsIG9uIDA5LzAxLzE1LlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2xhYmVsJywgZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHJlc3RyaWN0IDogJ0UnLFxyXG4gICAgcmVxdWlyZSA6ICdebGFiZWxzTGF5ZXInLFxyXG4gICAgc2NvcGUgOiB7XHJcbiAgICAgIGNvbG9yIDogJyYnLFxyXG4gICAgICB0ZXh0IDogJyYnLFxyXG4gICAgICBwb3NpdGlvbiA6ICcmJ1xyXG4gICAgfSxcclxuICAgIGxpbmsgOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGxhYmVsc0xheWVyQ3RybCkge1xyXG4gICAgICB2YXIgbGFiZWxEZXNjID0ge307XHJcblxyXG4gICAgICB2YXIgcG9zaXRpb24gPSBzY29wZS5wb3NpdGlvbigpO1xyXG4gICAgICBsYWJlbERlc2MucG9zaXRpb24gPSBDZXNpdW0uQ2FydGVzaWFuMy5mcm9tRGVncmVlcyhOdW1iZXIocG9zaXRpb24ubGF0aXR1ZGUpIHx8IDAsIE51bWJlcihwb3NpdGlvbi5sb25naXR1ZGUpIHx8IDAsIE51bWJlcihwb3NpdGlvbi5hbHRpdHVkZSkgfHwgMCk7XHJcblxyXG4gICAgICB2YXIgY29sb3IgPSBzY29wZS5jb2xvcigpO1xyXG4gICAgICBpZiAoY29sb3IpIHtcclxuICAgICAgICBsYWJlbERlc2MuY29sb3IgPSBjb2xvcjtcclxuICAgICAgfVxyXG5cclxuICAgICAgbGFiZWxEZXNjLnRleHQgPSBzY29wZS50ZXh0KCk7XHJcblxyXG4gICAgICB2YXIgbGFiZWwgPSBsYWJlbHNMYXllckN0cmwuZ2V0TGFiZWxDb2xsZWN0aW9uKCkuYWRkKGxhYmVsRGVzYyk7XHJcblxyXG4gICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgbGFiZWxzTGF5ZXJDdHJsLmdldExhYmVsQ29sbGVjdGlvbigpLnJlbW92ZShsYWJlbCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMDkvMDEvMTUuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnbGFiZWxzTGF5ZXInLCBmdW5jdGlvbigpIHtcclxuICByZXR1cm4ge1xyXG4gICAgcmVzdHJpY3QgOiAnRScsXHJcbiAgICByZXF1aXJlIDogJ15tYXAnLFxyXG4gICAgc2NvcGUgOiB7fSxcclxuICAgIGNvbnRyb2xsZXIgOiBmdW5jdGlvbigkc2NvcGUpIHtcclxuICAgICAgdGhpcy5nZXRMYWJlbENvbGxlY3Rpb24gPSBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gJHNjb3BlLmNvbGxlY3Rpb247XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBsaW5rIDoge1xyXG4gICAgICBwcmU6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1hcEN0cmwpIHtcclxuICAgICAgICBzY29wZS5jb2xsZWN0aW9uID0gbmV3IENlc2l1bS5MYWJlbENvbGxlY3Rpb24oKTtcclxuICAgICAgICBtYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLnByaW1pdGl2ZXMuYWRkKHNjb3BlLmNvbGxlY3Rpb24pO1xyXG5cclxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgbWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5wcmltaXRpdmVzLnJlbW92ZShzY29wZS5jb2xsZWN0aW9uKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMDkvMDEvMTUuXHJcbiAqL1xyXG4ndXNlIHN0cmljdCc7XHJcblxyXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnbWFwJywgZnVuY3Rpb24oKSB7XHJcbiAgZnVuY3Rpb24gZ2V0U2NlbmVNb2RlKGRpbWVuc2lvbnMpIHtcclxuICAgIGlmIChkaW1lbnNpb25zID09IDIpIHtcclxuICAgICAgcmV0dXJuIENlc2l1bS5TY2VuZU1vZGUuU0NFTkUyRDtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGRpbWVuc2lvbnMgPT0gMi41KSB7XHJcbiAgICAgIHJldHVybiBDZXNpdW0uU2NlbmVNb2RlLkNPTFVNQlVTX1ZJRVc7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgcmV0dXJuIENlc2l1bS5TY2VuZU1vZGUuU0NFTkUzRDtcclxuICAgIH1cclxuICB9XHJcblxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcmVzdHJpY3QgOiAnRScsXHJcbiAgICB0ZW1wbGF0ZSA6ICc8ZGl2PiA8bmctdHJhbnNjbHVkZT48L25nLXRyYW5zY2x1ZGU+IDxkaXYgY2xhc3M9XCJtYXAtY29udGFpbmVyXCI+PC9kaXY+IDwvZGl2PicsXHJcbiAgICB0cmFuc2NsdWRlIDogdHJ1ZSxcclxuICAgIHNjb3BlIDoge1xyXG4gICAgICBkaW1lbnNpb25zIDogJ0AnXHJcbiAgICB9LFxyXG4gICAgY29udHJvbGxlciA6IGZ1bmN0aW9uKCRzY29wZSkge1xyXG4gICAgICB0aGlzLmdldENlc2l1bVdpZGdldCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiAkc2NvcGUuY2VzaXVtO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgbGluayA6IHtcclxuICAgICAgcHJlOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQpIHtcclxuICAgICAgICBpZiAoIXNjb3BlLmRpbWVuc2lvbnMpIHtcclxuICAgICAgICAgIHNjb3BlLmRpbWVuc2lvbnMgPSAzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuY2VzaXVtID0gbmV3IENlc2l1bS5DZXNpdW1XaWRnZXQoZWxlbWVudC5maW5kKCdkaXYnKVswXSwge1xyXG4gICAgICAgICAgc2NlbmVNb2RlOiBnZXRTY2VuZU1vZGUoc2NvcGUuZGltZW5zaW9ucylcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH07XHJcbn0pO1xyXG4iLCIvKipcclxuICogQ3JlYXRlZCBieSBnaWxuaXMyIG9uIDE4LzAxLzE1LlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ3BvbHlsaW5lJywgZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHJlc3RyaWN0IDogJ0UnLFxyXG4gICAgcmVxdWlyZSA6ICdecG9seWxpbmVzTGF5ZXInLFxyXG4gICAgc2NvcGUgOiB7XHJcbiAgICAgIGNvbG9yIDogJyYnLFxyXG4gICAgICB3aWR0aCA6ICcmJyxcclxuICAgICAgcG9zaXRpb25zIDogJyYnXHJcbiAgICB9LFxyXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgcG9seWxpbmVzTGF5ZXJDdHJsKSB7XHJcbiAgICAgIHZhciBwb2x5bGluZURlc2MgPSB7fTtcclxuXHJcbiAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChzY29wZS5wb3NpdGlvbnMpIHx8IGFuZ3VsYXIuaXNGdW5jdGlvbihzY29wZS5wb3NpdGlvbnMpKXtcclxuICAgICAgICB0aHJvdyBcIlBvbHlsaW5lIHBvc2l0aW9ucyBtdXN0IGJlIGRlZmluZWQgYXMgYSBmdW5jdGlvblwiO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciBwb3NpdGlvbnMgPSBzY29wZS5wb3NpdGlvbnMoKTtcclxuICAgICAgYW5ndWxhci5mb3JFYWNoKHBvc2l0aW9ucywgZnVuY3Rpb24ocG9zaXRpb24pIHtcclxuICAgICAgICBwb2x5bGluZURlc2MucG9zaXRpb25zLnB1c2goQ2VzaXVtLkNhcnRlc2lhbjMuZnJvbURlZ3JlZXMoTnVtYmVyKHBvc2l0aW9uLmxhdGl0dWRlKSB8fCAwLCBOdW1iZXIocG9zaXRpb24ubG9uZ2l0dWRlKSB8fCAwLCBOdW1iZXIocG9zaXRpb24uYWx0aXR1ZGUpIHx8IDApKTtcclxuICAgICAgfSlcclxuXHJcbiAgICAgIHBvbHlsaW5lRGVzYy5jb2xvciA9IENlc2l1bS5Db2xvci5mcm9tQ3NzQ29sb3JTdHJpbmcoJ2JsYWNrJyk7XHJcbiAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChzY29wZS5jb2xvcikgJiYgYW5ndWxhci5pc0Z1bmN0aW9uKHNjb3BlLmNvbG9yKSl7XHJcbiAgICAgICAgICBwb2x5bGluZURlc2MuY29sb3IgPSBzY29wZS5jb2xvcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgIHBvbHlsaW5lRGVzYy53aWR0aCA9IDE7XHJcbiAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChzY29wZS53aWR0aCkgJiYgYW5ndWxhci5pc0Z1bmN0aW9uKHNjb3BlLndpZHRoKSl7XHJcbiAgICAgICAgcG9seWxpbmVEZXNjLndpZHRoID0gc2NvcGUud2lkdGgoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIHBvbHlsaW5lID0gcG9seWxpbmVzTGF5ZXJDdHJsLmdldFBvbHlsaW5lQ29sbGVjdGlvbigpLmFkZChwb2x5bGluZURlc2MpO1xyXG5cclxuICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHBvbHlsaW5lc0xheWVyQ3RybC5nZXRQb2x5bGluZUNvbGxlY3Rpb24oKS5yZW1vdmUocG9seWxpbmUpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG4iLCIvKipcclxuICogQ3JlYXRlZCBieSBnaWxuaXMyIG9uIDE4LzAxLzE1LlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ3BvbHlsaW5lc0xheWVyJywgZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHJlc3RyaWN0IDogJ0UnLFxyXG4gICAgcmVxdWlyZSA6ICdebWFwJyxcclxuICAgIHNjb3BlIDoge30sXHJcbiAgICBjb250cm9sbGVyIDogZnVuY3Rpb24oJHNjb3BlKSB7XHJcbiAgICAgIHRoaXMuZ2V0UG9seWxpbmVDb2xsZWN0aW9uID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuICRzY29wZS5jb2xsZWN0aW9uO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgbGluayA6IHtcclxuICAgICAgcHJlOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtYXBDdHJsKSB7XHJcbiAgICAgICAgc2NvcGUuY29sbGVjdGlvbiA9IG5ldyBDZXNpdW0uUG9seWxpbmVDb2xsZWN0aW9uKCk7XHJcbiAgICAgICAgbWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5wcmltaXRpdmVzLmFkZChzY29wZS5jb2xsZWN0aW9uKTtcclxuXHJcbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIG1hcEN0cmwuZ2V0Q2VzaXVtV2lkZ2V0KCkuc2NlbmUucHJpbWl0aXZlcy5yZW1vdmUoc2NvcGUuY29sbGVjdGlvbik7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG4iLCIvKipcclxuICogQ3JlYXRlZCBieSBuZXRhbmVsIG9uIDA5LzAxLzE1LlxyXG4gKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG5cclxuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ3dlYk1hcFNlcnZpY2VMYXllcicsIGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiB7XHJcbiAgICByZXN0cmljdCA6ICdFJyxcclxuICAgIHJlcXVpcmUgOiAnXm1hcCcsXHJcbiAgICBzY29wZSA6IHtcclxuICAgICAgdXJsIDogJyYnLFxyXG4gICAgICBsYXllcnMgOiAnJidcclxuICAgIH0sXHJcbiAgICBjb250cm9sbGVyIDogZnVuY3Rpb24oJHNjb3BlKSB7XHJcbiAgICB9LFxyXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbWFwQ3RybCkge1xyXG4gICAgICB2YXIgcHJvdmlkZXIgPSBuZXcgQ2VzaXVtLldlYk1hcFNlcnZpY2VJbWFnZXJ5UHJvdmlkZXIoe1xyXG4gICAgICAgIHVybDogc2NvcGUudXJsKCksXHJcbiAgICAgICAgbGF5ZXJzIDogc2NvcGUubGF5ZXJzKClcclxuICAgICAgfSk7XHJcblxyXG4gICAgICB2YXIgbGF5ZXIgPSBtYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLmltYWdlcnlMYXllcnMuYWRkSW1hZ2VyeVByb3ZpZGVyKHByb3ZpZGVyKTtcclxuXHJcbiAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcclxuICAgICAgICBtYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLmltYWdlcnlMYXllcnMucmVtb3ZlKGxheWVyKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfTtcclxufSk7XHJcbiIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMDkvMDEvMTUuXHJcbiAqL1xyXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYmlsbGJvYXJkJywgZnVuY3Rpb24oQmlsbEJvYXJkQXR0cmlidXRlcykge1xyXG4gIHJldHVybiB7XHJcbiAgICByZXN0cmljdCA6ICdFJyxcclxuICAgIHJlcXVpcmUgOiAnXmJpbGxib2FyZHNMYXllcicsXHJcbiAgICBsaW5rIDogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBiaWxsYm9hcmRzTGF5ZXJDdHJsKSB7XHJcbiAgICAgIHZhciBiaWxsRGVzYyA9IEJpbGxCb2FyZEF0dHJpYnV0ZXMuY2FsY0F0dHJpYnV0ZXMoYXR0cnMsIHNjb3BlKTtcclxuXHJcbiAgICAgIHZhciBiaWxsYm9hcmQgPSBiaWxsYm9hcmRzTGF5ZXJDdHJsLmdldEJpbGxib2FyZENvbGxlY3Rpb24oKS5hZGQoYmlsbERlc2MpO1xyXG5cclxuICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGJpbGxib2FyZHNMYXllckN0cmwuZ2V0QmlsbGJvYXJkQ29sbGVjdGlvbigpLnJlbW92ZShiaWxsYm9hcmQpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG4iLCIvKipcclxuICogQ3JlYXRlZCBieSBuZXRhbmVsIG9uIDA5LzAxLzE1LlxyXG4gKi9cclxuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2JpbGxib2FyZHNMYXllcicsIGZ1bmN0aW9uKCRwYXJzZSwgT2JzZXJ2YWJsZUNvbGxlY3Rpb24sIEJpbGxCb2FyZEF0dHJpYnV0ZXMsIENlc2l1bSkge1xyXG4gIHJldHVybiB7XHJcbiAgICByZXN0cmljdCA6ICdFJyxcclxuICAgIHJlcXVpcmUgOiAnXm1hcCcsXHJcbiAgICBjb250cm9sbGVyIDogZnVuY3Rpb24oJHNjb3BlLCAkYXR0cnMpIHtcclxuICAgICAgdGhpcy5nZXRCaWxsYm9hcmRDb2xsZWN0aW9uID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgaWYgKCRhdHRycy5vYnNlcnZhYmxlQ29sbGVjdGlvbikge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgZ2V0IGNvbGxlY3Rpb24gaWYgbGF5ZXIgaXMgYm91bmQgdG8gT2JzZXJ2YWJsZUNvbGxlY3Rpb24nKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAkc2NvcGUuY29sbGVjdGlvbjtcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIGxpbmsgOiB7XHJcbiAgICAgIHByZTogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbWFwQ3RybCkge1xyXG4gICAgICAgIHNjb3BlLmNvbGxlY3Rpb24gPSBuZXcgQ2VzaXVtLkJpbGxib2FyZENvbGxlY3Rpb24oKTtcclxuICAgICAgICBpZiAoYXR0cnMub2JzZXJ2YWJsZUNvbGxlY3Rpb24pIHtcclxuICAgICAgICAgIHZhciBDT0xMRUNUSU9OX1JFR0VYUCA9IC9cXHMqKFtcXCRcXHddW1xcJFxcd10qKVxccytpblxccysoW1xcJFxcd11bXFwkXFx3XSopLztcclxuICAgICAgICAgIHZhciBtYXRjaCA9IGF0dHJzLm9ic2VydmFibGVDb2xsZWN0aW9uLm1hdGNoKENPTExFQ1RJT05fUkVHRVhQKTtcclxuICAgICAgICAgIHZhciBpdGVtTmFtZSA9IG1hdGNoWzFdO1xyXG4gICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSAkcGFyc2UobWF0Y2hbMl0pKHNjb3BlKTtcclxuICAgICAgICAgIGlmICghY29sbGVjdGlvbiBpbnN0YW5jZW9mIE9ic2VydmFibGVDb2xsZWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignb2JzZXJ2YWJsZS1jb2xsZWN0aW9uIG11c3QgYmUgb2YgdHlwZSBPYnNlcnZhYmxlQ29sbGVjdGlvbi4nKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgYWRkQmlsbGJvYXJkID0gZnVuY3Rpb24oaXRlbSkge1xyXG4gICAgICAgICAgICAgIHZhciBjb250ZXh0ID0ge307XHJcbiAgICAgICAgICAgICAgY29udGV4dFtpdGVtTmFtZV0gPSBpdGVtO1xyXG4gICAgICAgICAgICAgIHZhciBiaWxsRGVzYyA9IEJpbGxCb2FyZEF0dHJpYnV0ZXMuY2FsY0F0dHJpYnV0ZXMoYXR0cnMsIGNvbnRleHQpO1xyXG5cclxuICAgICAgICAgICAgICBzY29wZS5jb2xsZWN0aW9uLmFkZChiaWxsRGVzYyk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY29sbGVjdGlvbi5nZXREYXRhKCksIGZ1bmN0aW9uKGl0ZW0pIHtcclxuICAgICAgICAgICAgICBhZGRCaWxsYm9hcmQoaXRlbSlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNvbGxlY3Rpb24ub25BZGQoYWRkQmlsbGJvYXJkKTtcclxuICAgICAgICAgICAgY29sbGVjdGlvbi5vblVwZGF0ZShmdW5jdGlvbihpdGVtLCBpbmRleCkge1xyXG5cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNvbGxlY3Rpb24ub25SZW1vdmUoZnVuY3Rpb24oaXRlbSwgaW5kZXgpIHtcclxuICAgICAgICAgICAgICBzY29wZS5jb2xsZWN0aW9uLnJlbW92ZShzY29wZS5jb2xsZWN0aW9uLmdldChpbmRleCkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1hcEN0cmwuZ2V0Q2VzaXVtV2lkZ2V0KCkuc2NlbmUucHJpbWl0aXZlcy5hZGQoc2NvcGUuY29sbGVjdGlvbik7XHJcblxyXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBtYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLnByaW1pdGl2ZXMucmVtb3ZlKHNjb3BlLmNvbGxlY3Rpb24pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9