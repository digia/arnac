import Hapi from 'hapi';
import Auth from '../../../src/auth';


describe('Auth', function () {

  it(`registers as a plugin on Hapi`, function (done) { 

    const server = new Hapi.Server();
    server.connection();

    server.register({ register: Auth }, function (err) {

      expect(err).to.not.exist();

      done();
    });

  });

});
