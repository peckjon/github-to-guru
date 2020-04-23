# strip-filename-increment [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=W8YFZ425KND68) [![NPM version](https://img.shields.io/npm/v/strip-filename-increment.svg?style=flat)](https://www.npmjs.com/package/strip-filename-increment) [![NPM monthly downloads](https://img.shields.io/npm/dm/strip-filename-increment.svg?style=flat)](https://npmjs.org/package/strip-filename-increment) [![NPM total downloads](https://img.shields.io/npm/dt/strip-filename-increment.svg?style=flat)](https://npmjs.org/package/strip-filename-increment) [![Build Status](https://travis-ci.org/jonschlinkert/strip-filename-increment.svg?branch=master)](https://travis-ci.org/jonschlinkert/strip-filename-increment)

> Operating systems commonly add a trailing increment, or the word 'copy', or something similar to duplicate files. This strips those increments. Tested on Windows, MacOS, and Linux.

Please consider following this project's author, [Jon Schlinkert](https://github.com/jonschlinkert), and consider starring the project to show your :heart: and support.

## Install

Install with [npm](https://www.npmjs.com/) (requires [Node.js](https://nodejs.org/en/) >=8):

```sh
$ npm install --save strip-filename-increment
```

## Usage

```js
const strip = require('strip-filename-increment');
```

## API

### [strip](index.js#L34)

Remove trailing increments from the `dirname` and/or `stem` (basename
without extension) of the given file path or object.

**Params**

* `file` **{Sring|Object}**: If the file is an object, it must have a `path` property.
* `options` **{Object}**: See [available options](#options).
* `returns` **{String|Object}**: Returns the same type that was given.

### [.increment](index.js#L62)

Removes trailing increments from the given string.

**Params**

* `input` **{String}**
* `options` **{Object}**: See [available options](#options).
* `returns` **{String}**

**Example**

```js
console.log(strip.increment('foo (2)')); => 'foo'
console.log(strip.increment('foo (copy)')); => 'foo'
console.log(strip.increment('foo copy 2')); => 'foo'
```

### [.dirname](index.js#L86)

Removes trailing increments and returns the `dirname` of the given `filepath`.

**Params**

* `filepath` **{String}**
* `options` **{Object}**: See [available options](#options).
* `returns` **{String}**: Returns the `dirname` of the filepath, without increments.

**Example**

```js
console.log(strip.dirname('foo (2)/bar.txt')); => 'foo'
console.log(strip.dirname('foo (copy)/bar.txt')); => 'foo'
console.log(strip.dirname('foo copy 2/bar.txt')); => 'foo'
```

### [.stem](index.js#L107)

Removes trailing increments and returns the `stem` of the given `filepath`.

**Params**

* `filepath` **{String}**
* `options` **{Object}**: See [available options](#options).
* `returns` **{String}**: Returns the `stem` of the filepath, without increments.

**Example**

```js
console.log(strip.stem('foo/bar (2).txt')); //=> 'bar'
console.log(strip.stem('foo/bar (copy).txt')); //=> 'bar'
console.log(strip.stem('foo/bar copy 2.txt')); //=> 'bar'
console.log(strip.stem('foo/bar (2) copy.txt')); //=> 'bar'
console.log(strip.stem('foo/bar (2) - copy.txt')); //=> 'bar'
```

### [.basename](index.js#L128)

Removes trailing increments and returns the `basename` of the given `filepath`.

**Params**

* `filepath` **{String}**
* `options` **{Object}**: See [available options](#options).
* `returns` **{String}**: Returns the `basename` of the filepath, without increments.

**Example**

```js
console.log(strip.basename('foo/bar (2).txt')); //=> 'bar.txt'
console.log(strip.basename('foo/bar (copy).txt')); //=> 'bar.txt'
console.log(strip.basename('foo/bar copy 2.txt')); //=> 'bar.txt'
console.log(strip.basename('foo/bar (2) copy.txt')); //=> 'bar.txt'
console.log(strip.basename('foo/bar (2) - copy.txt')); //=> 'bar.txt'
```

### [.path](index.js#L151)

Removes trailing increments from the `dirname` and `stem` of the given `filepath`.

**Params**

* `filepath` **{String}**
* `options` **{Object}**: See [available options](#options).
* `returns` **{String}**: Returns the `basename` of the filepath, without increments.

**Example**

```js
console.log(strip.path('foo copy/bar (2).txt')); //=> 'foo/bar.txt'
console.log(strip.path('foo (2)/bar (copy).txt')); //=> 'foo/bar.txt'
console.log(strip.path('foo (2)/bar copy 2.txt')); //=> 'foo/bar.txt'
console.log(strip.path('foo copy/bar (2) copy.txt')); //=> 'foo/bar.txt'
console.log(strip.path('foo copy/bar (2) - copy.txt')); //=> 'foo/bar.txt'
```

### [.file](index.js#L181)

Removes trailing increments from the `dirname` and `stem` properties of the given `file`.

**Params**

* `filepath` **{String}**
* `options` **{Object}**: See [available options](#options).
* `returns` **{String}**: Returns the `basename` of the filepath, without increments.

**Example**

```js
console.log(strip({ path: 'foo copy/bar (2).txt' }));
//=> { path: 'foo/bar.txt', dir: 'foo', base: 'bar.txt', name: 'bar', ext: '.txt' }
console.log(strip({ path: 'foo (2)/bar (copy).txt' }));
//=> { path: 'foo/bar.txt', dir: 'foo', base: 'bar.txt', name: 'bar', ext: '.txt' }
console.log(strip({ path: 'foo (2)/bar copy 2.txt' }));
//=> { path: 'foo/bar.txt', dir: 'foo', base: 'bar.txt', name: 'bar', ext: '.txt' }
console.log(strip({ path: 'foo copy/bar (2) copy.txt' }));
//=> { path: 'foo/bar.txt', dir: 'foo', base: 'bar.txt', name: 'bar', ext: '.txt' }
console.log(strip({ path: 'foo copy/bar (2) - copy.txt' }));
//=> { path: 'foo/bar.txt', dir: 'foo', base: 'bar.txt', name: 'bar', ext: '.txt' }
```

## Options

### removeRawNumbers

Remove "raw" trailing numbers that might not actually be increments. Use this with caution.

**Type**: `boolean`

**Default**: `undefined`

**Example**:

```js
console.log(strip('foo 1')); //=> 'foo 1'
console.log(strip('foo 1', { removeRawNumbers: true })); //=> 'foo'

console.log(strip('foo (1) 1')); //=> 'foo (1) 1'
console.log(strip('foo (1) 1', { removeRawNumbers: true })); //=> 'foo'

// This following example is not touched either way, 
// since it's definitely not an increment.
console.log(strip('foo [1]')); //=> 'foo [1]'
console.log(strip('foo [1]', { removeRawNumbers: true })); //=> 'foo [1]'
```

## Examples

### Windows path increments

All of the following would return `foo`

```js
console.log(strip('foo (1)'));  
console.log(strip('foo (2)'));  
console.log(strip('foo (22)')); 
```

All of the following would return `foo.txt`

```js
console.log(strip('foo (1).txt'));  
console.log(strip('foo (2).txt'));  
console.log(strip('foo (22).txt')); 
```

### MacOS path increments

All of the following would return `foo`

```js
console.log(strip('foo copy'));
console.log(strip('foo copy 1'));
console.log(strip('foo copy 2'));
console.log(strip('foo copy 21'));
console.log(strip('foo copy 219 copy 219'));
```

All of the following would return `foo.txt`

```js
console.log(strip('foo copy.txt'));
console.log(strip('foo copy 1.txt'));
console.log(strip('foo copy 2.txt'));
console.log(strip('foo copy 21.txt'));
console.log(strip('foo copy 219 copy 219.txt'));
```

## About

<details>
<summary><strong>Contributing</strong></summary>

Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](../../issues/new).

Please read the [contributing guide](.github/contributing.md) for advice on opening issues, pull requests, and coding standards.

</details>

<details>
<summary><strong>Running Tests</strong></summary>

Running and reviewing unit tests is a great way to get familiarized with a library and its API. You can install dependencies and run tests with the following command:

```sh
$ npm install && npm test
```

</details>

<details>
<summary><strong>Building docs</strong></summary>

_(This project's readme.md is generated by [verb](https://github.com/verbose/verb-generate-readme), please don't edit the readme directly. Any changes to the readme must be made in the [.verb.md](.verb.md) readme template.)_

To generate the readme, run the following command:

```sh
$ npm install -g verbose/verb#dev verb-generate-readme && verb
```

</details>

### Author

**Jon Schlinkert**

* [GitHub Profile](https://github.com/jonschlinkert)
* [Twitter Profile](https://twitter.com/jonschlinkert)
* [LinkedIn Profile](https://linkedin.com/in/jonschlinkert)

### License

Copyright © 2019, [Jon Schlinkert](https://github.com/jonschlinkert).
Released under the [MIT License](LICENSE).

***

_This file was generated by [verb-generate-readme](https://github.com/verbose/verb-generate-readme), v0.8.0, on September 04, 2019._