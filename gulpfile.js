var gulp = require('gulp');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var ngAnnotate = require('gulp-ng-annotate');
var uglify = require('gulp-uglify');

gulp.task('build', function() {
  gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(concat('angular-cesium.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist'));
});

gulp.task('dist', function () {
  return gulp.src('src/**/*.js')
    .pipe(concat('angular-cesium.min.js'))
    .pipe(ngAnnotate())
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['build', 'dist']);