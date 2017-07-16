import Hapi from 'hapi';
import Auth from '../../../src/auth';
import Refund from '../../../src/refund';


describe('Refund', function () {

  it(`registers as a plugin on Hapi`, function (done) {

    const server = new Hapi.Server();
    server.connection();

    server.register([
      { register: Auth },
      { register: Refund }
    ], function (err) {

      expect(err).to.not.exist();

      done();
    });

  });

});


