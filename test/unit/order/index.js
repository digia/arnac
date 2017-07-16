import Hapi from 'hapi';
import Auth from '../../../src/auth';
import Order from '../../../src/order';


describe('Order', function () {

  it(`registers as a plugin on Hapi`, function (done) { 

    const server = new Hapi.Server();
    server.connection();

    server.register([
      { register: Auth },
      { register: Order }
    ], function (err) {

      expect(err).to.not.exist();

      done();
    });

  });

});

