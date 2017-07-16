import Hapi from 'hapi';
import Auth from '../../../src/auth';
import Account from '../../../src/account';


describe('Account', function () {

  it(`registers as a plugin on Hapi`, function (done) { 

    const server = new Hapi.Server();
    server.connection();

    server.register([
      { register: Auth },
      { register: Account }
    ], function (err) {

      expect(err).to.not.exist();

      done();
    });

  });

});
