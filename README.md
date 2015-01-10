# angular-cesium
Use Cesium in the real angular way!

## Getting Started
`bower install angular-cesium`

## Usage
Using angular-cesium is easy as pie!
Just add it as a dependency:
<pre><code>
angular.module('myModule', ['angularCesium']);
</code></pre>
And start using the map components!
```html
<map>
  <web-map-service-layer ng-repeat="layer in layers" url="layer.url" layers="layer.layers"></web-map-service-layer>
      <billboards-layer>
        <billboard ng-repeat="billboard in billboards"
          image="billboard.image"
          color="billboard.color"
          position="billboard.position"></billboard>
      </billboards-layer>
</map>
```

## Example Project
https://github.com/netanelgilad/angular-cesium-example
