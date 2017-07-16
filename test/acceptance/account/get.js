import Async from 'async';
import Uuid from 'node-uuid';
import {
  db as Db,
  refreshDb,
  generateAuthHeaders,
  generateTokens,
  structurePayload,
  authority as Authority,
  server as Server } from '../helpers';


describe('Account - Get', function () {
  const mAddressIdList = Array.apply(null, Array(1)).map(() => Uuid.v4());
  const mAccountIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
  const mUserIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
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

  describe('GET /account/{id}', function () {
    let mAccount;
    let mAccountSoftDelete;
    let mAddressList;

    let mAccountData = {
      id: mAccountIdList[0],
      organization: 'Test, LLC',
      phone: '9991111234',
      address_id: mAddressIdList[0],
    };

    let mAccountSoftDeleteData = {
      id: mAccountIdList[1],
      organization: 'Soft Delete, LLC',
      deleted_at: new Date(),
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
          .then((addressList) => {
            mAddressList = addressList;

            next(null);
          });
        },
        function (next) {
          Db.create('account', mAccountData)
          .then((account) => {
            mAccount = account;

            next(null);
          });
        },
        function (next) {
          Db.create('account', mAccountSoftDeleteData)
          .then((account) => {
            mAccountSoftDelete = account;

            next(null);
          });
        }
      ], function (err, result) {
        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 when client is not authorized`, function (done) {
      const options = {
        method: 'GET',
        url: `/account/${mAccount.id}`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when account doesn't match authToken account id`, function (done) {
      const options = {
        method: 'GET',
        url: `/account/${mAccount.id}`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 when successfully responding with the account`, function (done) {
      const options = {
        method: 'GET',
        url: `/account/${mAccount.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('account');
        expect(id).to.be.a.string();

        expect(attributes.organization).to.equal(mAccountData.organization);
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();

        expect(attributes.phone).to.equal(mAddressDataList[0].phone);
        expect(attributes.street).to.equal(mAddressDataList[0].street);
        expect(attributes.street2).to.equal(mAddressDataList[0].street_2);
        expect(attributes.city).to.equal(mAddressDataList[0].city);
        expect(attributes.state).to.equal('Michigan');
        expect(attributes.zipcode).to.equal(mAddressDataList[0].zipcode);
        expect(attributes.country).to.equal('United States');

        done();
      });
    });

    // NOTE(digia): Account also doesn't have an address
    it(`200 when successfully responding with the soft deleted account`, function (done) {
      const options = {
        method: 'GET',
        url: `/account/${mAccountSoftDelete.id}`,
        headers: generateAuthHeaders(authTokenAccount2), // accountId is 2
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('account');
        expect(id).to.be.a.string();

        expect(attributes.organization).to.equal(mAccountSoftDeleteData.organization);
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.a.string();

        expect(attributes.phone).to.be.null();
        expect(attributes.street).to.be.null();
        expect(attributes.street2).to.be.null();
        expect(attributes.city).to.be.null();
        expect(attributes.state).to.be.null();
        expect(attributes.zipcode).to.be.null();
        expect(attributes.country).to.be.null();

        done();
      });
    });

    it(`401 if auth token is not associated with requested account`, function (done) {
      const options = {
        method: 'GET',
        url: `/account/${mAccount.id}`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`404 when account doesn't exist`, function (done) {
      const _id = Uuid.v4();
      const options = {
        method: 'GET',
        url: `/account/${_id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    /*
    describe('#Queries', function () {

      before(function (done) {

        // Add user to account
        // Add requests to account
        // Add blocks to account
        // Add properties to account

        const createUserRelation = function (next)
        {
          Authority().generateHash('aaaaaa').then((hash) => {

            const data = {
              email: 'jon@digia.com',
              password_hash: hash,
              account_id: mAccount.id,
            };

            Db.create('user', data).then((user) => {

              next(null);
            });
          });
        }

        Async.waterfall([
          createUserRelation,
        ], function (err, result) {

          if (err) {
            console.log(err);
          }

          done();
        });
      });

      describe('include', function () {

        it(`can include the user relationship collection`, function (done) {

          const options = {
            method: 'GET',
            url: `/account/1?include[]=user`,
            headers: generateAuthHeaders(authToken),
          };

          Server.inject(options, (response) => {

            expect(response.statusCode).to.equal(200);

            console.log(response.result);

            done();
          });
        });

      });

    });
  */

  });
});

