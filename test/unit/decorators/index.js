import Hapi from 'hapi';
import Decorators from '../../../src/decorators';


describe('Decorators', function () {

  it(`registers as a plugin on Hapi`, function (done) { 

    const server = new Hapi.Server();
    server.connection();

    server.register({ register: Decorators }, function (err) {

      expect(err).to.not.exist();

      done();
    });

  });

});
