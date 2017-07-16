import Hapi from 'hapi';
import Auth from '../../../src/auth';
import Request from '../../../src/request';


// TODO(digia): Replace Auth with a mock for covering the auth strategies
describe('Request', function () {

  it(`registers as a plugin on Hapi`, function (done) { 

    const server = new Hapi.Server();
    server.connection();

    server.register([
      { register: Auth },
      { register: Request }
    ], function (err) {

      expect(err).to.not.exist();

      done();
    });

  });

});
