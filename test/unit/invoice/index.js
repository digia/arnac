import Hapi from 'hapi';
import Auth from '../../../src/auth';
import Invoice from '../../../src/invoice';


describe('Invoice', function () {

  it(`registers as a plugin on Hapi`, function (done) {

    const server = new Hapi.Server();
    server.connection();

    server.register([
      { register: Auth },
      { register: Invoice }
    ], function (err) {

      expect(err).to.not.exist();

      done();
    });

  });

});

