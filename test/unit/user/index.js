import Hapi from 'hapi';
import Auth from '../../../src/auth';
import User from '../../../src/user';


describe('User', function () {

  it(`registers as a plugin on Hapi`, function (done) { 

    const server = new Hapi.Server();
    server.connection();

    server.register([
      { register: Auth },
      { register: User }
    ], function (err) {

      expect(err).to.not.exist();

      done();
    });

  });

});

