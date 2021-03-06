import Hapi from 'hapi';
import digiaAPI from '../../src';


describe('digiaAPI', function () {

  it(`registers as a plugin on Hapi`, function (done) { 

    const server = new Hapi.Server();
    server.connection();

    server.register({ register: digiaAPI }, function (err) {

      expect(err).to.not.exist();

      done();
    });

  });

});
