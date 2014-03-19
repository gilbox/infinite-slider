var gulp = require('gulp');
var gutil = require('gulp-util');
var coffee = require('gulp-coffee');

gulp.task('default', function() {
	gulp.src('./*.coffee')
		.pipe(coffee().on('error', gutil.log))
		.pipe(gulp.dest('./demo/'))
		.pipe(gulp.dest('./dist/'))

	gulp.src('./bower_components/angular-mousewheel/mousewheel.js')
		.pipe(gulp.dest('./demo/vendor/'))

	gulp.src('./bower_components/hamsterjs/hamster.js')
		.pipe(gulp.dest('./demo/vendor/'))
});

gulp.task('watch', function() {
  gulp.watch(['./*.coffee'], ['default']);
});