import Hapi from 'hapi';
import { User } from '../../../src/user/models';
import { Address } from '../../../src/address/models';
import { Account } from '../../../src/account/models';


describe('Account Model', function () {

  it(`instantiated as a draft`, function (done) {

    const account = Account.forge();

    expect(account).to.exist();

    done();
  });

  it(`it belongs to an address`, function (done) {

    const account = Account.forge();

    expect(account.address().relatedData.type).to.equal('belongsTo');

    done();
  });

  it(`has many users`, function (done) {

    const account = Account.forge();

    expect(account.users().relatedData.type).to.equal('hasMany');

    done();
  });

});

