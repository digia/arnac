import { PropertyCollection } from '../../../src/property/collections';


describe('Property Collection', function () {
  it(`instantiates`, function (done) {
    const collection = PropertyCollection.forge();

    expect(collection).to.exist();

    done();
  });
});


