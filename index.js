#!/usr/bin/env node

// core modules
var path = require('path');
var fs = require('fs');
var extname = path.extname;

// dependency modules
var _ = require('underscore');
var filesize = require('filesize');
var argv = require('optimist').argv;
var before = argv.before;
var after = argv.after;

// if --before is not directory
if (!fs.statSync(before).isDirectory()) {
  throw new Error(before + ' is not a directory.');
}

// if --after is not directory
if (!fs.statSync(after).isDirectory()) {
  throw new Error(after + ' is not a directory.');
}

// target image extension
const imgext = ['.png', '.webp', '.gif', '.jpg', '.jpeg'];

// images in before directory
var befores = fs.readdirSync(before).filter(function (filename) {
  return imgext.some(function (ext) {
    return filename.endsWith(ext);
  });
});

// images in after directory
var afters = fs.readdirSync(after).filter(function (filename) {
  return imgext.some(function (ext) {
    return filename.endsWith(ext);
  });
});

// intersected filename
var images = _.intersection(befores, afters);

// get file sizes
var beforeFileSize = {};
_.each(befores, function (b) {
  var size = fs.statSync(path.join(before, b)).size;
  beforeFileSize[b] = filesize(size);
});

// get file sizes
var afterFileSize = {};
_.each(afters, function (b) {
  var size = fs.statSync(path.join(after, b)).size;
  afterFileSize[b] = filesize(size);
});

// koa modules
var koa = require('koa');
var logger = require('koa-logger');
var route = require('koa-route');
var views = require('co-views');

var app = koa();

app.use(logger());
app.use(route.get('/', index));
app.use(route.get('/before/*', streamGenerator(before)));
app.use(route.get('/after/*', streamGenerator(after)));

// renderer
var render = views(__dirname + '/views', {
  default: 'jade'
});

// route
function *index() {
  this.body = yield render('compare', {
    images: images,
    beforeFileSize: beforeFileSize,
    afterFileSize: afterFileSize
  });
}

// stream for directories (before and after)
function streamGenerator (target) {
  return function *readStream() {
    var filename = path.basename(this.path);
    var filepath = path.join(target, filename);
    this.body = fs.createReadStream(filepath);
  };
}

// start server on 3000 port
if (!module.parent) {
  app.listen(3000);
}