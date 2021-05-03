/*

Should have env vars of:
BUILD-TYPES: ['chrome', 'firefox', 'safari']
DEV_MODE: true/false default dev mode chrome



*/




// const fs = require('fs')
// const browserifiy = require('browserifiy')
// const babelifiy = require('babelifiy')
// const watchifiy = require('watchifiy')
// const DEV = process.env.DEV_MODE

// const background = browserifiy({
//   debug: DEV,
//   plugin: [watchifiy]
// }).transform(babelifiy.configure({
//     presets: ['@babel/preset-env'],
//     plugins: ['@babel/plugin-transform-typescript'],
//     extensions: ['.ts', '.tsx'],
//   }))
//   .require('src/extension/background.ts', {entry: true})

// if (DEV) b.on('update', bundle)

// bundle()

// function bundle (inpath, outpath) {
//   background.bundle()
//     .on('error', console.error)
//     .pipe(fs.createWriteStream(outpath))
// }



// npm install --save-dev gulp babelify browserify babel-preset-es2015 gulp-connect vinyl-source-stream vinyl-buffer gulp-uglify gulp-sourcemaps

/*
folder structure:
build
src/js/index.js
static/index.html
package.json
gulpfile.js
*/

// Gulpfile.js:
//Include required modules
const gulp = require("gulp")
const babelify = require('babelify')
const browserify = require("browserify")
const babelifiy = require('babelifiy')
const connect = require("gulp-connect")
const source = require("vinyl-source-stream")
const buffer = require("vinyl-buffer")
const uglify = require("gulp-uglify")
const sourcemaps = require("gulp-sourcemaps")
const livereload = require('gulp-livereload')


//Default task. This will be run when no task is passed in arguments to gulp
gulp.task("default",["copyStaticFiles", "build", "startServer"]);

//Copy static files from html folder to build folder
gulp.task("copyStaticFiles", function(){
  return gulp.src("./static/*.*")
  .pipe(gulp.dest("./build"));
});

//Convert ES6 ode in all js files in src/js folder and copy to
//build folder as bundle.js
gulp.task("build", function(){
  return browserify({
      entries: ["./src/js/index.js"]
  })
  .transform(babelify.configure({
    presets: ['@babel/preset-env'],
    plugins: ['@babel/plugin-transform-typescript'],
    extensions: ['.ts', '.tsx'],
  }))
  .bundle()
  .pipe(source("bundle.js"))
  .pipe(buffer())
  .pipe(sourcemaps.init())
  .pipe(uglify())
  .pipe(sourcemaps.write('./maps'))
  .pipe(gulp.dest("./build"));
});

// start by typing gulp start
gulp.task("start", function(){
gulp.start("copyStaticFiles", "build", "startServer")
});

//Start a test server with doc root at build folder and
//listening to 8888 port. Home page = http://localhost:8888
gulp.task("startServer", function(){
  connect.server({
      root : "./build",
      livereload : true,
      port : 8888
  });
});