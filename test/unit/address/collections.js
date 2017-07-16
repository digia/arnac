import Sinon from 'sinon';
import { Address } from '../../../src/address/models';
import { AddressCollection } from '../../../src/address/collections';


function makeAddress() {

  return {};
}

describe('AddressCollection', function () {
  it(`instantiated as a draft`, function (done) {
    const collection = AddressCollection.forge();

    expect(collection).to.exist();

    done();
  });

  describe('#update', function () {

  });

  describe('#delete', function () {
    it(`deletes the address`, function (done) {
      // const address = makeAddress();
      // const collection = AddressCollection.forge();

      // collection.delete(address);

      Promise.resolve('first')
      .then((result) => {
        console.log(result);
      })
      .then(() => {

        return Promise.resolve('going to fail')
        .then(() => {
          throw new Error('inner');
        });
      })
      .catch((err) => {
        console.log(err);
        done();
      });
    });
  });

});

