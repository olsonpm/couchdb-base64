//---------//
// Imports //
//---------//

const chai = require('chai'),
  {
    decodeToString,
    decodeToUInt,
    encodeFromString,
    encodeFromUInt,
  } = require('./index.js')

//
//------//
// Init //
//------//

chai.should()

//
//------//
// Main //
//------//

suite('decodeToString', () => {
  suite('success cases', () => {
    test('simple value', () => {
      decodeToString('O4JgP4wURqxmP4E').should.equal('hello world')
    })
  })

  suite('error cases', () => {
    test('not single arg passed', () => {
      const badCall = () => decodeToString('one', 'two')
      badCall.should.throw(/^This function takes exactly one argument/)
    })
    test('not a string passed', () => {
      const badCall = () => decodeToString(1)
      badCall.should.throw(
        /^This function requires a string as its only argument/
      )
    })
    test('empty string should throw an error', () => {
      const decodeEmptyString = () => decodeToString('')
      decodeEmptyString.should.throw(/^string must be non-empty$/)
    })
    test('empty non-base64 characters should throw an error', () => {
      const decodeEmptyString = () => decodeToString('slash-is-invalid-/')
      decodeEmptyString.should.throw(
        /^Value is not a valid couchdbBase64 string/
      )
    })
  })
})

suite('encodeFromString', () => {
  suite('success cases', () => {
    test('simple value', () => {
      encodeFromString('hello world').should.equal('O4JgP4wURqxmP4E')
    })
  })

  suite('error cases', () => {
    test('not single arg passed', () => {
      const badCall = () => encodeFromString('one', 'two')
      badCall.should.throw(/^This function takes exactly one argument/)
    })
    test('not a string passed', () => {
      const badCall = () => encodeFromString(1)
      badCall.should.throw(
        /^This function requires a string as its only argument/
      )
    })
    test('empty string should throw an error', () => {
      const decodeEmptyString = () => encodeFromString('')
      decodeEmptyString.should.throw(/^string must be non-empty$/)
    })
  })
})

suite('decodeToUInt', () => {
  suite('success cases', () => {
    test('low bound', () => {
      decodeToUInt('-').should.equal(0)
    })
    test('high bound', () => {
      decodeToUInt('Tzzzzzzzz').should.equal(Number.MAX_SAFE_INTEGER)
    })
    test('simple value', () => {
      decodeToUInt('.-').should.equal(64)
    })
  })

  suite('error cases', () => {
    test('not single arg passed', () => {
      const badCall = () => decodeToUInt('one', 'two')
      badCall.should.throw(/^This function takes exactly one argument/)
    })
    test('not a string passed', () => {
      const badCall = () => decodeToUInt(1)
      badCall.should.throw(
        /^This function requires a string as its only argument/
      )
    })
    test('empty string should throw an error', () => {
      const decodeEmptyString = () => decodeToUInt('')
      decodeEmptyString.should.throw(/^string must be non-empty$/)
    })
    test('values above MAX_SAFE_INTEGER should throw', () => {
      const decodeAboveMaxInt = () => decodeToUInt('Vzzzzzzzz')
      decodeAboveMaxInt.should.throw(
        /^The resulting value is greater than Number\.MAX_SAFE_INTEGER/
      )
    })
  })
})

suite('encodeFromUInt', () => {
  suite('success cases', () => {
    test('low bound', () => {
      encodeFromUInt({ uint: 0, totalBits: 6 }).should.equal('-')
    })
    test('high bound', () => {
      encodeFromUInt({
        uint: Number.MAX_SAFE_INTEGER,
        totalBits: 54,
      }).should.equal('Tzzzzzzzz')
    })
    test('simple value', () => {
      encodeFromUInt({
        uint: 64,
        totalBits: 18,
      }).should.equal('-.-')
    })
  })

  suite('error cases', () => {
    test('not single arg passed', () => {
      const badCall = () => encodeFromUInt('one', 'two')
      badCall.should.throw(/^This function takes exactly one argument/)
    })
    test('not object', () => {
      const badCall = () => encodeFromUInt('one')
      badCall.should.throw(
        /^This function requires an object as its only argument/
      )
    })
    test('missing keys', () => {
      const badCall = () => encodeFromUInt({})
      badCall.should.throw('missing keys: totalBits, uint')
    })
    test('uint not an integer', () => {
      const badCall = () => encodeFromUInt({ uint: '123', totalBits: 12 })
      badCall.should.throw(/^uint is not an integer:/)
    })
    test('uint must be positive', () => {
      const badCall = () => encodeFromUInt({ uint: -123, totalBits: 12 })
      badCall.should.throw(/^uint must be positive:/)
    })
    test('uint greater than max', () => {
      const badCall = () =>
        encodeFromUInt({ uint: Number.MAX_SAFE_INTEGER + 1, totalBits: 12 })

      badCall.should.throw(/^uint is greater than Number.MAX_SAFE_INTEGER:/)
    })

    test('totalBits not an integer', () => {
      const badCall = () => encodeFromUInt({ uint: 123, totalBits: '12' })
      badCall.should.throw(/^totalBits is not an integer:/)
    })
    test('totalBits must be positive', () => {
      const badCall = () => encodeFromUInt({ uint: 123, totalBits: -12 })
      badCall.should.throw(/^totalBits must be positive:/)
    })
    test('totalBits greater than max', () => {
      const badCall = () => encodeFromUInt({ uint: 123, totalBits: 55 })

      badCall.should.throw(/^totalBits is greater than 54/)
    })
    test('totalBits not multiple of 6', () => {
      const badCall = () => encodeFromUInt({ uint: 123, totalBits: 13 })

      badCall.should.throw(
        /^totalBits must be a multiple of 6, as each base64 character represents/
      )
    })
    test('minimum bits exceeds totalBits', () => {
      const badCall = () => encodeFromUInt({ uint: 64, totalBits: 6 })

      badCall.should.throw(
        /^The minimum number of bits to represent uint exceeds totalBits/
      )
    })
  })
})
