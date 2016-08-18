# angular-cesium
Use Cesium in the real angular way!

## Getting Started
`bower install angular-cesium`

## Usage
Using angular-cesium is easy as pie!
Just add it as a dependency:
```javascript
angular.module('myModule', ['angularCesium'])
  .controller('myController', function ($scope, ObservableCollection, Cesium) {
    // Be sure to change the Bing Maps Api Key!
    Cesium.BingMapsApi.defaultKey = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    $scope.layers = [];
    $scope.billboards = new ObservableCollection();
    $scope.billboards.add(0, {
      image : 'favicon.ico',
      color : 'blue',
      position : {
        latitude : 31,
        longitude : 34,
        altitude : 500
      }
    });
```
And start using the map components!
```html
<ac-map>
  <ac-web-map-service-layer ng-repeat="layer in layers" url="layer.url" layers="layer.layers"></ac-web-map-service-layer>
      <ac-billboards-layer>
        <ac-billboard ng-repeat="billboard in billboards.getData()"
          image="billboard.image"
          color="billboard.color"
          position="billboard.position"></ac-billboard>
      </ac-billboards-layer>
</ac-map>
```

## Example Project
https://github.com/netanelgilad/angular-cesium-example
