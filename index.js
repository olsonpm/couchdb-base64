//
// README
//   - The string encoding and decoding was ripped directly from
//     https://github.com/dankogai/js-base64/blob/master/base64.js
//     And at the time was licensed under the BSD 3-Clause License
//     http://opensource.org/licenses/BSD-3-Clause
//
// TODO: split this file into modules and add a build -> release script.  Prior
//   to the string encoding and decoding, the file size was fine.
//

//---------//
// Imports //
//---------//

const tedent = require('tedent')

//------//
// Init //
//------//

const charset =
    '-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  zeroChar = charset[0],
  base64CharToIndex = mapBase64CharToIndex(charset),
  couchdbBase64Re = /^[0-9A-Za-z-.]+$/,
  atobRe = /[\s\S]{1,4}/g,
  btoaRe = /[\s\S]{1,3}/g,
  btouRe = getBToURe(),
  // eslint-disable-next-line no-control-regex
  utobRe = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g,
  fromCharCode = String.fromCharCode

//
//------//
// Main //
//------//

const decodeToString = (...args) => {
  validateDecodeFromStringArgs(...args)

  // no errors

  const [aString] = args

  return passThrough(aString, [atob, btou])
}

const encodeFromString = (...args) => {
  validateEncodeFromStringArgs(...args)

  // no errors

  const [aString] = args

  return passThrough(aString, [utob, btoa])
}

const encodeFromUInt = (...args) => {
  validateEncodeFromUIntArgs(...args)

  // no errors woo

  const { totalBits } = args[0]
  let { uint } = args[0]

  const result = []
  let numberOfCharsToPad = totalBits / 6

  //
  // This could be made more performant by checking for numbers that are larger
  //   than 32 bit and handling them separately.  Both cases could use bit
  //   operations instead of arithmetic, larger numbers would just need
  //   additional care.
  //
  while (uint > 0) {
    result.push(charset[uint % 64])
    uint = Math.floor(uint / 64)
    numberOfCharsToPad -= 1
  }

  const uintBase64 = result.reverse().join('')

  return pad0(numberOfCharsToPad) + uintBase64
}

const decodeToUInt = (...args) => {
  validateDecodeToUIntArgs(...args)

  const couchdbBase64String = args[0]

  let resultUint = 0

  const leastToMostSignificantChars = stripLeadingZeroes(couchdbBase64String)
    .split('')
    .reverse()
    .entries()

  for (const [index, character] of leastToMostSignificantChars) {
    const charsetIndex = base64CharToIndex[character]
    resultUint += charsetIndex * 64 ** index
  }

  validateResultUInt(resultUint)

  return resultUint
}

const isCouchdbBase64String = aString => couchdbBase64Re.test(aString)

//
//------------------//
// Helper Functions //
//------------------//

function passThrough(arg, arrayOfFunctions) {
  return arrayOfFunctions.reduce((result, aFunction) => aFunction(result), arg)
}

function applyEach(argArray, arrayOfFunctions) {
  arrayOfFunctions.forEach(fn => {
    fn.apply(null, argArray)
  })
  return argArray
}

function pad0(times) {
  return new Array(times + 1).join(zeroChar)
}

function stripLeadingZeroes(str) {
  let indexOfFirstNonZero = 0

  while (
    str[indexOfFirstNonZero] === zeroChar &&
    indexOfFirstNonZero < str.length
  ) {
    indexOfFirstNonZero += 1
  }

  return str.slice(indexOfFirstNonZero)
}

function validateEncodeFromStringArgs(...args) {
  applyEach(args, [
    validateSingleArg,
    validateTypeofStringArg,
    validateNonEmptyString,
  ])
}

function validateDecodeFromStringArgs(...args) {
  applyEach(args, [
    validateSingleArg,
    validateTypeofStringArg,
    validateNonEmptyString,
    validateCouchdbBase64String,
  ])
}

function validateSingleArg(...args) {
  if (args.length !== 1) {
    throw new Error(
      tedent(`
        This function takes exactly one argument

        You passed ${args.length}
        args passed: ${JSON.stringify(args, null, 2)}
      `)
    )
  }
}

function validateEncodeFromUIntArgs(...args) {
  validateSingleArg(...args)

  const firstArg = args[0]
  if (firstArg === null || typeof firstArg !== 'object') {
    throw new Error(
      tedent(`
        This function requires an object as its only argument

        typeof arg passed: ${typeof firstArg}
        arg passed: ${firstArg}
      `)
    )
  }

  const argKeys = Object.keys(firstArg),
    validKeys = ['uint', 'totalBits'],
    setOfKeysPassed = new Set(argKeys),
    missingKeys = validKeys.filter(key => !setOfKeysPassed.has(key))

  if (missingKeys.length) {
    throw new Error(
      tedent(`
        This function requires an object with the keys 'uint' an 'totalBits'

        missing keys: ${missingKeys.sort().join(', ')}
        all keys passed: ${argKeys.join(', ')}
      `)
    )
  }

  const { uint, totalBits } = firstArg
  if (!Number.isInteger(uint)) {
    throw new Error('uint is not an integer: ' + uint)
  }
  if (uint < 0) {
    throw new Error('uint must be positive: ' + uint)
  }
  if (uint > Number.MAX_SAFE_INTEGER) {
    throw new Error('uint is greater than Number.MAX_SAFE_INTEGER: ' + uint)
  }

  if (!Number.isInteger(totalBits)) {
    throw new Error('totalBits is not an integer: ' + totalBits)
  }
  if (totalBits < 1) {
    throw new Error('totalBits must be positive: ' + totalBits)
  }
  if (totalBits > 54) {
    throw new Error(
      tedent(`
        totalBits is greater than 54
        For the purpose of this library, there is no need to pad your bits
        larger than what is required for MAX_SAFE_INTEGER, which is 54

        totalBits: ${totalBits}
      `)
    )
  }

  if (totalBits % 6 !== 0) {
    throw new Error(
      tedent(`
        totalBits must be a multiple of 6, as each base64 character represents
        6 bits of information

        totalBits: ${totalBits}
        totalBits % 6: ${totalBits % 6}
      `)
    )
  }

  const minimumNumberOfBits = getMinimumNumberOfBitsToRepresentUInt(uint)
  if (minimumNumberOfBits > totalBits) {
    throw new Error(
      tedent(`
        The minimum number of bits to represent uint exceeds totalBits.  This is
        enforced because totalBits is meant to sustain sequential insertion of
        ids.  If you're passing in a uint larger than what's there for padding
        then you probably have a bug in your program

        minimum number of bits: ${minimumNumberOfBits}
        totalBits: ${totalBits}
      `)
    )
  }
}

function getMinimumNumberOfBitsToRepresentUInt(uint) {
  return uint.toString(2).length
}

function validateTypeofStringArg(hopefulString) {
  if (typeof hopefulString !== 'string') {
    throw new Error(
      tedent(`
        This function requires a string as its only argument

        typeof arg passed: ${typeof hopefulString}
        arg passed: ${hopefulString}
      `)
    )
  }
}

function validateCouchdbBase64String(hopefulCouchdbBase64String) {
  if (!isCouchdbBase64String(hopefulCouchdbBase64String)) {
    throw new Error(
      tedent(`
        Value is not a valid couchdbBase64 string.  It must pass the
        regex '${couchdbBase64Re}'

        value given: ${hopefulCouchdbBase64String}
      `)
    )
  }
}

function validateNonEmptyString(aString) {
  if (!aString.length) {
    throw new Error('string must be non-empty')
  }
}

function validateDecodeToUIntArgs(...args) {
  applyEach(args, [
    validateSingleArg,
    validateTypeofStringArg,
    validateNonEmptyString,
    validateCouchdbBase64String,
  ])
}

function mSet(key, value, object) {
  object[key] = value
  return object
}

function validateResultUInt(resultUInt) {
  if (resultUInt > Number.MAX_SAFE_INTEGER) {
    throw new Error(
      tedent(`
        The resulting value is greater than Number.MAX_SAFE_INTEGER

        value: ${resultUInt}

        This library is not designed for such values.  Please find a different
        solution to your problem
      `)
    )
  }
}

function mapBase64CharToIndex(charset) {
  return charset
    .split('')
    .reduce((result, character, index) => mSet(character, index, result), {})
}

function utob(u) {
  return u.replace(utobRe, utob_part)
}

function btoa(b) {
  return b.replace(btoaRe, btoa_part)
}

function getBToURe() {
  return new RegExp(
    [
      '[\xC0-\xDF][\x80-\xBF]',
      '[\xE0-\xEF][\x80-\xBF]{2}',
      '[\xF0-\xF7][\x80-\xBF]{3}',
    ].join('|'),
    'g'
  )
}

function btou(b) {
  return b.replace(btouRe, btou_part)
}

function atob(a) {
  return a.replace(atobRe, atob_part)
}

function atob_part(a) {
  const len = a.length,
    padlen = len % 4,
    n =
      (len > 0 ? base64CharToIndex[a.charAt(0)] << 18 : 0) |
      (len > 1 ? base64CharToIndex[a.charAt(1)] << 12 : 0) |
      (len > 2 ? base64CharToIndex[a.charAt(2)] << 6 : 0) |
      (len > 3 ? base64CharToIndex[a.charAt(3)] : 0),
    chars = [
      fromCharCode(n >>> 16),
      fromCharCode((n >>> 8) & 0xff),
      fromCharCode(n & 0xff),
    ]
  chars.length -= [0, 0, 2, 1][padlen]
  return chars.join('')
}

function btou_part(b) {
  switch (b.length) {
    case 4: {
      const cp =
          ((0x07 & b.charCodeAt(0)) << 18) |
          ((0x3f & b.charCodeAt(1)) << 12) |
          ((0x3f & b.charCodeAt(2)) << 6) |
          (0x3f & b.charCodeAt(3)),
        offset = cp - 0x10000

      return (
        fromCharCode((offset >>> 10) + 0xd800) +
        fromCharCode((offset & 0x3ff) + 0xdc00)
      )
    }
    case 3:
      return fromCharCode(
        ((0x0f & b.charCodeAt(0)) << 12) |
          ((0x3f & b.charCodeAt(1)) << 6) |
          (0x3f & b.charCodeAt(2))
      )
    default:
      return fromCharCode(
        ((0x1f & b.charCodeAt(0)) << 6) | (0x3f & b.charCodeAt(1))
      )
  }
}

function btoa_part(b) {
  const padlen = [0, 2, 1][b.length % 3],
    ord =
      (b.charCodeAt(0) << 16) |
      ((b.length > 1 ? b.charCodeAt(1) : 0) << 8) |
      (b.length > 2 ? b.charCodeAt(2) : 0),
    chars = [
      charset.charAt(ord >>> 18),
      charset.charAt((ord >>> 12) & 63),
      padlen >= 2 ? '' : charset.charAt((ord >>> 6) & 63),
      padlen >= 1 ? '' : charset.charAt(ord & 63),
    ]

  return chars.join('')
}

function utob_part(c) {
  if (c.length < 2) {
    const cc = c.charCodeAt(0)
    return cc < 0x80
      ? c
      : cc < 0x800
        ? fromCharCode(0xc0 | (cc >>> 6)) + fromCharCode(0x80 | (cc & 0x3f))
        : fromCharCode(0xe0 | ((cc >>> 12) & 0x0f)) +
          fromCharCode(0x80 | ((cc >>> 6) & 0x3f)) +
          fromCharCode(0x80 | (cc & 0x3f))
  } else {
    const cc =
      0x10000 + (c.charCodeAt(0) - 0xd800) * 0x400 + (c.charCodeAt(1) - 0xdc00)
    return (
      fromCharCode(0xf0 | ((cc >>> 18) & 0x07)) +
      fromCharCode(0x80 | ((cc >>> 12) & 0x3f)) +
      fromCharCode(0x80 | ((cc >>> 6) & 0x3f)) +
      fromCharCode(0x80 | (cc & 0x3f))
    )
  }
}

//
//---------//
// Exports //
//---------//

module.exports = {
  decodeToString,
  decodeToUInt,
  encodeFromString,
  encodeFromUInt,
  isCouchdbBase64String,
}
