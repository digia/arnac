import { UUIDHasher } from '../../../src/foundation/hashing';


const makeConfig = function (values) 
{
  var config = values || {}

  return {
    salt: config.salt || 'salt',
    minLength: config.minLength || 5,
    alphabet: config.alphabet || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_-'
  }
}

const config = makeConfig();

describe('UUIDHasher', function () {

  it('should convert integer ids into a obfuscated string', function (done) {

    const hasher = UUIDHasher(config);

    expect(hasher.encode('1')).to.be.a.string().and.have.length(config.minLength);
    expect(hasher.encode(1)).to.be.a.string().and.have.length(config.minLength);

    done();
  });

  it('should convert UUID strings back into integer ids', function (done) {

    const hasher = UUIDHasher(config);
    const uuid = hasher.encode(1);

    expect(hasher.decode(uuid)).to.be.a.number().and.equal(1);

    done();
  });

  it('should raise a TypeError if id is not a number', function (done) {

    const hasher = UUIDHasher(config);
    const fn = () => { hasher.encode('one'); }

    expect(fn).to.throw(TypeError);

    done();
  });

  it('should raise a TypeError if hash does not decode', function (done) {

    const hasher = UUIDHasher(config);
    const badHash = () => { hasher.decode('i_shoudlNotDecode'); }

    expect(badHash).to.throw(TypeError);

    const badNull = () => { hasher.decode(null); }

    expect(badNull).to.throw(TypeError);

    const notANumber = () => { hasher.decode(NaN); }

    expect(notANumber).to.throw(TypeError);

    done();
  });

  /**
  it('should be able to guess if a value is a hash', function (done) {

    const hasher = UUIDHasher(config);

    expect(hasher.isHash(1)).to.be.false();
    expect(hasher.isHash('5nQJl')).to.be.true();
    expect(hasher.isHash('ab2s41ada')).to.be.true();
    expect(hasher.isHash('2b2s')).to.be.false(); // minLength is 5
    expect(hasher.isHash('`~!@#$%^&*()+={}|\\][:"\';>?<,./')).to.be.false(); 

    done();
  });
  */

  /**
  it('can determine if a alphanumeric string is a number', function (done) {

    const hasher = UUIDHasher(config);

    expect(hasher.isNumber(1)).to.be.true();
    expect(hasher.isNumber('1')).to.be.true();
    expect(hasher.isNumber('5nQJl')).to.be.false();
    expect(hasher.isNumber('ab2s41ada')).to.be.false();
    expect(hasher.isNumber('`~!@#$%^&*()+={}|\\][:"\';>?<,./')).to.be.false(); 

    done();
  });
  */

});
