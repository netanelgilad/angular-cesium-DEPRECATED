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
 * Created by bipol on 01/20/16.
 */
'use strict';

angular.module('angularCesium').directive('acBaseLayerPicker', function() {
  return {
    restrict : 'E',
    require : '^acMap',
    transclude: true,
    template : '<div id="baseLayerPickerContainer" style="position:absolute;top:24px;right:24px;width:38px;height:38px;"><div ng-transclude></div></div>',
    controller : function($scope) {
      this.getProviderViewModels = getProviderViewModels;
      this.pushProviderViewModel = pushProviderViewModel;
      this.getImageryViewModels = getImageryViewModels;
      this.getTerrainViewModels = getTerrainViewModels;

      function getTerrainViewModels() {
        return $scope.providerViewModels.terrainProviderViewModels;
      }
      function getImageryViewModels() {
        return $scope.providerViewModels.imageryProviderViewModels;
      }
      function getProviderViewModels() {
        return $scope.providerViewModels;
      }
      function pushProviderViewModel(key,item) {
        $scope.providerViewModels[key].push(item);
      }
    },
    link :{
      pre: function(scope, element, attrs, acMapCtrl) {
        scope.providerViewModels = {
          imageryProviderViewModels: [],
          terrainProviderViewModels: [],
        };
        scope.baseLayerPicker = null;

        scope.$on('$destroy', function() {
          acMapCtrl.getCesiumWidget().baseLayerPicker.destroy();
        });
      },
      post: function(scope, element, attrs, acMapCtrl) {
        scope.$watch(function() { return scope.providerViewModels }, function(val) {
            if (!scope.baseLayerPicker) {
              scope.baseLayerPicker = new Cesium.BaseLayerPicker('baseLayerPickerContainer', {
                  globe : acMapCtrl.getCesiumWidget().scene.globe,
                  imageryProviderViewModels : scope.providerViewModels.imageryProviderViewModels,
                  terrainProviderViewModels : scope.providerViewModels.terrainProviderViewModels
              });
            } else {
              scope.baseLayerPicker.destroy();
              scope.baseLayerPicker = new Cesium.BaseLayerPicker('baseLayerPickerContainer', {
                  globe : acMapCtrl.getCesiumWidget().scene.globe,
                  imageryProviderViewModels : scope.providerViewModels.imageryProviderViewModels,
                  terrainProviderViewModels : scope.providerViewModels.terrainProviderViewModels
              });
            }
        }, true);
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
 * Created by bipol on 01/20/16.
 */

angular.module('angularCesium').directive('acGeocoder', function() {
  'use strict';
  return {
    restrict : 'E',
    require : '^acMap',
    transclude: true,
    template : '<div id="geocoderContainer" class="cesium-viewer-geocoderContainer"></div>',
    controller : function($scope) {
    },
    link :{
      pre: function(scope, element, attrs, acMapCtrl) {
        scope.geocoder = null;

        scope.geocoder = new Cesium.Geocoder({
          container: 'geocoderContainer',
          scene: acMapCtrl.getCesiumWidget().scene,
        });

        scope.$on('$destroy', function() {
          acMapCtrl.getCesiumWidget().geocoder.destroy();
        });
      },
    }
  }
});

/**
 * Created by bipol on 01/20/16.
 */
'use strict';

angular.module('angularCesium').directive('acImageryViewModels', function() {
  return {
    restrict : 'E',
    require : '^acBaseLayerPicker',
    scope : {
      name: '&',
      iconUrl: '&',
      tooltip: '&',
      creationFunction: '&'
    },
    controller: function($scope, Cesium) {
      $scope.cesiumFactory = Cesium;
    },
    link : function(scope, element, attrs, acBaseLayerPickerCtrl) {
      var item = new scope.cesiumFactory.ProviderViewModel({
        name: scope.name(),
        iconUrl: scope.iconUrl(),
        tooltip: scope.tooltip(),
        creationFunction: scope.creationFunction
      });

      acBaseLayerPickerCtrl.pushProviderViewModel('imageryProviderViewModels', item);

      scope.$on('$destroy', function() {
        angular.forEach(acBaseLayerPickerCtrl.getImageryViewModels(), function(val, key) {
          // remove the element
          if (val === provider) {
            acBaseLayerPickerCtrl.getImageryViewModels().splice(key, 1);
          }
        });
      });
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

  function getImageryProviderBoolean(bool) {
    if (bool == 'false') {
      return false
    } else {
      return true;
    }
  }
  return {
    restrict : 'E',
    template : '<div> <ng-transclude></ng-transclude> <div class="map-container"></div> </div>',
    transclude : true,
    scope : {
      dimensions : '@',
      imageryProvider : '@'
    },
    controller : function($scope, $element) {
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
          sceneMode: getSceneMode(scope.dimensions),
          imageryProvider: getImageryProviderBoolean(scope.imageryProvider)
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
 * Created by bipol on 01/25/16.
 */
'use strict';

angular.module('angularCesium').directive('acTerrainViewModels', function() {
  return {
    restrict : 'E',
    require : '^acBaseLayerPicker',
    scope : {
      name: '&',
      iconUrl: '&',
      tooltip: '&',
      creationFunction: '&'
    },
    controller: function($scope, Cesium) {
      $scope.cesiumFactory = Cesium;
    },
    link : function(scope, element, attrs, acBaseLayerPickerCtrl) {
      var item = new scope.cesiumFactory.ProviderViewModel({
        name: scope.name(),
        iconUrl: scope.iconUrl(),
        tooltip: scope.tooltip(),
        creationFunction: scope.creationFunction
      });

      acBaseLayerPickerCtrl.pushProviderViewModel('terrainProviderViewModels', item);

      scope.$on('$destroy', function() {
        angular.forEach(acBaseLayerPickerCtrl.getTerrainViewModels(), function(val, key) {
          // remove the element
          if (val === provider) {
            acBaseLayerPickerCtrl.getTerrainViewModels().splice(key, 1);
          }
        });
      });
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi5qcyIsInNlcnZpY2VzL2JpbGxib2FyZC1hdHRycy5qcyIsInNlcnZpY2VzL2Nlc2l1bS5qcyIsIm1hcC1jb21wb25lbnRzL2JpbGxib2FyZC9iaWxsYm9hcmQuanMiLCJtYXAtY29tcG9uZW50cy9iYXNlLWxheWVyLXBpY2tlci9iYXNlLWxheWVyLXBpY2tlci5qcyIsIm1hcC1jb21wb25lbnRzL2NvbXBsZXgtbGF5ZXIvY29tcGxleC1sYXllci5qcyIsIm1hcC1jb21wb25lbnRzL2JpbGxib2FyZHMtbGF5ZXIvYmlsbGJvYXJkcy1sYXllci5qcyIsIm1hcC1jb21wb25lbnRzL2dlb2NvZGVyL2dlb2NvZGVyLmpzIiwibWFwLWNvbXBvbmVudHMvaW1hZ2VyeS12aWV3LW1vZGVscy9pbWFnZXJ5LXZpZXctbW9kZWxzLmpzIiwibWFwLWNvbXBvbmVudHMvbGFiZWwvbGFiZWwuanMiLCJtYXAtY29tcG9uZW50cy9sYWJlbHMtbGF5ZXIvbGFiZWxzLWxheWVyLmpzIiwibWFwLWNvbXBvbmVudHMvbWFwL21hcC1kaXJlY3RpdmUuanMiLCJtYXAtY29tcG9uZW50cy9wb2x5bGluZS9wb2x5bGluZS5qcyIsIm1hcC1jb21wb25lbnRzL3BvbHlsaW5lcy1sYXllci9wb2x5bGluZXMtbGF5ZXIuanMiLCJtYXAtY29tcG9uZW50cy90ZXJyYWluLXZpZXctbW9kZWwvdGVycmFpbi12aWV3LW1vZGVsLmpzIiwibWFwLWNvbXBvbmVudHMvd2ViLW1hcC1zZXJ2aWNlLWxheWVyL3dlYi1tYXAtc2VydmljZS1sYXllci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYW5ndWxhci1jZXNpdW0uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAxMC8wMS8xNS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nLCBbJ29ic2VydmFibGVDb2xsZWN0aW9uJ10pOyIsIi8qKlxuICogQ3JlYXRlZCBieSBuZXRhbmVsIG9uIDEwLzAxLzE1LlxuICovXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLnNlcnZpY2UoJ0JpbGxCb2FyZEF0dHJpYnV0ZXMnLCBmdW5jdGlvbigkcGFyc2UpIHtcbiAgdGhpcy5jYWxjQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGF0dHJzLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgIGltYWdlIDogJHBhcnNlKGF0dHJzLmltYWdlKShjb250ZXh0KVxuICAgIH07XG4gICAgdmFyIHBvc2l0aW9uQXR0ciA9ICRwYXJzZShhdHRycy5wb3NpdGlvbikoY29udGV4dCk7XG4gICAgcmVzdWx0LnBvc2l0aW9uID0gQ2VzaXVtLkNhcnRlc2lhbjMuZnJvbURlZ3JlZXMoTnVtYmVyKHBvc2l0aW9uQXR0ci5sb25naXR1ZGUpIHx8IDAsIE51bWJlcihwb3NpdGlvbkF0dHIubGF0aXR1ZGUpIHx8IDAsIE51bWJlcihwb3NpdGlvbkF0dHIuYWx0aXR1ZGUpIHx8IDApO1xuXG4gICAgdmFyIGNvbG9yID0gJHBhcnNlKGF0dHJzLmNvbG9yKShjb250ZXh0KTtcbiAgICBpZiAoY29sb3IpIHtcbiAgICAgIHJlc3VsdC5jb2xvciA9IENlc2l1bS5Db2xvci5mcm9tQ3NzQ29sb3JTdHJpbmcoY29sb3IpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAxMC8wMS8xNS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5mYWN0b3J5KCdDZXNpdW0nLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIENlc2l1bTtcbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMDkvMDEvMTUuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY0JpbGxib2FyZCcsIGZ1bmN0aW9uKEJpbGxCb2FyZEF0dHJpYnV0ZXMpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICByZXF1aXJlIDogJ15hY0JpbGxib2FyZHNMYXllcicsXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNCaWxsYm9hcmRzTGF5ZXJDdHJsKSB7XG4gICAgICB2YXIgYmlsbERlc2MgPSBCaWxsQm9hcmRBdHRyaWJ1dGVzLmNhbGNBdHRyaWJ1dGVzKGF0dHJzLCBzY29wZSk7XG5cbiAgICAgIHZhciBiaWxsYm9hcmQgPSBhY0JpbGxib2FyZHNMYXllckN0cmwuZ2V0QmlsbGJvYXJkQ29sbGVjdGlvbigpLmFkZChiaWxsRGVzYyk7XG5cbiAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgYWNCaWxsYm9hcmRzTGF5ZXJDdHJsLmdldEJpbGxib2FyZENvbGxlY3Rpb24oKS5yZW1vdmUoYmlsbGJvYXJkKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgYmlwb2wgb24gMDEvMjAvMTYuXG4gKi9cbid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2FjQmFzZUxheWVyUGlja2VyJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgcmVxdWlyZSA6ICdeYWNNYXAnLFxuICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgdGVtcGxhdGUgOiAnPGRpdiBpZD1cImJhc2VMYXllclBpY2tlckNvbnRhaW5lclwiIHN0eWxlPVwicG9zaXRpb246YWJzb2x1dGU7dG9wOjI0cHg7cmlnaHQ6MjRweDt3aWR0aDozOHB4O2hlaWdodDozOHB4O1wiPjxkaXYgbmctdHJhbnNjbHVkZT48L2Rpdj48L2Rpdj4nLFxuICAgIGNvbnRyb2xsZXIgOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgIHRoaXMuZ2V0UHJvdmlkZXJWaWV3TW9kZWxzID0gZ2V0UHJvdmlkZXJWaWV3TW9kZWxzO1xuICAgICAgdGhpcy5wdXNoUHJvdmlkZXJWaWV3TW9kZWwgPSBwdXNoUHJvdmlkZXJWaWV3TW9kZWw7XG4gICAgICB0aGlzLmdldEltYWdlcnlWaWV3TW9kZWxzID0gZ2V0SW1hZ2VyeVZpZXdNb2RlbHM7XG4gICAgICB0aGlzLmdldFRlcnJhaW5WaWV3TW9kZWxzID0gZ2V0VGVycmFpblZpZXdNb2RlbHM7XG5cbiAgICAgIGZ1bmN0aW9uIGdldFRlcnJhaW5WaWV3TW9kZWxzKCkge1xuICAgICAgICByZXR1cm4gJHNjb3BlLnByb3ZpZGVyVmlld01vZGVscy50ZXJyYWluUHJvdmlkZXJWaWV3TW9kZWxzO1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gZ2V0SW1hZ2VyeVZpZXdNb2RlbHMoKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUucHJvdmlkZXJWaWV3TW9kZWxzLmltYWdlcnlQcm92aWRlclZpZXdNb2RlbHM7XG4gICAgICB9XG4gICAgICBmdW5jdGlvbiBnZXRQcm92aWRlclZpZXdNb2RlbHMoKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUucHJvdmlkZXJWaWV3TW9kZWxzO1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gcHVzaFByb3ZpZGVyVmlld01vZGVsKGtleSxpdGVtKSB7XG4gICAgICAgICRzY29wZS5wcm92aWRlclZpZXdNb2RlbHNba2V5XS5wdXNoKGl0ZW0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgbGluayA6e1xuICAgICAgcHJlOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGFjTWFwQ3RybCkge1xuICAgICAgICBzY29wZS5wcm92aWRlclZpZXdNb2RlbHMgPSB7XG4gICAgICAgICAgaW1hZ2VyeVByb3ZpZGVyVmlld01vZGVsczogW10sXG4gICAgICAgICAgdGVycmFpblByb3ZpZGVyVmlld01vZGVsczogW10sXG4gICAgICAgIH07XG4gICAgICAgIHNjb3BlLmJhc2VMYXllclBpY2tlciA9IG51bGw7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5iYXNlTGF5ZXJQaWNrZXIuZGVzdHJveSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBwb3N0OiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGFjTWFwQ3RybCkge1xuICAgICAgICBzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7IHJldHVybiBzY29wZS5wcm92aWRlclZpZXdNb2RlbHMgfSwgZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICBpZiAoIXNjb3BlLmJhc2VMYXllclBpY2tlcikge1xuICAgICAgICAgICAgICBzY29wZS5iYXNlTGF5ZXJQaWNrZXIgPSBuZXcgQ2VzaXVtLkJhc2VMYXllclBpY2tlcignYmFzZUxheWVyUGlja2VyQ29udGFpbmVyJywge1xuICAgICAgICAgICAgICAgICAgZ2xvYmUgOiBhY01hcEN0cmwuZ2V0Q2VzaXVtV2lkZ2V0KCkuc2NlbmUuZ2xvYmUsXG4gICAgICAgICAgICAgICAgICBpbWFnZXJ5UHJvdmlkZXJWaWV3TW9kZWxzIDogc2NvcGUucHJvdmlkZXJWaWV3TW9kZWxzLmltYWdlcnlQcm92aWRlclZpZXdNb2RlbHMsXG4gICAgICAgICAgICAgICAgICB0ZXJyYWluUHJvdmlkZXJWaWV3TW9kZWxzIDogc2NvcGUucHJvdmlkZXJWaWV3TW9kZWxzLnRlcnJhaW5Qcm92aWRlclZpZXdNb2RlbHNcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzY29wZS5iYXNlTGF5ZXJQaWNrZXIuZGVzdHJveSgpO1xuICAgICAgICAgICAgICBzY29wZS5iYXNlTGF5ZXJQaWNrZXIgPSBuZXcgQ2VzaXVtLkJhc2VMYXllclBpY2tlcignYmFzZUxheWVyUGlja2VyQ29udGFpbmVyJywge1xuICAgICAgICAgICAgICAgICAgZ2xvYmUgOiBhY01hcEN0cmwuZ2V0Q2VzaXVtV2lkZ2V0KCkuc2NlbmUuZ2xvYmUsXG4gICAgICAgICAgICAgICAgICBpbWFnZXJ5UHJvdmlkZXJWaWV3TW9kZWxzIDogc2NvcGUucHJvdmlkZXJWaWV3TW9kZWxzLmltYWdlcnlQcm92aWRlclZpZXdNb2RlbHMsXG4gICAgICAgICAgICAgICAgICB0ZXJyYWluUHJvdmlkZXJWaWV3TW9kZWxzIDogc2NvcGUucHJvdmlkZXJWaWV3TW9kZWxzLnRlcnJhaW5Qcm92aWRlclZpZXdNb2RlbHNcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAxNy8wMS8xNS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2FjQ29tcGxleExheWVyJywgZnVuY3Rpb24oJGxvZykge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0IDogJ0UnLFxuICAgIHJlcXVpcmUgOiAnXmFjTWFwJyxcbiAgICBjb21waWxlIDogZnVuY3Rpb24oZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgIGlmIChhdHRycy5vYnNlcnZhYmxlQ29sbGVjdGlvbikge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goZWxlbWVudC5jaGlsZHJlbigpLCBmdW5jdGlvbiAoY2hpbGQpIHtcblxuICAgICAgICAgIHZhciBsYXllciA9IHVuZGVmaW5lZDtcblxuICAgICAgICAgIGlmIChjaGlsZC50YWdOYW1lID09PSAnQklMTEJPQVJEJykge1xuICAgICAgICAgICAgbGF5ZXIgPSBhbmd1bGFyLmVsZW1lbnQoJzxiaWxsYm9hcmRzLWxheWVyPjwvYmlsbGJvYXJkcy1sYXllcj4nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoY2hpbGQudGFnTmFtZSA9PT0gJ0xBQkVMJykge1xuICAgICAgICAgICAgbGF5ZXIgPSBhbmd1bGFyLmVsZW1lbnQoJzxsYWJlbHMtbGF5ZXI+PC9sYWJlbHMtbGF5ZXI+Jyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFsYXllcikge1xuICAgICAgICAgICAgJGxvZy53YXJuKCdGb3VuZCBhbiB1bmtub3duIGNoaWxkIG9mIG9mIGNvbXBsZXgtbGF5ZXIuIFJlbW92aW5nLi4uJyk7XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoY2hpbGQpLnJlbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjaGlsZC5hdHRyaWJ1dGVzLCBmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICAgICAgICBsYXllci5hdHRyKGF0dHIubmFtZSwgYXR0ci52YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChlbGVtZW50WzBdLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgICAgICAgIGlmICghYW5ndWxhci5lbGVtZW50KGNoaWxkKS5hdHRyKGF0dHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICBsYXllci5hdHRyKGF0dHIubmFtZSwgYXR0ci52YWx1ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KGNoaWxkKS5yZXBsYWNlV2l0aChsYXllcik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMDkvMDEvMTYuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY0JpbGxib2FyZHNMYXllcicsIGZ1bmN0aW9uKCRwYXJzZSwgT2JzZXJ2YWJsZUNvbGxlY3Rpb24sIEJpbGxCb2FyZEF0dHJpYnV0ZXMsIENlc2l1bSkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0IDogJ0UnLFxuICAgIHJlcXVpcmUgOiAnXmFjTWFwJyxcbiAgICBjb250cm9sbGVyIDogZnVuY3Rpb24oJHNjb3BlLCAkYXR0cnMpIHtcbiAgICAgIHRoaXMuZ2V0QmlsbGJvYXJkQ29sbGVjdGlvbiA9IGdldEJpbGxib2FyZENvbGxlY3Rpb247XG5cbiAgICAgIGZ1bmN0aW9uIGdldEJpbGxib2FyZENvbGxlY3Rpb24oKSB7XG4gICAgICAgIGlmICgkYXR0cnMub2JzZXJ2YWJsZUNvbGxlY3Rpb24pIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBnZXQgY29sbGVjdGlvbiBpZiBsYXllciBpcyBib3VuZCB0byBPYnNlcnZhYmxlQ29sbGVjdGlvbicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkc2NvcGUuY29sbGVjdGlvbjtcbiAgICAgIH1cbiAgICB9LFxuICAgIGxpbmsgOiB7XG4gICAgICBwcmU6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMsIGFjTWFwQ3RybCkge1xuICAgICAgICBzY29wZS5jb2xsZWN0aW9uID0gbmV3IENlc2l1bS5CaWxsYm9hcmRDb2xsZWN0aW9uKCk7XG5cbiAgICAgICAgaWYgKGF0dHJzLm9ic2VydmFibGVDb2xsZWN0aW9uKSB7XG4gICAgICAgICAgdmFyIENPTExFQ1RJT05fUkVHRVhQID0gL1xccyooW1xcJFxcd10rKVxccytpblxccysoKD86W1xcJFxcd10rXFwuKSpbXFwkXFx3XSspLztcbiAgICAgICAgICB2YXIgbWF0Y2ggPSBhdHRycy5vYnNlcnZhYmxlQ29sbGVjdGlvbi5tYXRjaChDT0xMRUNUSU9OX1JFR0VYUCk7XG4gICAgICAgICAgdmFyIGl0ZW1OYW1lID0gbWF0Y2hbMV07XG4gICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSAkcGFyc2UobWF0Y2hbMl0pKHNjb3BlKTtcbiAgICAgICAgICBpZiAoIWNvbGxlY3Rpb24gaW5zdGFuY2VvZiBPYnNlcnZhYmxlQ29sbGVjdGlvbikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdvYnNlcnZhYmxlLWNvbGxlY3Rpb24gbXVzdCBiZSBvZiB0eXBlIE9ic2VydmFibGVDb2xsZWN0aW9uLicpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY29sbGVjdGlvbi5nZXREYXRhKCksIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgYWRkQmlsbGJvYXJkKGl0ZW0pXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29sbGVjdGlvbi5vbkFkZChhZGRCaWxsYm9hcmQpO1xuICAgICAgICAgICAgY29sbGVjdGlvbi5vblVwZGF0ZSh1cGRhdGUpO1xuICAgICAgICAgICAgY29sbGVjdGlvbi5vblJlbW92ZShyZW1vdmUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZ1bmN0aW9uIGFkZEJpbGxib2FyZChpdGVtKSB7XG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IHt9O1xuICAgICAgICAgICAgY29udGV4dFtpdGVtTmFtZV0gPSBpdGVtO1xuICAgICAgICAgICAgdmFyIGJpbGxEZXNjID0gQmlsbEJvYXJkQXR0cmlidXRlcy5jYWxjQXR0cmlidXRlcyhhdHRycywgY29udGV4dCk7XG4gICAgICAgICAgICByZXR1cm4gc2NvcGUuY29sbGVjdGlvbi5hZGQoYmlsbERlc2MpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZShpdGVtLCBpbmRleCkge1xuICAgICAgICAgICAgdmFyIGJpbGxib2FyZCA9IHNjb3BlLmNvbGxlY3Rpb24uZ2V0KGluZGV4KTtcbiAgICAgICAgICAgIGJpbGxib2FyZC5wb3NpdGlvbiA9IENlc2l1bS5DYXJ0ZXNpYW4zLmZyb21EZWdyZWVzKE51bWJlcihpdGVtLnBvc2l0aW9uLmxvbmdpdHVkZSkgfHwgMCwgTnVtYmVyKGl0ZW0ucG9zaXRpb24ubGF0aXR1ZGUpIHx8IDAsIE51bWJlcihpdGVtLnBvc2l0aW9uLmFsdGl0dWRlKSB8fCAwKTtcbiAgICAgICAgICAgIGJpbGxib2FyZC5pbWFnZSA9IGl0ZW0uaW1hZ2U7XG4gICAgICAgICAgICBiaWxsYm9hcmQuY29sb3IgPSBDZXNpdW0uQ29sb3IuZnJvbUNzc0NvbG9yU3RyaW5nKGl0ZW0uY29sb3IpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZ1bmN0aW9uIHJlbW92ZShpdGVtLCBpbmRleCkge1xuICAgICAgICAgICAgc2NvcGUuY29sbGVjdGlvbi5yZW1vdmUoc2NvcGUuY29sbGVjdGlvbi5nZXQoaW5kZXgpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5wcmltaXRpdmVzLmFkZChzY29wZS5jb2xsZWN0aW9uKTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5wcmltaXRpdmVzLnJlbW92ZShzY29wZS5jb2xsZWN0aW9uKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGJpcG9sIG9uIDAxLzIwLzE2LlxuICovXG5cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY0dlb2NvZGVyJywgZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICByZXF1aXJlIDogJ15hY01hcCcsXG4gICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICB0ZW1wbGF0ZSA6ICc8ZGl2IGlkPVwiZ2VvY29kZXJDb250YWluZXJcIiBjbGFzcz1cImNlc2l1bS12aWV3ZXItZ2VvY29kZXJDb250YWluZXJcIj48L2Rpdj4nLFxuICAgIGNvbnRyb2xsZXIgOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICB9LFxuICAgIGxpbmsgOntcbiAgICAgIHByZTogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBhY01hcEN0cmwpIHtcbiAgICAgICAgc2NvcGUuZ2VvY29kZXIgPSBudWxsO1xuXG4gICAgICAgIHNjb3BlLmdlb2NvZGVyID0gbmV3IENlc2l1bS5HZW9jb2Rlcih7XG4gICAgICAgICAgY29udGFpbmVyOiAnZ2VvY29kZXJDb250YWluZXInLFxuICAgICAgICAgIHNjZW5lOiBhY01hcEN0cmwuZ2V0Q2VzaXVtV2lkZ2V0KCkuc2NlbmUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBhY01hcEN0cmwuZ2V0Q2VzaXVtV2lkZ2V0KCkuZ2VvY29kZXIuZGVzdHJveSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgfVxuICB9XG59KTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBiaXBvbCBvbiAwMS8yMC8xNi5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYWNJbWFnZXJ5Vmlld01vZGVscycsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0IDogJ0UnLFxuICAgIHJlcXVpcmUgOiAnXmFjQmFzZUxheWVyUGlja2VyJyxcbiAgICBzY29wZSA6IHtcbiAgICAgIG5hbWU6ICcmJyxcbiAgICAgIGljb25Vcmw6ICcmJyxcbiAgICAgIHRvb2x0aXA6ICcmJyxcbiAgICAgIGNyZWF0aW9uRnVuY3Rpb246ICcmJ1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBDZXNpdW0pIHtcbiAgICAgICRzY29wZS5jZXNpdW1GYWN0b3J5ID0gQ2VzaXVtO1xuICAgIH0sXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNCYXNlTGF5ZXJQaWNrZXJDdHJsKSB7XG4gICAgICB2YXIgaXRlbSA9IG5ldyBzY29wZS5jZXNpdW1GYWN0b3J5LlByb3ZpZGVyVmlld01vZGVsKHtcbiAgICAgICAgbmFtZTogc2NvcGUubmFtZSgpLFxuICAgICAgICBpY29uVXJsOiBzY29wZS5pY29uVXJsKCksXG4gICAgICAgIHRvb2x0aXA6IHNjb3BlLnRvb2x0aXAoKSxcbiAgICAgICAgY3JlYXRpb25GdW5jdGlvbjogc2NvcGUuY3JlYXRpb25GdW5jdGlvblxuICAgICAgfSk7XG5cbiAgICAgIGFjQmFzZUxheWVyUGlja2VyQ3RybC5wdXNoUHJvdmlkZXJWaWV3TW9kZWwoJ2ltYWdlcnlQcm92aWRlclZpZXdNb2RlbHMnLCBpdGVtKTtcblxuICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goYWNCYXNlTGF5ZXJQaWNrZXJDdHJsLmdldEltYWdlcnlWaWV3TW9kZWxzKCksIGZ1bmN0aW9uKHZhbCwga2V5KSB7XG4gICAgICAgICAgLy8gcmVtb3ZlIHRoZSBlbGVtZW50XG4gICAgICAgICAgaWYgKHZhbCA9PT0gcHJvdmlkZXIpIHtcbiAgICAgICAgICAgIGFjQmFzZUxheWVyUGlja2VyQ3RybC5nZXRJbWFnZXJ5Vmlld01vZGVscygpLnNwbGljZShrZXksIDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMDkvMDEvMTUuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY0xhYmVsJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgcmVxdWlyZSA6ICdeYWNMYWJlbHNMYXllcicsXG4gICAgc2NvcGUgOiB7XG4gICAgICBjb2xvciA6ICcmJyxcbiAgICAgIHRleHQgOiAnJicsXG4gICAgICBwb3NpdGlvbiA6ICcmJ1xuICAgIH0sXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNMYWJlbHNMYXllckN0cmwpIHtcbiAgICAgIHZhciBsYWJlbERlc2MgPSB7fTtcblxuICAgICAgdmFyIHBvc2l0aW9uID0gc2NvcGUucG9zaXRpb24oKTtcbiAgICAgIGxhYmVsRGVzYy5wb3NpdGlvbiA9IENlc2l1bS5DYXJ0ZXNpYW4zLmZyb21EZWdyZWVzKE51bWJlcihwb3NpdGlvbi5sb25naXR1ZGUpIHx8IDAsIE51bWJlcihwb3NpdGlvbi5sYXRpdHVkZSkgfHwgMCwgTnVtYmVyKHBvc2l0aW9uLmFsdGl0dWRlKSB8fCAwKTtcblxuICAgICAgdmFyIGNvbG9yID0gc2NvcGUuY29sb3IoKTtcbiAgICAgIGlmIChjb2xvcikge1xuICAgICAgICBsYWJlbERlc2MuY29sb3IgPSBjb2xvcjtcbiAgICAgIH1cblxuICAgICAgbGFiZWxEZXNjLnRleHQgPSBzY29wZS50ZXh0KCk7XG5cbiAgICAgIHZhciBsYWJlbCA9IGFjTGFiZWxzTGF5ZXJDdHJsLmdldExhYmVsQ29sbGVjdGlvbigpLmFkZChsYWJlbERlc2MpO1xuXG4gICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGFjTGFiZWxzTGF5ZXJDdHJsLmdldExhYmVsQ29sbGVjdGlvbigpLnJlbW92ZShsYWJlbCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMDkvMDEvMTUuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY0xhYmVsc0xheWVyJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgcmVxdWlyZSA6ICdeYWNNYXAnLFxuICAgIHNjb3BlIDoge30sXG4gICAgY29udHJvbGxlciA6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgdGhpcy5nZXRMYWJlbENvbGxlY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICRzY29wZS5jb2xsZWN0aW9uO1xuICAgICAgfVxuICAgIH0sXG4gICAgbGluayA6IHtcbiAgICAgIHByZTogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNNYXBDdHJsKSB7XG4gICAgICAgIHNjb3BlLmNvbGxlY3Rpb24gPSBuZXcgQ2VzaXVtLkxhYmVsQ29sbGVjdGlvbigpO1xuICAgICAgICBhY01hcEN0cmwuZ2V0Q2VzaXVtV2lkZ2V0KCkuc2NlbmUucHJpbWl0aXZlcy5hZGQoc2NvcGUuY29sbGVjdGlvbik7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBhY01hcEN0cmwuZ2V0Q2VzaXVtV2lkZ2V0KCkuc2NlbmUucHJpbWl0aXZlcy5yZW1vdmUoc2NvcGUuY29sbGVjdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAwOS8wMS8xNS5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYWNNYXAnLCBmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gZ2V0U2NlbmVNb2RlKGRpbWVuc2lvbnMpIHtcbiAgICBpZiAoZGltZW5zaW9ucyA9PSAyKSB7XG4gICAgICByZXR1cm4gQ2VzaXVtLlNjZW5lTW9kZS5TQ0VORTJEO1xuICAgIH1cbiAgICBlbHNlIGlmIChkaW1lbnNpb25zID09IDIuNSkge1xuICAgICAgcmV0dXJuIENlc2l1bS5TY2VuZU1vZGUuQ09MVU1CVVNfVklFVztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gQ2VzaXVtLlNjZW5lTW9kZS5TQ0VORTNEO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEltYWdlcnlQcm92aWRlckJvb2xlYW4oYm9vbCkge1xuICAgIGlmIChib29sID09ICdmYWxzZScpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICB0ZW1wbGF0ZSA6ICc8ZGl2PiA8bmctdHJhbnNjbHVkZT48L25nLXRyYW5zY2x1ZGU+IDxkaXYgY2xhc3M9XCJtYXAtY29udGFpbmVyXCI+PC9kaXY+IDwvZGl2PicsXG4gICAgdHJhbnNjbHVkZSA6IHRydWUsXG4gICAgc2NvcGUgOiB7XG4gICAgICBkaW1lbnNpb25zIDogJ0AnLFxuICAgICAgaW1hZ2VyeVByb3ZpZGVyIDogJ0AnXG4gICAgfSxcbiAgICBjb250cm9sbGVyIDogZnVuY3Rpb24oJHNjb3BlLCAkZWxlbWVudCkge1xuICAgICAgdGhpcy5nZXRDZXNpdW1XaWRnZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICRzY29wZS5jZXNpdW07XG4gICAgICB9XG4gICAgfSxcbiAgICBsaW5rIDoge1xuICAgICAgcHJlOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgaWYgKCFzY29wZS5kaW1lbnNpb25zKSB7XG4gICAgICAgICAgc2NvcGUuZGltZW5zaW9ucyA9IDM7XG4gICAgICAgIH1cblxuICAgICAgICBzY29wZS5jZXNpdW0gPSBuZXcgQ2VzaXVtLkNlc2l1bVdpZGdldChlbGVtZW50LmZpbmQoJ2RpdicpWzBdLCB7XG4gICAgICAgICAgc2NlbmVNb2RlOiBnZXRTY2VuZU1vZGUoc2NvcGUuZGltZW5zaW9ucyksXG4gICAgICAgICAgaW1hZ2VyeVByb3ZpZGVyOiBnZXRJbWFnZXJ5UHJvdmlkZXJCb29sZWFuKHNjb3BlLmltYWdlcnlQcm92aWRlcilcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgZ2lsbmlzMiBvbiAxOC8wMS8xNS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2FjUG9seWxpbmUnLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICByZXF1aXJlIDogJ15hY1BvbHlsaW5lc0xheWVyJyxcbiAgICBzY29wZSA6IHtcbiAgICAgIGNvbG9yIDogJyYnLFxuICAgICAgd2lkdGggOiAnJicsXG4gICAgICBwb3NpdGlvbnMgOiAnJidcbiAgICB9LFxuICAgIGxpbmsgOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGFjUG9seWxpbmVzTGF5ZXJDdHJsKSB7XG4gICAgICB2YXIgcG9seWxpbmVEZXNjID0ge307XG5cbiAgICAgIGlmICghYW5ndWxhci5pc0RlZmluZWQoc2NvcGUucG9zaXRpb25zKSB8fCAhYW5ndWxhci5pc0Z1bmN0aW9uKHNjb3BlLnBvc2l0aW9ucykpe1xuICAgICAgICB0aHJvdyBcIlBvbHlsaW5lIHBvc2l0aW9ucyBtdXN0IGJlIGRlZmluZWQgYXMgYSBmdW5jdGlvblwiO1xuICAgICAgfVxuICAgICAgdmFyIHBvc2l0aW9ucyA9IHNjb3BlLnBvc2l0aW9ucygpO1xuICAgICAgcG9seWxpbmVEZXNjLnBvc2l0aW9ucyA9IFtdO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKHBvc2l0aW9ucywgZnVuY3Rpb24ocG9zaXRpb24pIHtcbiAgICAgICAgcG9seWxpbmVEZXNjLnBvc2l0aW9ucy5wdXNoKENlc2l1bS5DYXJ0ZXNpYW4zLmZyb21EZWdyZWVzKE51bWJlcihwb3NpdGlvbi5sb25naXR1ZGUpIHx8IDAsIE51bWJlcihwb3NpdGlvbi5sYXRpdHVkZSkgfHwgMCwgTnVtYmVyKHBvc2l0aW9uLmFsdGl0dWRlKSB8fCAwKSk7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGNlc2l1bUNvbG9yID0gQ2VzaXVtLkNvbG9yLmZyb21Dc3NDb2xvclN0cmluZygnYmxhY2snKTtcbiAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChzY29wZS5jb2xvcikgJiYgYW5ndWxhci5pc0Z1bmN0aW9uKHNjb3BlLmNvbG9yKSl7XG4gICAgICAgIGNlc2l1bUNvbG9yID0gQ2VzaXVtLkNvbG9yLmZyb21Dc3NDb2xvclN0cmluZyhzY29wZS5jb2xvcigpKTtcbiAgICAgICAgfVxuICAgICAgcG9seWxpbmVEZXNjLm1hdGVyaWFsID0gQ2VzaXVtLk1hdGVyaWFsLmZyb21UeXBlKCdDb2xvcicpO1xuICAgICAgcG9seWxpbmVEZXNjLm1hdGVyaWFsLnVuaWZvcm1zLmNvbG9yID0gY2VzaXVtQ29sb3I7XG5cbiAgICAgIHBvbHlsaW5lRGVzYy53aWR0aCA9IDE7XG4gICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQoc2NvcGUud2lkdGgpICYmIGFuZ3VsYXIuaXNGdW5jdGlvbihzY29wZS53aWR0aCkpe1xuICAgICAgICBwb2x5bGluZURlc2Mud2lkdGggPSBzY29wZS53aWR0aCgpO1xuICAgICAgfVxuXG4gICAgICB2YXIgcG9seWxpbmUgPSBhY1BvbHlsaW5lc0xheWVyQ3RybC5nZXRQb2x5bGluZUNvbGxlY3Rpb24oKS5hZGQocG9seWxpbmVEZXNjKTtcblxuICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBhY1BvbHlsaW5lc0xheWVyQ3RybC5nZXRQb2x5bGluZUNvbGxlY3Rpb24oKS5yZW1vdmUocG9seWxpbmUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59KTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBnaWxuaXMyIG9uIDE4LzAxLzE1LlxuICovXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYWNQb2x5bGluZXNMYXllcicsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0IDogJ0UnLFxuICAgIHJlcXVpcmUgOiAnXmFjTWFwJyxcbiAgICBzY29wZSA6IHt9LFxuICAgIGNvbnRyb2xsZXIgOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgIHRoaXMuZ2V0UG9seWxpbmVDb2xsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUuY29sbGVjdGlvbjtcbiAgICAgIH1cbiAgICB9LFxuICAgIGxpbmsgOiB7XG4gICAgICBwcmU6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMsIGFjTWFwQ3RybCkge1xuICAgICAgICBzY29wZS5jb2xsZWN0aW9uID0gbmV3IENlc2l1bS5Qb2x5bGluZUNvbGxlY3Rpb24oKTtcbiAgICAgICAgYWNNYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLnByaW1pdGl2ZXMuYWRkKHNjb3BlLmNvbGxlY3Rpb24pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgYWNNYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLnByaW1pdGl2ZXMucmVtb3ZlKHNjb3BlLmNvbGxlY3Rpb24pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGJpcG9sIG9uIDAxLzI1LzE2LlxuICovXG4ndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY1RlcnJhaW5WaWV3TW9kZWxzJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgcmVxdWlyZSA6ICdeYWNCYXNlTGF5ZXJQaWNrZXInLFxuICAgIHNjb3BlIDoge1xuICAgICAgbmFtZTogJyYnLFxuICAgICAgaWNvblVybDogJyYnLFxuICAgICAgdG9vbHRpcDogJyYnLFxuICAgICAgY3JlYXRpb25GdW5jdGlvbjogJyYnXG4gICAgfSxcbiAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIENlc2l1bSkge1xuICAgICAgJHNjb3BlLmNlc2l1bUZhY3RvcnkgPSBDZXNpdW07XG4gICAgfSxcbiAgICBsaW5rIDogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBhY0Jhc2VMYXllclBpY2tlckN0cmwpIHtcbiAgICAgIHZhciBpdGVtID0gbmV3IHNjb3BlLmNlc2l1bUZhY3RvcnkuUHJvdmlkZXJWaWV3TW9kZWwoe1xuICAgICAgICBuYW1lOiBzY29wZS5uYW1lKCksXG4gICAgICAgIGljb25Vcmw6IHNjb3BlLmljb25VcmwoKSxcbiAgICAgICAgdG9vbHRpcDogc2NvcGUudG9vbHRpcCgpLFxuICAgICAgICBjcmVhdGlvbkZ1bmN0aW9uOiBzY29wZS5jcmVhdGlvbkZ1bmN0aW9uXG4gICAgICB9KTtcblxuICAgICAgYWNCYXNlTGF5ZXJQaWNrZXJDdHJsLnB1c2hQcm92aWRlclZpZXdNb2RlbCgndGVycmFpblByb3ZpZGVyVmlld01vZGVscycsIGl0ZW0pO1xuXG4gICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChhY0Jhc2VMYXllclBpY2tlckN0cmwuZ2V0VGVycmFpblZpZXdNb2RlbHMoKSwgZnVuY3Rpb24odmFsLCBrZXkpIHtcbiAgICAgICAgICAvLyByZW1vdmUgdGhlIGVsZW1lbnRcbiAgICAgICAgICBpZiAodmFsID09PSBwcm92aWRlcikge1xuICAgICAgICAgICAgYWNCYXNlTGF5ZXJQaWNrZXJDdHJsLmdldFRlcnJhaW5WaWV3TW9kZWxzKCkuc3BsaWNlKGtleSwgMSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAwOS8wMS8xNS5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYWNXZWJNYXBTZXJ2aWNlTGF5ZXInLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICByZXF1aXJlIDogJ15hY01hcCcsXG4gICAgc2NvcGUgOiB7XG4gICAgICB1cmwgOiAnJicsXG4gICAgICBsYXllcnMgOiAnJidcbiAgICB9LFxuICAgIGNvbnRyb2xsZXIgOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICB9LFxuICAgIGxpbmsgOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGFjTWFwQ3RybCkge1xuICAgICAgdmFyIHByb3ZpZGVyID0gbmV3IENlc2l1bS5XZWJNYXBTZXJ2aWNlSW1hZ2VyeVByb3ZpZGVyKHtcbiAgICAgICAgdXJsOiBzY29wZS51cmwoKSxcbiAgICAgICAgbGF5ZXJzIDogc2NvcGUubGF5ZXJzKClcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgbGF5ZXIgPSBhY01hcEN0cmwuZ2V0Q2VzaXVtV2lkZ2V0KCkuc2NlbmUuaW1hZ2VyeUxheWVycy5hZGRJbWFnZXJ5UHJvdmlkZXIocHJvdmlkZXIpO1xuXG4gICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5pbWFnZXJ5TGF5ZXJzLnJlbW92ZShsYXllcik7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==