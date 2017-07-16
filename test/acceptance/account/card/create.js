import _ from 'lodash';
import Async from 'async';
import Uuid from 'node-uuid';
import Stripe from '../../../../src/payment/stripe';
import {
  db as Db,
  refreshDb,
  generateAuthHeaders,
  generateTokens,
  structurePayload,
  authority as Authority,
  server as Server,
  uuidList,
} from '../../helpers';


describe('Account - Card - Create', function () {
  const mAddressIdList = uuidList(1);
  const mAccountIdList = uuidList(2);
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

  describe('POST /account/{accountId}/card', function () {
    const mAccountData = {
      normal: {
        id: mAccountIdList[0],
        organization: 'Test, LLC',
        phone: '9991111234',
        address_id: mAddressIdList[0],
      },
      softDeleted: {
        id: mAccountIdList[1],
        organization: 'Soft Delete, LLC',
        deleted_at: new Date(),
        address_id: mAddressIdList[0],
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

    before((done) => {
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
        }
      ], (err) => {
        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 when client is not authorized`, function (done) {
      const payload = { token: 'not a real token' };
      const options = {
        method: 'POST',
        url: `/account/${mAccountData.normal.id}/card`,
        payload: structurePayload('account-card', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when account doesn't match authToken account id`, function (done) {
      const payload = { token: 'not a real token' };
      const options = {
        method: 'POST',
        url: `/account/${mAccountData.normal.id}/card`,
        headers: generateAuthHeaders(authTokenAccount2),
        payload: structurePayload('account-card', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`201 when successfully creates the card`, function (done) {
      this.timeout(3000);

      const tokenAttrs = {
        card: {
          number: 4242424242424242,
          exp_month: 12,
          exp_year: 2017,
          cvc: 123,
        },
      };

      Stripe.tokens.create(tokenAttrs)
      .then((token) => {
        const payload = { token: token.id };
        const options = {
          method: 'POST',
          url: `/account/${mAccountData.normal.id}/card`,
          headers: generateAuthHeaders(authToken),
          payload: structurePayload('account-card', payload),
        };

        Server.inject(options, (response) => {
          expect(response.statusCode).to.equal(201);

          const { type, id, attributes } = response.result.data;

          expect(type).to.equal('account-card');
          expect(id).to.be.string();

          expect(attributes.brand).to.equal('Visa');
          expect(attributes.last4).to.equal('4242');
          expect(attributes.expirationMonth).to.equal(12);
          expect(attributes.expirationYear).to.equal(2017);
          expect(attributes.hasExpired).to.be.false();

          done();
        });
      });
    });

    it(`404 when the account is deleted`, function (done) {
      const payload = { token: 'not a real token' };
      const options = {
        method: 'POST',
        url: `/account/${mAccountData.softDeleted.id}/card`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('account-card', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });
  });
});
