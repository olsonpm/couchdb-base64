//------//
// Init //
//------//

const couchdbBase64Charset = '-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  zeroChar = couchdbBase64Charset[0],
  couchdbBase64CharToIndex = mapCharToIndex(couchdbBase64Charset),
  couchdbBase64Re = /[0-9A-Za-z_-]+/

//
//------//
// Main //
//------//

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
    result.push(couchdbBase64Charset[uint % 64])
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
    const charsetIndex = couchdbBase64CharToIndex[character]
    resultUint += charsetIndex * (64 ** index)
  }

  validateResultUInt(resultUint)

  return resultUint
}

//
//------------------//
// Helper Functions //
//------------------//

function pad0(times) {
  return new Array(times + 1).join(zeroChar);
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

function validateSingleArg(...args) {
  if (args.length !== 1) {
    throw new Error(
      'This function takes exactly one argument' +
      `\nYou passed ${args.length}` +
      `\nargs passed: ${JSON.stringify(args, null, 2)}`
    )
  }
}

function validateEncodeFromUIntArgs(...args) {
  validateSingleArg(...args)

  const firstArg = args[0]
  if (firstArg === null || typeof firstArg !== 'object') {
    throw new Error(
      'This function requires an object as its only argument' +
      `\ntypeof arg passed: ${typeof firstArg}` +
      `\narg passed: ${firstArg}`
    )
  }

  const argKeys = Object.keys(firstArg),
    validKeys = ['uint', 'totalBits'],
    setOfKeysPassed = new Set(argKeys),
    missingKeys = validKeys.filter(key => !setOfKeysPassed.has(key))

  if (missingKeys.length) {
    throw new Error(
      "This function requires an object with the keys 'uint' an 'totalBits'" +
      `\nmissing keys: ${missingKeys.sort().join(', ')}` +
      `\nall keys passed: ${argKeys.join(', ')}`
    )
  }

  const { uint, totalBits } = firstArg
  if (!Number.isInteger(uint)) {
    throw new Error("uint is not an integer: " + uint)
  }
  if (uint < 0) {
    throw new Error("uint must be positive: " + uint)
  }
  if (uint > Number.MAX_SAFE_INTEGER) {
    throw new Error("uint is greater than Number.MAX_SAFE_INTEGER: " + uint)
  }

  if (!Number.isInteger(totalBits)) {
    throw new Error("totalBits is not an integer: " + totalBits)
  }
  if (totalBits < 1) {
    throw new Error("totalBits must be positive: " + totalBits)
  }
  if (totalBits > 54) {
    throw new Error(
      'totalBits is greater than 54' +
      '\nFor the purpose of this library, there is no need to pad your bits' +
      '\n  larger than what is required for MAX_SAFE_INTEGER, which is 54' +
      `\n\ntotalBits: ${totalBits}` +
      `\ntotalBits % 6: ${totalBits % 6}`
    )
  }

  if (totalBits % 6 !== 0) {
    throw new Error(
      'totalBits must be a multiple of 6, as each base64 character represents' +
      ' 6 bits of information' +
      `\ntotalBits: ${totalBits}` +
      `\ntotalBits % 6: ${totalBits % 6}`
    )
  }

  const minimumNumberOfBits = getMinimumNumberOfBitsToRepresentUInt(uint)
  if (minimumNumberOfBits > totalBits) {
    throw new Error(
      'The minimum number of bits to represent uint exceeds totalBits' +
      '\nThis is enforced because totalBits is meant to sustain sequential' +
      "\n  insertion of ids.  If you're passing in a uint larger than what's" +
      "\n  there for padding then you probably have a bug in your program" +
      `\n\nminimum number of bits: ${minimumNumberOfBits}` +
      `\ntotalBits: ${totalBits}`
    )
  }
}

function getMinimumNumberOfBitsToRepresentUInt(uint) {
  return uint.toString(2).length
}

function validateDecodeToUIntArgs(...args) {
  validateSingleArg(...args)

  const hopefulCouchdbBase64String = args[0]
  if (typeof hopefulCouchdbBase64String !== 'string') {
    throw new Error(
      'This function requires a string as its only argument' +
      `\ntypeof arg passed: ${typeof hopefulCouchdbBase64String}` +
      `\narg passed: ${hopefulCouchdbBase64String}`
    )
  }

  if (!couchdbBase64Re.test(hopefulCouchdbBase64String)) {
    throw new Error(
      'Value is not a valid couchdbBase64 string' +
      `\nValue must pass the regex ${couchdbBase64Re}` +
      `\nValue given: ${hopefulCouchdbBase64String}`
    )
  }
}

function mSet(key, value, object) {
  object[key] = value
  return object
}

function validateResultUInt(resultUInt) {
  if (resultUInt > Number.MAX_SAFE_INTEGER) {
    throw new Error(
      'The resulting value is greater than Number.MAX_SAFE_INTEGER' +
      `\nvalue: ${resultUInt}` +
      '\nThis library is not designed for such values.  Please find a different solution to your problem'
    )
  }
}

function mapCharToIndex(couchdbBase64Charset) {
  return couchdbBase64Charset.split('').reduce(
    (result, character, index) => mSet(character, index, result),
    {}
  )
}

//
//---------//
// Exports //
//---------//

module.exports = { decodeToUInt, encodeFromUInt }
