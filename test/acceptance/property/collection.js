import Async from 'async';
import Uuid from 'node-uuid';
import {
  db as Db,
  refreshDb,
  generateAuthHeaders,
  generateTokens,
  createAccountUserDuo,
  createRequest,
  authority as Authority,
  server as Server } from '../helpers';


describe('Property - Collection', function () {

  let mAccountIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
  let mUserIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
  let mPropertyIdList = Array.apply(null, Array(3)).map(() => Uuid.v4());
  let mRequestIdList = Array.apply(null, Array(1)).map(() => Uuid.v4());
  let authToken;
  let authTokenAccount2;

  before((done) => {

    Async.waterfall([
      function (next)
      {
        const ids = { accountId: mAccountIdList[0], userId: mUserIdList[0] };

        generateTokens(ids, (err, tokens) => {

          authToken = tokens.authToken;

          next(null);
        });
      },
      function (next)
      {
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

  describe('GET /property', function () {

    let mAccount;
    let mUser;
    let mRequest;
    let mPropertyList;
    const mPropertyListData = [
      // "Normal"
      {
        id: mPropertyIdList[0],
        name: 'Apple Gate',
        url: 'asss.co.ue',
        account_id: mAccountIdList[0],
      },
      // Deleted
      {
        id: mPropertyIdList[1],
        name: 'Test Property Two',
        url: 'asss2.co.ue',
        account_id: mAccountIdList[0],
        deleted_at: new Date(),
      },
      // Attached to a request
      {
        id: mPropertyIdList[2],
        name: 'Test Property Three',
        url: 'asss3.co.ue',
        account_id: mAccountIdList[0],
      },
    ];

    before((done) => {

      const createProperties = function (next)
      {
        Db.create('property', mPropertyListData).then((propertyList) => {

          mPropertyList = propertyList;

          next(null);
        })
        .catch((err) => {

          next(err);
        });
      }

      const createRequestProperty = function (next)
      {
        const data = {
          property_id: mPropertyIdList[2],
          request_id: mRequestIdList[0],
        };

        Db.knex('property_request').insert(data).then(() => {

          next(null);
        })
        .catch((err) => {

          next(err);
        });
      }

      Async.waterfall([
        refreshDb,
        function (next)
        {
          const ids = { accountId: mAccountIdList[0], userId: mUserIdList[0] };

          createAccountUserDuo(ids, (err, results) => {

            if (err) {
              next(err);
              return;
            }

            mAccount = results.account;
            mUser = results.user;

            next(null);
          });
        },
        function (next)
        {
          createRequest({ id: mRequestIdList[0], account_id: mAccountIdList[0] })
            .then((model) => {
              mRequest = model;

              next(null);
            });
        },
        createProperties,
        createRequestProperty,
      ], function (err, result) {

        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 when the client is not authorized`, function (done) {

      const options = {
        method: 'GET',
        url: `/property`,
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when the account id filter isn't included`, function (done) {

      const options = {
        method: 'GET',
        url: `/property`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 when successfully responds with the property collection`, function (done) {

      const options = {
        method: 'GET',
        url: `/property?filter[accountId]=${mAccountIdList[0]}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(200);

        const { data } = response.result;
        let containsDeleted = false;

        expect(data).to.be.length(2);

        data.forEach((property) => {

          if (property.attributes.deletedAt) {
            containsDeleted = true; 
          }
        });

        expect(containsDeleted).to.be.false();

        // Sorting by name
        expect(data[0].attributes.name).to.equal('Apple Gate');

        done();
      });
    });

    it(`200 when successfully responds with the property collection including deleted properties`, function (done) {

      const options = {
        method: 'GET',
        url: `/property?filter[accountId]=${mAccountIdList[0]}&filter[deleted]=true`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(200);

        const { data } = response.result;
        let containsDeleted = false;

        expect(data).to.be.length(3);

        data.forEach((property) => {

          if (property.attributes.deletedAt) {
            containsDeleted = true;
          }
        });

        expect(containsDeleted).to.be.true();

        done();
      });
    });

    it(`200 when account doesn't have any properties`, function (done) {

      const options = {
        method: 'GET',
        url: `/property?filter[accountId]=${mAccountIdList[1]}`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(0);

        done();
      });
    });

  });

});
