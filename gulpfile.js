var gulp = require('gulp');
var gutil = require('gulp-util');
var coffee = require('gulp-coffee');

gulp.task('coffee', function() {
	gulp.src('./*.coffee')
		.pipe(coffee().on('error', gutil.log))
		.pipe(gulp.dest('./demo/'))
		.pipe(gulp.dest('./dist/'))
		.pipe(gulp.dest('./'))
});

gulp.task('vendor', function () {
  gulp.src('./bower_components/angular-mousewheel/mousewheel.js')
    .pipe(gulp.dest('./demo/vendor/'))

  gulp.src('./bower_components/hamsterjs/hamster.js')
    .pipe(gulp.dest('./demo/vendor/'))
});

gulp.task('watch', function() {
  gulp.watch(['./*.coffee'], ['default']);
});

gulp.task('default', ['coffee', 'vendor'])