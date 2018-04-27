## Base64 intended for use with couchdb

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
- [What is this?](#what-is-this)
- [Why create it](#why-create-it)
- [Install](#install)
- [Character set used](#character-set-used)
- [Simple example](#simple-example)
- [API](#api)
- [Test](#test)
<!-- END doctoc generated TOC please keep comment here to allow auto update -->
<br>


### What is this?

An encoding scheme intended for use with couchdb's document ids.  It is a naive
solution to the problem noted [in their documentation](http://docs.couchdb.org/en/2.1.1/maintenance/performance.html#document-s-id).

> Consequently you should consider generating ids yourself, allocating them
sequentially and using an encoding scheme that consumes fewer bytes. For
example, something that takes 16 hex digits to represent can be done in 4 base
62 digits (10 numerals, 26 lower case, 26 upper case).

<br>

### Why create it

traditional base64 has a few issues that aren't couchdb friendly

- contains the '/' character (gets url-encoded when used as a document id)
- character table is not ordered the same as ascii, which conflicts with the
  [goal of allocating sequential ids](https://eager.io/blog/how-long-does-an-id-need-to-be/#locality).

  *I couldn't find why base64's character table is ordered the way it is - please enlighten me!*

`couchdb-base64` solves the above two points by using [unreserved characters (rfc 3986)](https://tools.ietf.org/html/rfc3986#section-2.3) '.' and '-' as
alternatives to '+' and '/'.  It also orders these characters to match
ascii ordering.
<br>


### Install

npm install couchdb-base64
<br>


### Character set used

`-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`
<br>

### Simple example

```js
const couchdbBase64 = require('couchdb-base64')

const timestamp = 123456

const encodedTimestamp = couchdbBase64.encodeFromUInt({
  uint: timestamp,
  totalBits: 24
}),

assert(encodedTimestamp === '-S7-')
//
// The binary math
//
// '-' = 0
// 'S' = 30 * (64 ** 2) = 122880
// '7' = 9 * (64 ** 1) = 576
// '-' = 0
// 122880 + 576 = 123456
//

const decoded = couchdbBase64.decodeToUInt(encodedTimestamp)

assert(decoded === timestamp)
```


### API

`const couchdbBase64 = require('couchdb-base64')`

The default export holds an object with two methods

*Note: The arguments to these methods are strongly validated prior to running
operations on them.  Due to the low level nature of this library I wanted to
ensure nobody passed values which didn't match the intended use-case*

#### `encodeFromUInt({ uint: <int>, totalBits: <int> })`

Encodes the passed uint, zero padded to `totalBits`

Arguments
 - **uint** is an unsigned integer less than `Number.MAX_SAFE_INTEGER`
 - **totalBits** is a positive integer divisible by 6 (the number of bits which
   represent a base64 character).  totalBits allows you to pad your encoded
   value so the document id can remain incremental.  Because of this, if the
   uint passed takes more bits to represent than `totalBits`, an error is thrown
   as it is likely a bug.


#### `decodeToUInt(couchdbBase64String)`

Decodes the passed couchdb-base64 string to an unsigned integer

Arguments
 - **couchdbBase64String** a non-empty, valid couchdb-base64 string.  If it
   resolves to a uint larger than Number.MAX_SAFE_INTEGER then an error is
   thrown.


### Test

`./run test`
