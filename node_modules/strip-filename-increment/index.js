/*!
 * file-name <https://github.com/jonschlinkert/file-name>
 *
 * Copyright (c) 2015-present, Jon Schlinkert.
 * Licensed under the MIT License.
 */

'use strict';

const path = require('path');
const isObject = val => val !== null && typeof val === 'object' && !Array.isArray(val);

const constants = {
  REGEX_DARWIN: /( copy( [0-9]+)?)+$/i,
  REGEX_DEFAULT: /(( copy)?( \([0-9]+\)|[0-9]+)?)+$/i,
  REGEX_WIN32: /( \([0-9]+\))+$/i,
  REGEX_NON_STANDARD: /( \.\(incomplete\)| \([0-9]+\)|[- ]+)+$/i,
  REGEX_LINUX: /( \(((another|[0-9]+(th|st|nd|rd)) )?copy\))+$/i,
  REGEX_RAW_NUMBERS: '| [0-9]+',
  REGEX_SOURCE: ' \\((?:(another|[0-9]+(th|st|nd|rd)) )?copy\\)|copy( [0-9]+)?|\\.\\(incomplete\\)| \\([0-9]+\\)|[- ]+'
};

/**
 * Remove trailing increments from the `dirname` and/or `stem` (basename
 * without extension) of the given file path or object.
 *
 * @name strip
 * @param {Sring|Object} `file` If the file is an object, it must have a `path` property.
 * @param {Object} `options` See [available options](#options).
 * @return {String|Object} Returns the same type that was given.
 * @api public
 */

const strip = (file, options) => {
  if (!file) return file;
  if (isObject(file) && file.path) {
    return strip.file(file, options);
  }

  let filepath = strip.increment(file, options);
  let extname = path.extname(filepath);
  let dirname = strip.increment(path.dirname(filepath), options);
  let stem = strip.increment(path.basename(filepath, extname), options);
  return path.join(dirname, stem + extname);
};

/**
 * Removes trailing increments from the given string.
 *
 * ```js
 * console.log(strip.increment('foo (2)')); => 'foo'
 * console.log(strip.increment('foo (copy)')); => 'foo'
 * console.log(strip.increment('foo copy 2')); => 'foo'
 * ```
 * @name .increment
 * @param {String} `input`
 * @param {Object} `options` See [available options](#options).
 * @return {String}
 * @api public
 */

strip.increment = (input, options = {}) => {
  if (typeof input === 'string' && input !== '') {
    let suffix = options.removeRawNumbers === true ? constants.REGEX_RAW_NUMBERS : '';
    let source = constants.REGEX_SOURCE + suffix;
    return input.replace(new RegExp(`(${source})+$`, 'i'), '');
  }
  return input;
};

/**
 * Removes trailing increments and returns the `dirname` of the given `filepath`.
 *
 * ```js
 * console.log(strip.dirname('foo (2)/bar.txt')); => 'foo'
 * console.log(strip.dirname('foo (copy)/bar.txt')); => 'foo'
 * console.log(strip.dirname('foo copy 2/bar.txt')); => 'foo'
 * ```
 * @name .dirname
 * @param {String} `filepath`
 * @param {Object} `options` See [available options](#options).
 * @return {String} Returns the `dirname` of the filepath, without increments.
 * @api public
 */

strip.dirname = (filepath, options) => {
  return strip.increment(path.dirname(filepath), options);
};

/**
 * Removes trailing increments and returns the `stem` of the given `filepath`.
 *
 * ```js
 * console.log(strip.stem('foo/bar (2).txt')); //=> 'bar'
 * console.log(strip.stem('foo/bar (copy).txt')); //=> 'bar'
 * console.log(strip.stem('foo/bar copy 2.txt')); //=> 'bar'
 * console.log(strip.stem('foo/bar (2) copy.txt')); //=> 'bar'
 * console.log(strip.stem('foo/bar (2) - copy.txt')); //=> 'bar'
 * ```
 * @name .stem
 * @param {String} `filepath`
 * @param {Object} `options` See [available options](#options).
 * @return {String} Returns the `stem` of the filepath, without increments.
 * @api public
 */

strip.stem = (filepath, options) => {
  return strip.increment(path.basename(filepath, path.extname(filepath)), options);
};

/**
 * Removes trailing increments and returns the `basename` of the given `filepath`.
 *
 * ```js
 * console.log(strip.basename('foo/bar (2).txt')); //=> 'bar.txt'
 * console.log(strip.basename('foo/bar (copy).txt')); //=> 'bar.txt'
 * console.log(strip.basename('foo/bar copy 2.txt')); //=> 'bar.txt'
 * console.log(strip.basename('foo/bar (2) copy.txt')); //=> 'bar.txt'
 * console.log(strip.basename('foo/bar (2) - copy.txt')); //=> 'bar.txt'
 * ```
 * @name .basename
 * @param {String} `filepath`
 * @param {Object} `options` See [available options](#options).
 * @return {String} Returns the `basename` of the filepath, without increments.
 * @api public
 */

strip.basename = (filepath, options) => {
  let extname = path.extname(filepath);
  let stem = path.basename(filepath, extname);
  return strip.increment(stem, options) + extname;
};

/**
 * Removes trailing increments from the `dirname` and `stem` of the given `filepath`.
 *
 * ```js
 * console.log(strip.path('foo copy/bar (2).txt')); //=> 'foo/bar.txt'
 * console.log(strip.path('foo (2)/bar (copy).txt')); //=> 'foo/bar.txt'
 * console.log(strip.path('foo (2)/bar copy 2.txt')); //=> 'foo/bar.txt'
 * console.log(strip.path('foo copy/bar (2) copy.txt')); //=> 'foo/bar.txt'
 * console.log(strip.path('foo copy/bar (2) - copy.txt')); //=> 'foo/bar.txt'
 * ```
 * @name .path
 * @param {String} `filepath`
 * @param {Object} `options` See [available options](#options).
 * @return {String} Returns the `basename` of the filepath, without increments.
 * @api public
 */

strip.path = (filepath, options) => {
  let extname = path.extname(filepath);
  let stem = strip.increment(path.basename(filepath, extname), options);
  let dirname = strip.increment(path.dirname(filepath), options);
  return path.join(dirname, stem + extname);
};

/**
 * Removes trailing increments from the `dirname` and `stem` properties
 * of the given `file`.
 *
 * ```js
 * console.log(strip({ path: 'foo copy/bar (2).txt' }));
 * //=> { path: 'foo/bar.txt', dir: 'foo', base: 'bar.txt', name: 'bar', ext: '.txt' }
 * console.log(strip({ path: 'foo (2)/bar (copy).txt' }));
 * //=> { path: 'foo/bar.txt', dir: 'foo', base: 'bar.txt', name: 'bar', ext: '.txt' }
 * console.log(strip({ path: 'foo (2)/bar copy 2.txt' }));
 * //=> { path: 'foo/bar.txt', dir: 'foo', base: 'bar.txt', name: 'bar', ext: '.txt' }
 * console.log(strip({ path: 'foo copy/bar (2) copy.txt' }));
 * //=> { path: 'foo/bar.txt', dir: 'foo', base: 'bar.txt', name: 'bar', ext: '.txt' }
 * console.log(strip({ path: 'foo copy/bar (2) - copy.txt' }));
 * //=> { path: 'foo/bar.txt', dir: 'foo', base: 'bar.txt', name: 'bar', ext: '.txt' }
 * ```
 * @name .file
 * @param {String} `filepath`
 * @param {Object} `options` See [available options](#options).
 * @return {String} Returns the `basename` of the filepath, without increments.
 * @api public
 */

strip.file = (file, options = {}) => {
  if (!isObject(file)) return file;
  if (!file.path) return file;

  if (file.dirname && !file.dir) file.dir = file.dirname;
  if (file.basename && !file.base) file.base = file.basename;
  if (file.extname && !file.ext) file.ext = file.extname;
  if (file.stem && !file.name) file.name = file.stem;

  if (file.dir === void 0) file.dir = path.dirname(file.path);
  if (file.ext === void 0) file.ext = path.extname(file.path);
  if (file.base === void 0) file.base = path.basename(file.path);
  if (file.name === void 0) file.name = path.basename(file.path, file.ext);

  file.name = strip.increment(file.name, options);
  file.dir = strip.increment(file.dir, options);
  file.base = file.name + file.ext;

  file.path = path.join(file.dir, file.base);
  return file;
};

module.exports = strip;
