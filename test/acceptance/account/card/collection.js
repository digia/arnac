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


describe('Account - Card - Collection', function () {
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

  describe('GET /account/{accountId}/card/{id}', function () {
    const mAccountData = {
      normal: {
        id: mAccountIdList[0],
        organization: 'Test, LLC',
        phone: '9991111234',
        address_id: mAddressIdList[0],
      },
      noCards: {
        id: mAccountIdList[1],
        organization: 'No Cards',
        phone: '9991111234',
        address_id: mAddressIdList[0],
      },
      softDeleted: {
        id: mAccountIdList[2],
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
      mastercard: {
        id: mCardIdList[1],
        stripe_id: 'card_idontexist2',
        brand: 'Mastercard',
        last_4: '5454',
        expiration_month: 10,
        expiration_year: 2019,
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
        url: `/account/${mAccountData.normal.id}/card`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when account doesn't match authToken account id`, function (done) {
      const options = {
        method: 'GET',
        url: `/account/${mAccountData.normal.id}/card`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 when successfully returns the card collection`, function (done) {
      const options = {
        method: 'GET',
        url: `/account/${mAccountData.normal.id}/card?include=account`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { data, included } = response.result;

        expect(included).to.be.length(1);

        expect(data).to.be.length(2);

        done();
      });
    });

    it(`200 when successfully returns an empty card collection`, function (done) {
      const options = {
        method: 'GET',
        url: `/account/${mAccountData.noCards.id}/card?include=account`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(0);

        done();
      });
    });

    it(`404 when the account is deleted`, function (done) {
      const _id = Uuid.v4();
      const options = {
        method: 'GET',
        url: `/account/${mAccountData.softDeleted.id}/card`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });
  });
});

