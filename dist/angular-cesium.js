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
 * Created by bipol on 02/09/16.
 */
angular.module('angularCesium').factory('CesiumWidget', function($log) {
  var data = {};
  data.getCesiumWidget = getCesiumWidget;
  data.setCesiumWidget = setCesiumWidget;
  var cesiumWidget = {};

  function getCesiumWidget(id) {
    if(!cesiumWidget) {
      $log.warn("Angular-Cesium: CesiumViewer has not been set!");
    }

    if (!id && Object.keys(cesiumWidget).length > 1) {
      $log.warn("Angular-Cesium: You have multiple CesiumViewer instances, you must specify an id");
      return cesiumWidget['main'];
    } else {
      return cesiumWidget['main'];
    }

    return cesiumWidget[id];
  }

  function setCesiumWidget(cv, id) {
    if (id) {
      cesiumWidget[id] = cv;
    } else {
      cesiumWidget['main'] = cv;
    }
  }

  return data;
});

/**
 * Created by netanel on 10/01/15.
 */
angular.module('angularCesium').factory('Cesium', function() {
  return Cesium;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi5qcyIsInNlcnZpY2VzL2JpbGxib2FyZC1hdHRycy5qcyIsInNlcnZpY2VzL2Nlc2l1bS13aWRnZXQuanMiLCJzZXJ2aWNlcy9jZXNpdW0uanMiLCJtYXAtY29tcG9uZW50cy9iYXNlLWxheWVyLXBpY2tlci9iYXNlLWxheWVyLXBpY2tlci5qcyIsIm1hcC1jb21wb25lbnRzL2JpbGxib2FyZC9iaWxsYm9hcmQuanMiLCJtYXAtY29tcG9uZW50cy9iaWxsYm9hcmRzLWxheWVyL2JpbGxib2FyZHMtbGF5ZXIuanMiLCJtYXAtY29tcG9uZW50cy9jb21wbGV4LWxheWVyL2NvbXBsZXgtbGF5ZXIuanMiLCJtYXAtY29tcG9uZW50cy9nZW9jb2Rlci9nZW9jb2Rlci5qcyIsIm1hcC1jb21wb25lbnRzL2ltYWdlcnktdmlldy1tb2RlbHMvaW1hZ2VyeS12aWV3LW1vZGVscy5qcyIsIm1hcC1jb21wb25lbnRzL2xhYmVsL2xhYmVsLmpzIiwibWFwLWNvbXBvbmVudHMvbGFiZWxzLWxheWVyL2xhYmVscy1sYXllci5qcyIsIm1hcC1jb21wb25lbnRzL21hcC9tYXAtZGlyZWN0aXZlLmpzIiwibWFwLWNvbXBvbmVudHMvcG9seWxpbmUvcG9seWxpbmUuanMiLCJtYXAtY29tcG9uZW50cy9wb2x5bGluZXMtbGF5ZXIvcG9seWxpbmVzLWxheWVyLmpzIiwibWFwLWNvbXBvbmVudHMvdGVycmFpbi12aWV3LW1vZGVsL3RlcnJhaW4tdmlldy1tb2RlbC5qcyIsIm1hcC1jb21wb25lbnRzL3dlYi1tYXAtc2VydmljZS1sYXllci93ZWItbWFwLXNlcnZpY2UtbGF5ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFuZ3VsYXItY2VzaXVtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMTAvMDEvMTUuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJywgWydvYnNlcnZhYmxlQ29sbGVjdGlvbiddKTsiLCIvKipcbiAqIENyZWF0ZWQgYnkgbmV0YW5lbCBvbiAxMC8wMS8xNS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5zZXJ2aWNlKCdCaWxsQm9hcmRBdHRyaWJ1dGVzJywgZnVuY3Rpb24oJHBhcnNlKSB7XG4gIHRoaXMuY2FsY0F0dHJpYnV0ZXMgPSBmdW5jdGlvbihhdHRycywgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICBpbWFnZSA6ICRwYXJzZShhdHRycy5pbWFnZSkoY29udGV4dClcbiAgICB9O1xuICAgIHZhciBwb3NpdGlvbkF0dHIgPSAkcGFyc2UoYXR0cnMucG9zaXRpb24pKGNvbnRleHQpO1xuICAgIHJlc3VsdC5wb3NpdGlvbiA9IENlc2l1bS5DYXJ0ZXNpYW4zLmZyb21EZWdyZWVzKE51bWJlcihwb3NpdGlvbkF0dHIubG9uZ2l0dWRlKSB8fCAwLCBOdW1iZXIocG9zaXRpb25BdHRyLmxhdGl0dWRlKSB8fCAwLCBOdW1iZXIocG9zaXRpb25BdHRyLmFsdGl0dWRlKSB8fCAwKTtcblxuICAgIHZhciBjb2xvciA9ICRwYXJzZShhdHRycy5jb2xvcikoY29udGV4dCk7XG4gICAgaWYgKGNvbG9yKSB7XG4gICAgICByZXN1bHQuY29sb3IgPSBDZXNpdW0uQ29sb3IuZnJvbUNzc0NvbG9yU3RyaW5nKGNvbG9yKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGJpcG9sIG9uIDAyLzA5LzE2LlxuICovXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmZhY3RvcnkoJ0Nlc2l1bVdpZGdldCcsIGZ1bmN0aW9uKCRsb2cpIHtcbiAgdmFyIGRhdGEgPSB7fTtcbiAgZGF0YS5nZXRDZXNpdW1XaWRnZXQgPSBnZXRDZXNpdW1XaWRnZXQ7XG4gIGRhdGEuc2V0Q2VzaXVtV2lkZ2V0ID0gc2V0Q2VzaXVtV2lkZ2V0O1xuICB2YXIgY2VzaXVtV2lkZ2V0ID0ge307XG5cbiAgZnVuY3Rpb24gZ2V0Q2VzaXVtV2lkZ2V0KGlkKSB7XG4gICAgaWYoIWNlc2l1bVdpZGdldCkge1xuICAgICAgJGxvZy53YXJuKFwiQW5ndWxhci1DZXNpdW06IENlc2l1bVZpZXdlciBoYXMgbm90IGJlZW4gc2V0IVwiKTtcbiAgICB9XG5cbiAgICBpZiAoIWlkICYmIE9iamVjdC5rZXlzKGNlc2l1bVdpZGdldCkubGVuZ3RoID4gMSkge1xuICAgICAgJGxvZy53YXJuKFwiQW5ndWxhci1DZXNpdW06IFlvdSBoYXZlIG11bHRpcGxlIENlc2l1bVZpZXdlciBpbnN0YW5jZXMsIHlvdSBtdXN0IHNwZWNpZnkgYW4gaWRcIik7XG4gICAgICByZXR1cm4gY2VzaXVtV2lkZ2V0WydtYWluJ107XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjZXNpdW1XaWRnZXRbJ21haW4nXTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2VzaXVtV2lkZ2V0W2lkXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldENlc2l1bVdpZGdldChjdiwgaWQpIHtcbiAgICBpZiAoaWQpIHtcbiAgICAgIGNlc2l1bVdpZGdldFtpZF0gPSBjdjtcbiAgICB9IGVsc2Uge1xuICAgICAgY2VzaXVtV2lkZ2V0WydtYWluJ10gPSBjdjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZGF0YTtcbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMTAvMDEvMTUuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZmFjdG9yeSgnQ2VzaXVtJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBDZXNpdW07XG59KTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBiaXBvbCBvbiAwMS8yMC8xNi5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYWNCYXNlTGF5ZXJQaWNrZXInLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICByZXF1aXJlIDogJ15hY01hcCcsXG4gICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICB0ZW1wbGF0ZSA6ICc8ZGl2IGlkPVwiYmFzZUxheWVyUGlja2VyQ29udGFpbmVyXCIgc3R5bGU9XCJwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MjRweDtyaWdodDoyNHB4O3dpZHRoOjM4cHg7aGVpZ2h0OjM4cHg7XCI+PGRpdiBuZy10cmFuc2NsdWRlPjwvZGl2PjwvZGl2PicsXG4gICAgY29udHJvbGxlciA6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgdGhpcy5nZXRQcm92aWRlclZpZXdNb2RlbHMgPSBnZXRQcm92aWRlclZpZXdNb2RlbHM7XG4gICAgICB0aGlzLnB1c2hQcm92aWRlclZpZXdNb2RlbCA9IHB1c2hQcm92aWRlclZpZXdNb2RlbDtcbiAgICAgIHRoaXMuZ2V0SW1hZ2VyeVZpZXdNb2RlbHMgPSBnZXRJbWFnZXJ5Vmlld01vZGVscztcbiAgICAgIHRoaXMuZ2V0VGVycmFpblZpZXdNb2RlbHMgPSBnZXRUZXJyYWluVmlld01vZGVscztcblxuICAgICAgZnVuY3Rpb24gZ2V0VGVycmFpblZpZXdNb2RlbHMoKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUucHJvdmlkZXJWaWV3TW9kZWxzLnRlcnJhaW5Qcm92aWRlclZpZXdNb2RlbHM7XG4gICAgICB9XG4gICAgICBmdW5jdGlvbiBnZXRJbWFnZXJ5Vmlld01vZGVscygpIHtcbiAgICAgICAgcmV0dXJuICRzY29wZS5wcm92aWRlclZpZXdNb2RlbHMuaW1hZ2VyeVByb3ZpZGVyVmlld01vZGVscztcbiAgICAgIH1cbiAgICAgIGZ1bmN0aW9uIGdldFByb3ZpZGVyVmlld01vZGVscygpIHtcbiAgICAgICAgcmV0dXJuICRzY29wZS5wcm92aWRlclZpZXdNb2RlbHM7XG4gICAgICB9XG4gICAgICBmdW5jdGlvbiBwdXNoUHJvdmlkZXJWaWV3TW9kZWwoa2V5LGl0ZW0pIHtcbiAgICAgICAgJHNjb3BlLnByb3ZpZGVyVmlld01vZGVsc1trZXldLnB1c2goaXRlbSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBsaW5rIDp7XG4gICAgICBwcmU6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNNYXBDdHJsKSB7XG4gICAgICAgIHNjb3BlLnByb3ZpZGVyVmlld01vZGVscyA9IHtcbiAgICAgICAgICBpbWFnZXJ5UHJvdmlkZXJWaWV3TW9kZWxzOiBbXSxcbiAgICAgICAgICB0ZXJyYWluUHJvdmlkZXJWaWV3TW9kZWxzOiBbXSxcbiAgICAgICAgfTtcbiAgICAgICAgc2NvcGUuYmFzZUxheWVyUGlja2VyID0gbnVsbDtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgYWNNYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLmJhc2VMYXllclBpY2tlci5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIHBvc3Q6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNNYXBDdHJsKSB7XG4gICAgICAgIHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHsgcmV0dXJuIHNjb3BlLnByb3ZpZGVyVmlld01vZGVscyB9LCBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAgIGlmICghc2NvcGUuYmFzZUxheWVyUGlja2VyKSB7XG4gICAgICAgICAgICAgIHNjb3BlLmJhc2VMYXllclBpY2tlciA9IG5ldyBDZXNpdW0uQmFzZUxheWVyUGlja2VyKCdiYXNlTGF5ZXJQaWNrZXJDb250YWluZXInLCB7XG4gICAgICAgICAgICAgICAgICBnbG9iZSA6IGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5nbG9iZSxcbiAgICAgICAgICAgICAgICAgIGltYWdlcnlQcm92aWRlclZpZXdNb2RlbHMgOiBzY29wZS5wcm92aWRlclZpZXdNb2RlbHMuaW1hZ2VyeVByb3ZpZGVyVmlld01vZGVscyxcbiAgICAgICAgICAgICAgICAgIHRlcnJhaW5Qcm92aWRlclZpZXdNb2RlbHMgOiBzY29wZS5wcm92aWRlclZpZXdNb2RlbHMudGVycmFpblByb3ZpZGVyVmlld01vZGVsc1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHNjb3BlLmJhc2VMYXllclBpY2tlci5kZXN0cm95KCk7XG4gICAgICAgICAgICAgIHNjb3BlLmJhc2VMYXllclBpY2tlciA9IG5ldyBDZXNpdW0uQmFzZUxheWVyUGlja2VyKCdiYXNlTGF5ZXJQaWNrZXJDb250YWluZXInLCB7XG4gICAgICAgICAgICAgICAgICBnbG9iZSA6IGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5nbG9iZSxcbiAgICAgICAgICAgICAgICAgIGltYWdlcnlQcm92aWRlclZpZXdNb2RlbHMgOiBzY29wZS5wcm92aWRlclZpZXdNb2RlbHMuaW1hZ2VyeVByb3ZpZGVyVmlld01vZGVscyxcbiAgICAgICAgICAgICAgICAgIHRlcnJhaW5Qcm92aWRlclZpZXdNb2RlbHMgOiBzY29wZS5wcm92aWRlclZpZXdNb2RlbHMudGVycmFpblByb3ZpZGVyVmlld01vZGVsc1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBuZXRhbmVsIG9uIDA5LzAxLzE1LlxuICovXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYWNCaWxsYm9hcmQnLCBmdW5jdGlvbihCaWxsQm9hcmRBdHRyaWJ1dGVzKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgcmVxdWlyZSA6ICdeYWNCaWxsYm9hcmRzTGF5ZXInLFxuICAgIGxpbmsgOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGFjQmlsbGJvYXJkc0xheWVyQ3RybCkge1xuICAgICAgdmFyIGJpbGxEZXNjID0gQmlsbEJvYXJkQXR0cmlidXRlcy5jYWxjQXR0cmlidXRlcyhhdHRycywgc2NvcGUpO1xuXG4gICAgICB2YXIgYmlsbGJvYXJkID0gYWNCaWxsYm9hcmRzTGF5ZXJDdHJsLmdldEJpbGxib2FyZENvbGxlY3Rpb24oKS5hZGQoYmlsbERlc2MpO1xuXG4gICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGFjQmlsbGJvYXJkc0xheWVyQ3RybC5nZXRCaWxsYm9hcmRDb2xsZWN0aW9uKCkucmVtb3ZlKGJpbGxib2FyZCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMDkvMDEvMTYuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY0JpbGxib2FyZHNMYXllcicsIGZ1bmN0aW9uKCRwYXJzZSwgT2JzZXJ2YWJsZUNvbGxlY3Rpb24sIEJpbGxCb2FyZEF0dHJpYnV0ZXMsIENlc2l1bSkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0IDogJ0UnLFxuICAgIHJlcXVpcmUgOiAnXmFjTWFwJyxcbiAgICBjb250cm9sbGVyIDogZnVuY3Rpb24oJHNjb3BlLCAkYXR0cnMpIHtcbiAgICAgIHRoaXMuZ2V0QmlsbGJvYXJkQ29sbGVjdGlvbiA9IGdldEJpbGxib2FyZENvbGxlY3Rpb247XG5cbiAgICAgIGZ1bmN0aW9uIGdldEJpbGxib2FyZENvbGxlY3Rpb24oKSB7XG4gICAgICAgIGlmICgkYXR0cnMub2JzZXJ2YWJsZUNvbGxlY3Rpb24pIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBnZXQgY29sbGVjdGlvbiBpZiBsYXllciBpcyBib3VuZCB0byBPYnNlcnZhYmxlQ29sbGVjdGlvbicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkc2NvcGUuY29sbGVjdGlvbjtcbiAgICAgIH1cbiAgICB9LFxuICAgIGxpbmsgOiB7XG4gICAgICBwcmU6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMsIGFjTWFwQ3RybCkge1xuICAgICAgICBzY29wZS5jb2xsZWN0aW9uID0gbmV3IENlc2l1bS5CaWxsYm9hcmRDb2xsZWN0aW9uKCk7XG5cbiAgICAgICAgaWYgKGF0dHJzLm9ic2VydmFibGVDb2xsZWN0aW9uKSB7XG4gICAgICAgICAgdmFyIENPTExFQ1RJT05fUkVHRVhQID0gL1xccyooW1xcJFxcd10rKVxccytpblxccysoKD86W1xcJFxcd10rXFwuKSpbXFwkXFx3XSspLztcbiAgICAgICAgICB2YXIgbWF0Y2ggPSBhdHRycy5vYnNlcnZhYmxlQ29sbGVjdGlvbi5tYXRjaChDT0xMRUNUSU9OX1JFR0VYUCk7XG4gICAgICAgICAgdmFyIGl0ZW1OYW1lID0gbWF0Y2hbMV07XG4gICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSAkcGFyc2UobWF0Y2hbMl0pKHNjb3BlKTtcbiAgICAgICAgICBpZiAoIWNvbGxlY3Rpb24gaW5zdGFuY2VvZiBPYnNlcnZhYmxlQ29sbGVjdGlvbikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdvYnNlcnZhYmxlLWNvbGxlY3Rpb24gbXVzdCBiZSBvZiB0eXBlIE9ic2VydmFibGVDb2xsZWN0aW9uLicpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY29sbGVjdGlvbi5nZXREYXRhKCksIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgYWRkQmlsbGJvYXJkKGl0ZW0pXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29sbGVjdGlvbi5vbkFkZChhZGRCaWxsYm9hcmQpO1xuICAgICAgICAgICAgY29sbGVjdGlvbi5vblVwZGF0ZSh1cGRhdGUpO1xuICAgICAgICAgICAgY29sbGVjdGlvbi5vblJlbW92ZShyZW1vdmUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZ1bmN0aW9uIGFkZEJpbGxib2FyZChpdGVtKSB7XG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IHt9O1xuICAgICAgICAgICAgY29udGV4dFtpdGVtTmFtZV0gPSBpdGVtO1xuICAgICAgICAgICAgdmFyIGJpbGxEZXNjID0gQmlsbEJvYXJkQXR0cmlidXRlcy5jYWxjQXR0cmlidXRlcyhhdHRycywgY29udGV4dCk7XG4gICAgICAgICAgICByZXR1cm4gc2NvcGUuY29sbGVjdGlvbi5hZGQoYmlsbERlc2MpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZShpdGVtLCBpbmRleCkge1xuICAgICAgICAgICAgdmFyIGJpbGxib2FyZCA9IHNjb3BlLmNvbGxlY3Rpb24uZ2V0KGluZGV4KTtcbiAgICAgICAgICAgIGJpbGxib2FyZC5wb3NpdGlvbiA9IENlc2l1bS5DYXJ0ZXNpYW4zLmZyb21EZWdyZWVzKE51bWJlcihpdGVtLnBvc2l0aW9uLmxvbmdpdHVkZSkgfHwgMCwgTnVtYmVyKGl0ZW0ucG9zaXRpb24ubGF0aXR1ZGUpIHx8IDAsIE51bWJlcihpdGVtLnBvc2l0aW9uLmFsdGl0dWRlKSB8fCAwKTtcbiAgICAgICAgICAgIGJpbGxib2FyZC5pbWFnZSA9IGl0ZW0uaW1hZ2U7XG4gICAgICAgICAgICBiaWxsYm9hcmQuY29sb3IgPSBDZXNpdW0uQ29sb3IuZnJvbUNzc0NvbG9yU3RyaW5nKGl0ZW0uY29sb3IpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZ1bmN0aW9uIHJlbW92ZShpdGVtLCBpbmRleCkge1xuICAgICAgICAgICAgc2NvcGUuY29sbGVjdGlvbi5yZW1vdmUoc2NvcGUuY29sbGVjdGlvbi5nZXQoaW5kZXgpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5wcmltaXRpdmVzLmFkZChzY29wZS5jb2xsZWN0aW9uKTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5wcmltaXRpdmVzLnJlbW92ZShzY29wZS5jb2xsZWN0aW9uKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMTcvMDEvMTUuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY0NvbXBsZXhMYXllcicsIGZ1bmN0aW9uKCRsb2cpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICByZXF1aXJlIDogJ15hY01hcCcsXG4gICAgY29tcGlsZSA6IGZ1bmN0aW9uKGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICBpZiAoYXR0cnMub2JzZXJ2YWJsZUNvbGxlY3Rpb24pIHtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGVsZW1lbnQuY2hpbGRyZW4oKSwgZnVuY3Rpb24gKGNoaWxkKSB7XG5cbiAgICAgICAgICB2YXIgbGF5ZXIgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICBpZiAoY2hpbGQudGFnTmFtZSA9PT0gJ0JJTExCT0FSRCcpIHtcbiAgICAgICAgICAgIGxheWVyID0gYW5ndWxhci5lbGVtZW50KCc8YmlsbGJvYXJkcy1sYXllcj48L2JpbGxib2FyZHMtbGF5ZXI+Jyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGNoaWxkLnRhZ05hbWUgPT09ICdMQUJFTCcpIHtcbiAgICAgICAgICAgIGxheWVyID0gYW5ndWxhci5lbGVtZW50KCc8bGFiZWxzLWxheWVyPjwvbGFiZWxzLWxheWVyPicpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghbGF5ZXIpIHtcbiAgICAgICAgICAgICRsb2cud2FybignRm91bmQgYW4gdW5rbm93biBjaGlsZCBvZiBvZiBjb21wbGV4LWxheWVyLiBSZW1vdmluZy4uLicpO1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KGNoaWxkKS5yZW1vdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goY2hpbGQuYXR0cmlidXRlcywgZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgICAgICAgICAgbGF5ZXIuYXR0cihhdHRyLm5hbWUsIGF0dHIudmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goZWxlbWVudFswXS5hdHRyaWJ1dGVzLCBmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICAgICAgICBpZiAoIWFuZ3VsYXIuZWxlbWVudChjaGlsZCkuYXR0cihhdHRyLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgbGF5ZXIuYXR0cihhdHRyLm5hbWUsIGF0dHIudmFsdWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudChjaGlsZCkucmVwbGFjZVdpdGgobGF5ZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBiaXBvbCBvbiAwMS8yMC8xNi5cbiAqL1xuXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYWNHZW9jb2RlcicsIGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgcmVxdWlyZSA6ICdeYWNNYXAnLFxuICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgdGVtcGxhdGUgOiAnPGRpdiBpZD1cImdlb2NvZGVyQ29udGFpbmVyXCIgY2xhc3M9XCJjZXNpdW0tdmlld2VyLWdlb2NvZGVyQ29udGFpbmVyXCI+PC9kaXY+JyxcbiAgICBjb250cm9sbGVyIDogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgfSxcbiAgICBsaW5rIDp7XG4gICAgICBwcmU6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNNYXBDdHJsKSB7XG4gICAgICAgIHNjb3BlLmdlb2NvZGVyID0gbnVsbDtcblxuICAgICAgICBzY29wZS5nZW9jb2RlciA9IG5ldyBDZXNpdW0uR2VvY29kZXIoe1xuICAgICAgICAgIGNvbnRhaW5lcjogJ2dlb2NvZGVyQ29udGFpbmVyJyxcbiAgICAgICAgICBzY2VuZTogYWNNYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLFxuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgYWNNYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLmdlb2NvZGVyLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgYmlwb2wgb24gMDEvMjAvMTYuXG4gKi9cbid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2FjSW1hZ2VyeVZpZXdNb2RlbHMnLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICByZXF1aXJlIDogJ15hY0Jhc2VMYXllclBpY2tlcicsXG4gICAgc2NvcGUgOiB7XG4gICAgICBuYW1lOiAnJicsXG4gICAgICBpY29uVXJsOiAnJicsXG4gICAgICB0b29sdGlwOiAnJicsXG4gICAgICBjcmVhdGlvbkZ1bmN0aW9uOiAnJidcbiAgICB9LFxuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgQ2VzaXVtKSB7XG4gICAgICAkc2NvcGUuY2VzaXVtRmFjdG9yeSA9IENlc2l1bTtcbiAgICB9LFxuICAgIGxpbmsgOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGFjQmFzZUxheWVyUGlja2VyQ3RybCkge1xuICAgICAgdmFyIGl0ZW0gPSBuZXcgc2NvcGUuY2VzaXVtRmFjdG9yeS5Qcm92aWRlclZpZXdNb2RlbCh7XG4gICAgICAgIG5hbWU6IHNjb3BlLm5hbWUoKSxcbiAgICAgICAgaWNvblVybDogc2NvcGUuaWNvblVybCgpLFxuICAgICAgICB0b29sdGlwOiBzY29wZS50b29sdGlwKCksXG4gICAgICAgIGNyZWF0aW9uRnVuY3Rpb246IHNjb3BlLmNyZWF0aW9uRnVuY3Rpb25cbiAgICAgIH0pO1xuXG4gICAgICBhY0Jhc2VMYXllclBpY2tlckN0cmwucHVzaFByb3ZpZGVyVmlld01vZGVsKCdpbWFnZXJ5UHJvdmlkZXJWaWV3TW9kZWxzJywgaXRlbSk7XG5cbiAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGFjQmFzZUxheWVyUGlja2VyQ3RybC5nZXRJbWFnZXJ5Vmlld01vZGVscygpLCBmdW5jdGlvbih2YWwsIGtleSkge1xuICAgICAgICAgIC8vIHJlbW92ZSB0aGUgZWxlbWVudFxuICAgICAgICAgIGlmICh2YWwgPT09IHByb3ZpZGVyKSB7XG4gICAgICAgICAgICBhY0Jhc2VMYXllclBpY2tlckN0cmwuZ2V0SW1hZ2VyeVZpZXdNb2RlbHMoKS5zcGxpY2Uoa2V5LCAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59KTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBuZXRhbmVsIG9uIDA5LzAxLzE1LlxuICovXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYWNMYWJlbCcsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0IDogJ0UnLFxuICAgIHJlcXVpcmUgOiAnXmFjTGFiZWxzTGF5ZXInLFxuICAgIHNjb3BlIDoge1xuICAgICAgY29sb3IgOiAnJicsXG4gICAgICB0ZXh0IDogJyYnLFxuICAgICAgcG9zaXRpb24gOiAnJidcbiAgICB9LFxuICAgIGxpbmsgOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGFjTGFiZWxzTGF5ZXJDdHJsKSB7XG4gICAgICB2YXIgbGFiZWxEZXNjID0ge307XG5cbiAgICAgIHZhciBwb3NpdGlvbiA9IHNjb3BlLnBvc2l0aW9uKCk7XG4gICAgICBsYWJlbERlc2MucG9zaXRpb24gPSBDZXNpdW0uQ2FydGVzaWFuMy5mcm9tRGVncmVlcyhOdW1iZXIocG9zaXRpb24ubG9uZ2l0dWRlKSB8fCAwLCBOdW1iZXIocG9zaXRpb24ubGF0aXR1ZGUpIHx8IDAsIE51bWJlcihwb3NpdGlvbi5hbHRpdHVkZSkgfHwgMCk7XG5cbiAgICAgIHZhciBjb2xvciA9IHNjb3BlLmNvbG9yKCk7XG4gICAgICBpZiAoY29sb3IpIHtcbiAgICAgICAgbGFiZWxEZXNjLmNvbG9yID0gY29sb3I7XG4gICAgICB9XG5cbiAgICAgIGxhYmVsRGVzYy50ZXh0ID0gc2NvcGUudGV4dCgpO1xuXG4gICAgICB2YXIgbGFiZWwgPSBhY0xhYmVsc0xheWVyQ3RybC5nZXRMYWJlbENvbGxlY3Rpb24oKS5hZGQobGFiZWxEZXNjKTtcblxuICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBhY0xhYmVsc0xheWVyQ3RybC5nZXRMYWJlbENvbGxlY3Rpb24oKS5yZW1vdmUobGFiZWwpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59KTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBuZXRhbmVsIG9uIDA5LzAxLzE1LlxuICovXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYWNMYWJlbHNMYXllcicsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0IDogJ0UnLFxuICAgIHJlcXVpcmUgOiAnXmFjTWFwJyxcbiAgICBzY29wZSA6IHt9LFxuICAgIGNvbnRyb2xsZXIgOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgIHRoaXMuZ2V0TGFiZWxDb2xsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUuY29sbGVjdGlvbjtcbiAgICAgIH1cbiAgICB9LFxuICAgIGxpbmsgOiB7XG4gICAgICBwcmU6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMsIGFjTWFwQ3RybCkge1xuICAgICAgICBzY29wZS5jb2xsZWN0aW9uID0gbmV3IENlc2l1bS5MYWJlbENvbGxlY3Rpb24oKTtcbiAgICAgICAgYWNNYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLnByaW1pdGl2ZXMuYWRkKHNjb3BlLmNvbGxlY3Rpb24pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgYWNNYXBDdHJsLmdldENlc2l1bVdpZGdldCgpLnNjZW5lLnByaW1pdGl2ZXMucmVtb3ZlKHNjb3BlLmNvbGxlY3Rpb24pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMDkvMDEvMTUuXG4gKi9cbid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2FjTWFwJywgZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIGdldFNjZW5lTW9kZShkaW1lbnNpb25zKSB7XG4gICAgaWYgKGRpbWVuc2lvbnMgPT0gMikge1xuICAgICAgcmV0dXJuIENlc2l1bS5TY2VuZU1vZGUuU0NFTkUyRDtcbiAgICB9XG4gICAgZWxzZSBpZiAoZGltZW5zaW9ucyA9PSAyLjUpIHtcbiAgICAgIHJldHVybiBDZXNpdW0uU2NlbmVNb2RlLkNPTFVNQlVTX1ZJRVc7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIENlc2l1bS5TY2VuZU1vZGUuU0NFTkUzRDtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJbWFnZXJ5UHJvdmlkZXJCb29sZWFuKGJvb2wpIHtcbiAgICBpZiAoYm9vbCA9PSAnZmFsc2UnKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgdGVtcGxhdGUgOiAnPGRpdj4gPG5nLXRyYW5zY2x1ZGU+PC9uZy10cmFuc2NsdWRlPiA8ZGl2IGNsYXNzPVwibWFwLWNvbnRhaW5lclwiPjwvZGl2PiA8L2Rpdj4nLFxuICAgIHRyYW5zY2x1ZGUgOiB0cnVlLFxuICAgIHNjb3BlIDoge1xuICAgICAgZGltZW5zaW9ucyA6ICdAJyxcbiAgICAgIGltYWdlcnlQcm92aWRlciA6ICdAJ1xuICAgIH0sXG4gICAgY29udHJvbGxlciA6IGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuZ2V0Q2VzaXVtV2lkZ2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUuY2VzaXVtO1xuICAgICAgfVxuICAgIH0sXG4gICAgbGluayA6IHtcbiAgICAgIHByZTogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIGlmICghc2NvcGUuZGltZW5zaW9ucykge1xuICAgICAgICAgIHNjb3BlLmRpbWVuc2lvbnMgPSAzO1xuICAgICAgICB9XG5cbiAgICAgICAgc2NvcGUuY2VzaXVtID0gbmV3IENlc2l1bS5DZXNpdW1XaWRnZXQoZWxlbWVudC5maW5kKCdkaXYnKVswXSwge1xuICAgICAgICAgIHNjZW5lTW9kZTogZ2V0U2NlbmVNb2RlKHNjb3BlLmRpbWVuc2lvbnMpLFxuICAgICAgICAgIGltYWdlcnlQcm92aWRlcjogZ2V0SW1hZ2VyeVByb3ZpZGVyQm9vbGVhbihzY29wZS5pbWFnZXJ5UHJvdmlkZXIpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGdpbG5pczIgb24gMTgvMDEvMTUuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyQ2VzaXVtJykuZGlyZWN0aXZlKCdhY1BvbHlsaW5lJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRScsXG4gICAgcmVxdWlyZSA6ICdeYWNQb2x5bGluZXNMYXllcicsXG4gICAgc2NvcGUgOiB7XG4gICAgICBjb2xvciA6ICcmJyxcbiAgICAgIHdpZHRoIDogJyYnLFxuICAgICAgcG9zaXRpb25zIDogJyYnXG4gICAgfSxcbiAgICBsaW5rIDogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBhY1BvbHlsaW5lc0xheWVyQ3RybCkge1xuICAgICAgdmFyIHBvbHlsaW5lRGVzYyA9IHt9O1xuXG4gICAgICBpZiAoIWFuZ3VsYXIuaXNEZWZpbmVkKHNjb3BlLnBvc2l0aW9ucykgfHwgIWFuZ3VsYXIuaXNGdW5jdGlvbihzY29wZS5wb3NpdGlvbnMpKXtcbiAgICAgICAgdGhyb3cgXCJQb2x5bGluZSBwb3NpdGlvbnMgbXVzdCBiZSBkZWZpbmVkIGFzIGEgZnVuY3Rpb25cIjtcbiAgICAgIH1cbiAgICAgIHZhciBwb3NpdGlvbnMgPSBzY29wZS5wb3NpdGlvbnMoKTtcbiAgICAgIHBvbHlsaW5lRGVzYy5wb3NpdGlvbnMgPSBbXTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChwb3NpdGlvbnMsIGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG4gICAgICAgIHBvbHlsaW5lRGVzYy5wb3NpdGlvbnMucHVzaChDZXNpdW0uQ2FydGVzaWFuMy5mcm9tRGVncmVlcyhOdW1iZXIocG9zaXRpb24ubG9uZ2l0dWRlKSB8fCAwLCBOdW1iZXIocG9zaXRpb24ubGF0aXR1ZGUpIHx8IDAsIE51bWJlcihwb3NpdGlvbi5hbHRpdHVkZSkgfHwgMCkpO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBjZXNpdW1Db2xvciA9IENlc2l1bS5Db2xvci5mcm9tQ3NzQ29sb3JTdHJpbmcoJ2JsYWNrJyk7XG4gICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQoc2NvcGUuY29sb3IpICYmIGFuZ3VsYXIuaXNGdW5jdGlvbihzY29wZS5jb2xvcikpe1xuICAgICAgICBjZXNpdW1Db2xvciA9IENlc2l1bS5Db2xvci5mcm9tQ3NzQ29sb3JTdHJpbmcoc2NvcGUuY29sb3IoKSk7XG4gICAgICAgIH1cbiAgICAgIHBvbHlsaW5lRGVzYy5tYXRlcmlhbCA9IENlc2l1bS5NYXRlcmlhbC5mcm9tVHlwZSgnQ29sb3InKTtcbiAgICAgIHBvbHlsaW5lRGVzYy5tYXRlcmlhbC51bmlmb3Jtcy5jb2xvciA9IGNlc2l1bUNvbG9yO1xuXG4gICAgICBwb2x5bGluZURlc2Mud2lkdGggPSAxO1xuICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHNjb3BlLndpZHRoKSAmJiBhbmd1bGFyLmlzRnVuY3Rpb24oc2NvcGUud2lkdGgpKXtcbiAgICAgICAgcG9seWxpbmVEZXNjLndpZHRoID0gc2NvcGUud2lkdGgoKTtcbiAgICAgIH1cblxuICAgICAgdmFyIHBvbHlsaW5lID0gYWNQb2x5bGluZXNMYXllckN0cmwuZ2V0UG9seWxpbmVDb2xsZWN0aW9uKCkuYWRkKHBvbHlsaW5lRGVzYyk7XG5cbiAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgYWNQb2x5bGluZXNMYXllckN0cmwuZ2V0UG9seWxpbmVDb2xsZWN0aW9uKCkucmVtb3ZlKHBvbHlsaW5lKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgZ2lsbmlzMiBvbiAxOC8wMS8xNS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2FjUG9seWxpbmVzTGF5ZXInLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICByZXF1aXJlIDogJ15hY01hcCcsXG4gICAgc2NvcGUgOiB7fSxcbiAgICBjb250cm9sbGVyIDogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICB0aGlzLmdldFBvbHlsaW5lQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJHNjb3BlLmNvbGxlY3Rpb247XG4gICAgICB9XG4gICAgfSxcbiAgICBsaW5rIDoge1xuICAgICAgcHJlOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBhY01hcEN0cmwpIHtcbiAgICAgICAgc2NvcGUuY29sbGVjdGlvbiA9IG5ldyBDZXNpdW0uUG9seWxpbmVDb2xsZWN0aW9uKCk7XG4gICAgICAgIGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5wcmltaXRpdmVzLmFkZChzY29wZS5jb2xsZWN0aW9uKTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5wcmltaXRpdmVzLnJlbW92ZShzY29wZS5jb2xsZWN0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBiaXBvbCBvbiAwMS8yNS8xNi5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhckNlc2l1bScpLmRpcmVjdGl2ZSgnYWNUZXJyYWluVmlld01vZGVscycsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0IDogJ0UnLFxuICAgIHJlcXVpcmUgOiAnXmFjQmFzZUxheWVyUGlja2VyJyxcbiAgICBzY29wZSA6IHtcbiAgICAgIG5hbWU6ICcmJyxcbiAgICAgIGljb25Vcmw6ICcmJyxcbiAgICAgIHRvb2x0aXA6ICcmJyxcbiAgICAgIGNyZWF0aW9uRnVuY3Rpb246ICcmJ1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBDZXNpdW0pIHtcbiAgICAgICRzY29wZS5jZXNpdW1GYWN0b3J5ID0gQ2VzaXVtO1xuICAgIH0sXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNCYXNlTGF5ZXJQaWNrZXJDdHJsKSB7XG4gICAgICB2YXIgaXRlbSA9IG5ldyBzY29wZS5jZXNpdW1GYWN0b3J5LlByb3ZpZGVyVmlld01vZGVsKHtcbiAgICAgICAgbmFtZTogc2NvcGUubmFtZSgpLFxuICAgICAgICBpY29uVXJsOiBzY29wZS5pY29uVXJsKCksXG4gICAgICAgIHRvb2x0aXA6IHNjb3BlLnRvb2x0aXAoKSxcbiAgICAgICAgY3JlYXRpb25GdW5jdGlvbjogc2NvcGUuY3JlYXRpb25GdW5jdGlvblxuICAgICAgfSk7XG5cbiAgICAgIGFjQmFzZUxheWVyUGlja2VyQ3RybC5wdXNoUHJvdmlkZXJWaWV3TW9kZWwoJ3RlcnJhaW5Qcm92aWRlclZpZXdNb2RlbHMnLCBpdGVtKTtcblxuICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goYWNCYXNlTGF5ZXJQaWNrZXJDdHJsLmdldFRlcnJhaW5WaWV3TW9kZWxzKCksIGZ1bmN0aW9uKHZhbCwga2V5KSB7XG4gICAgICAgICAgLy8gcmVtb3ZlIHRoZSBlbGVtZW50XG4gICAgICAgICAgaWYgKHZhbCA9PT0gcHJvdmlkZXIpIHtcbiAgICAgICAgICAgIGFjQmFzZUxheWVyUGlja2VyQ3RybC5nZXRUZXJyYWluVmlld01vZGVscygpLnNwbGljZShrZXksIDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IG5ldGFuZWwgb24gMDkvMDEvMTUuXG4gKi9cblxuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXJDZXNpdW0nKS5kaXJlY3RpdmUoJ2FjV2ViTWFwU2VydmljZUxheWVyJywgZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICByZXF1aXJlIDogJ15hY01hcCcsXG4gICAgc2NvcGUgOiB7XG4gICAgICB1cmwgOiAnJicsXG4gICAgICBsYXllcnMgOiAnJicsXG4gICAgICBhbHBoYTogJyYnLFxuICAgIH0sXG4gICAgY29udHJvbGxlciA6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgIH0sXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgYWNNYXBDdHJsKSB7XG4gICAgICB2YXIgcHJvdmlkZXIgPSBuZXcgQ2VzaXVtLldlYk1hcFNlcnZpY2VJbWFnZXJ5UHJvdmlkZXIoe1xuICAgICAgICB1cmw6IHNjb3BlLnVybCgpLFxuICAgICAgICBsYXllcnMgOiBzY29wZS5sYXllcnMoKVxuICAgICAgfSk7XG5cbiAgICAgIHZhciBsYXllciA9IGFjTWFwQ3RybC5nZXRDZXNpdW1XaWRnZXQoKS5zY2VuZS5pbWFnZXJ5TGF5ZXJzLmFkZEltYWdlcnlQcm92aWRlcihwcm92aWRlcik7XG5cbiAgICAgIGlmIChzY29wZS5hbHBoYSgpKSB7XG4gICAgICAgIGxheWVyLmFscGhhID0gc2NvcGUuYWxwaGEoKTtcbiAgICAgIH1cblxuICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBhY01hcEN0cmwuZ2V0Q2VzaXVtV2lkZ2V0KCkuc2NlbmUuaW1hZ2VyeUxheWVycy5yZW1vdmUobGF5ZXIpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=