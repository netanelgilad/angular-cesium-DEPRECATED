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
