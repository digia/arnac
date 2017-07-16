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


describe('Account - Card - Get', function () {
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

  describe('GET /account/{accountId}/card/{id}', function () {
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
      Async.waterfall([
        refreshDb,
        function (next) {
          Db.create('address', mAddressDataList)
          .then(() => {
            next(null);
          });
        },
        function (next) {
          Db.create('account', _.values(mAccountData))
          .then(() => {
            next(null);
          });
        },
        function (next) {
          Db.create('card', _.values(mCardData))
          .then(() => {
            next(null);
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
        method: 'GET',
        url: `/account/${mAccountData.normal.id}/card/${mCardData.visa.id}`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when account doesn't match authToken account id`, function (done) {
      const options = {
        method: 'GET',
        url: `/account/${mAccountData.normal.id}/card/${mCardData.visa.id}`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 when successfully returns the card`, function (done) {
      const options = {
        method: 'GET',
        url: `/account/${mAccountData.normal.id}/card/${mCardData.visa.id}?include=account`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { data, included } = response.result;

        expect(included).to.be.length(1);

        const { type, id, attributes, relationships } = data;

        expect(type).to.equal('account-card');
        expect(id).to.be.string(mCardData.visa.id);

        expect(attributes.brand).to.equal(mCardData.visa.brand);
        expect(attributes.last4).to.equal(mCardData.visa.last_4);
        expect(attributes.expirationMonth).to.equal(mCardData.visa.expiration_month);
        expect(attributes.expirationYear).to.equal(mCardData.visa.expiration_year);
        expect(attributes.hasExpired).to.be.false();

        expect(relationships.account).to.exist();

        done();
      });
    });

    it(`404 when the account is deleted`, function (done) {
      const _id = Uuid.v4();
      const options = {
        method: 'GET',
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
        method: 'GET',
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
