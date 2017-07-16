import Uuid from 'node-uuid';
import { PayloadSerializer } from '../../../src/middleware/serializers';


describe(`PayloadSerializer`, function () {

  it(`should initalize`, function (done) {

    const serializer = PayloadSerializer();

    expect(serializer).to.be.an.object();
    expect(serializer.serialize).to.a.function();
    expect(serializer.normalize).to.a.function();

    done();
  });

  describe('Serializing', function () {
    it(`serialize number id and *Id attributes`, function (done) {

      const hasher = { encode: () => 'one' };
      const serializer = PayloadSerializer(hasher);
      const payload = {
        id: 1,
        identification: 1,
        objectId: {},
        accountId: 1,
        celluloid: 1,
        userId: [1, 2, 3,],
        tokenId: Uuid.v4(),
      };

      const output = serializer.serialize(payload);

      expect(output.id).to.equal('one');
      expect(output.accountId).to.equal('one');
      expect(output.userId[0]).to.equal('one');
      expect(output.objectId).to.be.an.object();
      expect(output.identification).to.equal(1);
      expect(output.celluloid).to.equal(1);
      expect(output.tokenId).to.equal(payload.tokenId);

      done();
    });

    it(`serialize number id and *Id attributes in an array`, function (done) {

      const hasher = { encode: () => 'one' };
      const serializer = PayloadSerializer(hasher);
      const payload = [
        {
          id: 1,
          identification: 1,
          testee: {
            testId: 1,
          },
          objectList: [{
              accountId: 1,
          }],
          requestId: [ 1, ],
          celluloid: 1,
        }
      ];

      const output = serializer.serialize(payload)[0];

      expect(output.id).to.equal('one');
      expect(output.testee.testId).to.equal('one');
      expect(output.requestId[0]).to.equal('one');
      expect(output.objectList[0].accountId).to.equal('one');
      expect(output.identification).to.equal(1);
      expect(output.celluloid).to.equal(1);

      done();
    });

    it(`serialize number id and *Id attributes which are deeply nested`, function (done) {

      const hasher = { encode: () => 'one' };
      const serializer = PayloadSerializer(hasher);
      const payload = {
        data: {
          id: 1,
          attributes: {
            identification: 1,
            accountId: 1,
            celluloid: 1,
          }
        }
      };

      const output = serializer.serialize(payload);

      expect(output.data.id).to.equal('one');
      expect(output.data.attributes.accountId).to.equal('one');
      expect(output.data.attributes.identification).to.equal(1);
      expect(output.data.attributes.celluloid).to.equal(1);

      done();
    });

  });

  describe('Normalizing', function () {

    it(`normalize serialized id and *Id to their number values`, function (done) {

      const hasher = { decode: () => 1, isHash: () => true, };
      const serializer = PayloadSerializer(hasher);
      const payload = {
        id: 'one',
        accountId: 'one',
        userId: ['one', 'one'],
        identification: 'one',
        celluloid: 'one',
      };

      const output = serializer.normalize(payload);

      expect(output.id).to.equal(1);
      expect(output.accountId).to.equal(1);
      expect(output.userId[0]).to.equal(1);
      expect(output.identification).to.equal('one');
      expect(output.celluloid).to.equal('one');

      done();
    });

    it(`doesn't attempt to normalize bad hashes`, function (done) {

      const hasher = { decode: () => 1, isHash: () => false, };
      const serializer = PayloadSerializer(hasher);
      const payload = { id: 'one', };

      const output = serializer.normalize(payload);

      expect(output.id).to.equal('one');

      done();
    });

    it(`normalize serialized number values within an array`, function (done) {

      const hasher = { decode: () => 1, isHash: () => true, };
      const serializer = PayloadSerializer(hasher);
      const payload = [{
        id: 'one',
        attributes: {
          accountId: 'one',
        },
        identification: 'one',
        celluloid: 'one',
      }];

      const output = serializer.normalize(payload)[0];

      expect(output.id).to.equal(1);
      expect(output.attributes.accountId).to.equal(1);
      expect(output.identification).to.equal('one');
      expect(output.celluloid).to.equal('one');

      done();
    });

    it(`normalize serialized number values which are deeply nested`, function (done) {

      const hasher = { decode: () => 1, isHash: () => true, };
      const serializer = PayloadSerializer(hasher);
      const payload = {
        data: {
          id: 'one',
          attributes: {
            accountId: 'one',
            identification: 'one',
            celluloid: 'one',
          }
        },
      };

      const { data } = serializer.normalize(payload);

      expect(data.id).to.equal(1);
      expect(data.attributes.accountId).to.equal(1);
      expect(data.attributes.identification).to.equal('one');
      expect(data.attributes.celluloid).to.equal('one');

      done();
    });

  });

});

