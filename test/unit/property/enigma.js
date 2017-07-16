import Hapi from 'hapi';
import Enigma from '../../../src/property/enigma';


describe('Enigma', function () {
  it(`instantiates`, function (done) {
    const enigma = Enigma();

    expect(enigma).to.exist();

    done();
  });

  // TODO(digia): Test enigma
  it(`performs a get request`, function (done) {
    const enigma = Enigma();
    const data = {
      type: 'Pin',
      authentication: '12234',
      propertyId: '12345678-1234-5678-1234-567812345678',
    };


    enigma.get('credential/a2b59f7f-69ab-4da8-9755-7116f4c14316')
    .then((response) => {
      console.log('Enigma then: ', response);
    })
    .catch((err) => {
      console.log('Enigma catch: ', err);
    });

  });
});
