import _ from 'lodash';
import Async from 'async';
import Uuid from 'node-uuid';
import Stripe from '../../../../src/payment/stripe';
import {
  db as Db,
  refreshDb,
  generateAuthHeaders,
  generateTokens,
  authority as Authority,
  server as Server,
  uuidList,
} from '../../helpers';


describe('Account - Card - Delete', function () {
  const mAddressIdList = uuidList(1);
  const mAccountIdList = uuidList(10);
  const mUserIdList = uuidList(2);
  const mCardIdList = uuidList(10);
  let authToken;
  let authTokenAccount2;

  before((done) => {
    Async.waterfall([
      function (next) {
        const ids = { accountId: mAccountIdList[0], userId: mUserIdList[0] };

        generateTokens(ids, (err, tokens) => {
          authToken = tokens.authToken;

          next(null);
        });
      },
      function (next) {
        const ids = { accountId: mAccountIdList[1], userId: mUserIdList[1] };

        generateTokens(ids, (err, tokens) => {
          authTokenAccount2 = tokens.authToken;

          next(null);
        });
      },
    ], function (err, result) {
      if (err) {
        console.log(err);
      }

      done();
    });
  });

  describe('DELETE /account/{accountId}/card/{id}', function () {
    const mAccountData = {
      normal: {
        id: mAccountIdList[0],
        organization: 'Test, LLC',
        phone: '9991111234',
        address_id: mAddressIdList[0],
        stripe_id: null,
      },
      softDeleted: {
        id: mAccountIdList[2],
        organization: 'Soft Delete, LLC',
        deleted_at: new Date(),
        address_id: mAddressIdList[0],
        stripe_id: null,
      },
    };

    const mAddressDataList = [
      {
        id: mAddressIdList[0],
        organization: 'Test, LLC',
        phone: '9991111234',
        street: 'digia Ave.',
        street_2: 'Suite A.',
        city: 'Lansing',
        state: 'MI',
        zipcode: '99999',
        country: 'US',
      }
    ];

    const mCardData = {
      visa: {
        id: mCardIdList[0],
        stripe_id: 'card_idontexist',
        brand: 'Visa',
        last_4: '4242',
        expiration_month: 12,
        expiration_year: 2020,
        account_id: mAccountIdList[0],
      },
    };

    before((done) => {
      this.timeout(10000);

      Async.waterfall([
        refreshDb,
        function (next) {
          Db.create('address', mAddressDataList)
          .then(() => {
            next(null);
          });
        },
        function (next) {
          const customerAttrs = { metadata: { accountId: mAccountData.normal.id }};

          Stripe.customers.create(customerAttrs)
          .then((customer) => {
            mAccountData.normal.stripe_id = customer.id;

            Db.create('account', _.values(mAccountData))
            .then(() => {
              next(null);
            });
          });
        },
        function (next) {
          const customerId = mAccountData.normal.stripe_id;
          const tokenAttrs = {
            card: {
              number: 4242424242424242,
              exp_month: 12,
              exp_year: 2017,
              cvc: 123
            },
          };

          Stripe.tokens.create(tokenAttrs)
          .then((token) => {
            return Stripe.customers.createSource(customerId, { source: token.id });
          })
          .then((card) => {
            mCardData.visa.stripe_id = card.id;

            Db.create('card', _.values(mCardData))
            .then(() => {
              next(null);
            });
          });
        }
      ], (err) => {
        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 when client is not authorized`, function (done) {
      const options = {
        method: 'DELETE',
        url: `/account/${mAccountData.normal.id}/card/${mCardData.visa.id}`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when account doesn't match authToken account id`, function (done) {
      const options = {
        method: 'DELETE',
        url: `/account/${mAccountData.normal.id}/card/${mCardData.visa.id}`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`204 when successfully deletes the card`, function (done) {
      const options = {
        method: 'DELETE',
        url: `/account/${mAccountData.normal.id}/card/${mCardData.visa.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(204);

        done();
      });
    });

    it(`404 when the account is deleted`, function (done) {
      const _id = Uuid.v4();
      const options = {
        method: 'DELETE',
        url: `/account/${mAccountData.softDeleted.id}/card/${_id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    it(`404 when the card doesn't exist`, function (done) {
      const _id = Uuid.v4();
      const options = {
        method: 'DELETE',
        url: `/account/${mAccountData.normal.id}/card/${_id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });
  });
});
