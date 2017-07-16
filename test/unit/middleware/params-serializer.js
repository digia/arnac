import Uuid from 'node-uuid';
import { UUIDHasher } from '../../../src/foundation/hashing';
import { ParamsSerializer } from '../../../src/middleware/serializers';


const uuidHasher = UUIDHasher();

describe(`ParamsSerializer`, function () {

  it(`initalize`, function (done) {

    const serializer = ParamsSerializer();

    expect(serializer).to.be.an.object();
    expect(serializer.normalize).to.a.function();

    done();
  });

  describe('Normalizing', function () {

    it(`normalizes serialized id and *Id to their number values`, function (done) {

      const hasher = { decode: () => 1, isHash: () => true, isNumber: uuidHasher.isNumber };
      const serializer = ParamsSerializer(hasher);
      const params = { accountId: 'one', };

      const output = serializer.normalize(params);

      expect(output.accountId).to.be.a.number().and.to.equal(1);

      done();
    });

    it(`doesn't attempt to normalize bad hashes`, function (done) {

      const hasher = { decode: () => 1, isHash: () => false, isNumber: uuidHasher.isNumber };
      const serializer = ParamsSerializer(hasher);
      const params = { id: 'one', };

      const output = serializer.normalize(params);

      expect(output.id).to.equal('one');

      done();
    });

    it(`normalizes serialized id and *Id to their number values within an array`, function (done) {

      const hasher = { decode: () => 1, isHash: () => true, isNumber: uuidHasher.isNumber };
      const serializer = ParamsSerializer(hasher);
      const params = { accountId: ['one', 'one'] };

      const output = serializer.normalize(params);

      expect(output.accountId[0]).to.be.a.number().and.to.equal(1);

      done();
    });

    it(`normalizes serialized id and *Id which are deeply nested`, function (done) {

      const hasher = { decode: () => 1, isHash: () => true, isNumber: uuidHasher.isNumber };
      const serializer = ParamsSerializer(hasher);
      const params = { 
        filter: {
          id: 'one',
          accountId: 'one',
        }
      };

      const output = serializer.normalize(params);

      expect(output.filter.id).to.be.a.number().and.to.equal(1);
      expect(output.filter.accountId).to.be.a.number().and.to.equal(1);

      done();
    });

    it(`throw a TypeError when an id value is a number`, function (done) {

      const hasher = { decode: () => 1, isHash: () => true, isNumber: uuidHasher.isNumber };
      const serializer = ParamsSerializer(hasher);
      const params = { 
        id: 1,
        accountId: 1,
      };

      const fn = function () {
        serializer.normalize(params);
      }

      expect(fn).to.throw(TypeError);

      done();
    });

    it(`throw a TypeError when hash fails to normalize`, function (done) {

      const serializer = ParamsSerializer(uuidHasher);
      const params = { accountId: 'icantbedecoded', };

      const fn = function () {
        serializer.normalize(params);
      }

      expect(fn).to.throw(TypeError);

      done();
    });

    it(`allows numbers as ids when configured to`, function (done) {

      const hasher = { decode: () => 1, isHash: () => true, isNumber: uuidHasher.isNumber };
      const serializer = ParamsSerializer(hasher, { allowNumbers: true });
      const params = { 
        id: 1,
        accountId: 1,
      };

      const output = serializer.normalize(params);

      expect(output.id).to.equal(1);
      expect(output.accountId).to.equal(1);

      done();
    });

  });
});
