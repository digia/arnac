import Hapi from 'hapi';
import { User } from '../../../src/user/models';


describe('User Model', function () {

  it(`instantiated as a draft`, function (done) { 

    const user = User.forge();

    expect(user).to.exist();

    done();

  });

});

