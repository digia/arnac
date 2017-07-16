import Async from 'async';
import Uuid from 'node-uuid';
import { 
  db as Db,
  generateAuthHeaders,
  generateTokens,
  createAccountUserDuo,
  createRequest,
  refreshDb,
  authority as Authority,
  server as Server } from '../helpers';


describe('Property - Delete', function () {

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

  describe('DELETE /property/{id}', function () {

    let mAccount;
    let mUser;
    let mRequest;
    let mPropertyList;
    const mPropertyListData = [
      // "Normal"
      {
        id: mPropertyIdList[0],
        name: 'Test Property One',
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
        method: 'DELETE',
        url: `/property/${mPropertyList[0].id}`,
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when property isn't owned by to the requestee's account`, function (done) {

      const options = {
        method: 'DELETE',
        url: `/property/${mPropertyList[0].id}`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`204 when successfully deleting a request without any attachments - e.g. requests`, function (done) {

      const options = {
        method: 'DELETE',
        url: `/property/${mPropertyList[0].id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(204);


        // Make sure it completely gone, not soft deleted

        const options = {
          method: 'GET',
          url: `/property/${mPropertyList[0].id}`,
          headers: generateAuthHeaders(authToken),
        };

        Server.inject(options, (response) => {

          expect(response.statusCode).to.equal(404);

          done();
        });
      });
    });

    it(`204 when successfully soft deletes a property with attachments - e.g. requests`, function (done) {

      const options = {
        method: 'DELETE',
        url: `/property/${mPropertyList[2].id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(204);


        // It should still exist, though soft deleted

        const options = {
          method: 'GET',
          url: `/property/${mPropertyList[2].id}`,
          headers: generateAuthHeaders(authToken),
        };

        Server.inject(options, (response) => {

          expect(response.statusCode).to.equal(200);

          done();
        });
      });
    });

    it(`404 when property doesn't exist`, function (done) {

      const _id = Uuid.v4();
      const options = {
        method: 'DELETE',
        url: `/property/${_id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    it(`409 when property is already deleted`, function (done) {

      const options = {
        method: 'DELETE',
        url: `/property/${mPropertyList[1].id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(409);

        done();
      });
    });

  });

});
