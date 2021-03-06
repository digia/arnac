import Hapi from 'hapi';
import Auth from '../../../src/auth';
import Property from '../../../src/property';


// TODO(digia): Replace Auth with a mock for covering the auth strategies
describe('Property', function () {

  it(`registers as a plugin on Hapi`, function (done) { 

    const server = new Hapi.Server();
    server.connection();

    server.register([
      { register: Auth },
      { register: Property }
    ], function (err) {

      expect(err).to.not.exist();

      done();
    });

  });

});
