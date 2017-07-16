import Hapi from 'hapi';
import Middleware from '../../../src/middleware';


describe('Middleware', function () {

  it(`registers as a plugin on Hapi`, function (done) { 

    const server = new Hapi.Server();
    server.connection();

    server.register({ register: Middleware }, function (err) {

      expect(err).to.not.exist();

      done();
    });

  });

});
