import Hapi from 'hapi';
import { Property, PropertyCredential } from '../../../src/property/models';


describe('Property Model', function () {
  it(`instantiated as a draft`, function (done) {
    const property = Property.forge();

    expect(property).to.exist();

    done();
  });
});


describe('Property Credential Model', function () {
  it(`instantiated as a draft`, function (done) {
    const credential = PropertyCredential().forge();

    expect(credential).to.exist();
    expect(credential.attributes).to.exist();

    done();
  });
});
