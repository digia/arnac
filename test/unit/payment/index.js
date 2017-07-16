import Hapi from 'hapi';
import Auth from '../../../src/auth';
import Payment from '../../../src/payment';


describe('Payment', function () {

  it(`registers as a plugin on Hapi`, function (done) {

    const server = new Hapi.Server();
    server.connection();

    server.register([
      { register: Auth },
      { register: Payment }
    ], function (err) {

      expect(err).to.not.exist();

      done();
    });

  });

});

