/*

Should have env vars of:
BUILD-TYPES: ['chrome', 'firefox', 'safari']
DEV_MODE: true/false default dev mode chrome



*/




const fs = require('fs')
const browserify = require('browserify')
const babelifiy = require('babelify')
const watchify = require('watchify')
const envify = require('envify/custom')
const livereload = require('browserify-livereload')
const DEV = process.env.DEV_MODE
const PLATFORM = process.env.PLATFORM_BUILD || 'chrome'
const OUT = `dist/${PLATFORM}/background.js`

const b = browserify({
  debug: DEV,
  plugin: [watchify]
}).transform(babelifiy.configure({
    presets: ['@babel/preset-env'],
    plugins: ['@babel/plugin-transform-typescript'],
    extensions: ['.ts', '.tsx'],
  }))
  .require('src/extension/background.ts', {entry: true})

if (DEV) {
   b.plugin(livereload, {
      host: 'localhost',
      port: 1337,
  }).transform(envify({
    DEV_MODE: true
  }))
  b.on('update', bundle)
}



bundle()

function bundle () {
  b.bundle()
    .on('error', console.error)
    .pipe(fs.createWriteStream(OUT))
}



// npm install --save-dev gulp babelify browserify babel-preset-es2015 gulp-connect vinyl-source-stream vinyl-buffer gulp-uglify gulp-sourcemaps

// /*
// folder structure:
// build
// src/js/index.js
// static/index.html
// package.json
// gulpfile.js
// */

// // Gulpfile.js:
// //Include required modules
// const gulp = require('gulp')
// const babelify = require('babelify')
// const browserify = require('browserify')
// const babelifiy = require('babelifiy')
// const connect = require('gulp-connect')
// const source = require('vinyl-source-stream')
// const buffer = require('vinyl-buffer')
// const uglify = require('gulp-uglify')
// const sourcemaps = require('gulp-sourcemaps')
// const livereload = require('gulp-livereload')

// const DEV_MODE = process.env.DEV_MODE
// const DEV_MODE = process.env.PLATFORM_BUILD


// //Default task. This will be run when no task is passed in arguments to gulp
// gulp.task('default',['copyChromeLivereload', 'build', 'startServer']);

// //Copy static files from html folder to build folder
// // gulp.task('copyStaticFiles', function(){
// //   return gulp.src('./static/*.*')
// //   .pipe(gulp.dest('./build'));
// // });

// if (DEV_MODE) {
//   gulp.task('copyChromeLivereload', function(){
//     return gulp.src('./static/*.*')
//     .pipe(gulp.dest('./dist/'));
//   });
// }


// //Convert ES6 ode in all js files in src/js folder and copy to
// //build folder as bundle.js
// gulp.task('build', function(){
//   return browserify({
//       entries: ['./src/js/index.js']
//   })
//   .transform(babelify.configure({
//     presets: ['@babel/preset-env'],
//     plugins: ['@babel/plugin-transform-typescript'],
//     extensions: ['.ts', '.tsx'],
//   }))
//   .bundle()
//   .pipe(source('bundle.js'))
//   .pipe(buffer())
//   .pipe(sourcemaps.init())
//   .pipe(uglify())
//   .pipe(sourcemaps.write('./maps'))
//   .pipe(gulp.dest('./build'));
// });

// // start by typing gulp start
// gulp.task('start', function(){
// gulp.start('copyStaticFiles', 'build', 'startServer')
// });

// //Start a test server with doc root at build folder and
// //listening to 8888 port. Home page = http://localhost:8888
// gulp.task('startServer', function(){
//   connect.server({
//       root : './build',
//       livereload : true,
//       port : 8888
//   });
// });