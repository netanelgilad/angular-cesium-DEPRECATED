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
<ac-map>
  <ac-web-map-service-layer ng-repeat="layer in layers" url="layer.url" layers="layer.layers"></ac-web-map-service-layer>
      <ac-billboards-layer>
        <ac-billboard ng-repeat="billboard in billboards"
          image="billboard.image"
          color="billboard.color"
          position="billboard.position"></ac-billboard>
      </ac-billboards-layer>
</ac-map>
```

## Example Project
https://github.com/netanelgilad/angular-cesium-example
