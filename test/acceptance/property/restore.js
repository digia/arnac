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


describe('Property - Restore', function () {

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

  describe('POST /property/{id}/restore', function () {

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
        deleted_at: new Date(),
      },
      {
        id: mPropertyIdList[1],
        name: 'Not deleted',
        url: 'ass3s.co.ue',
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
      ], function (err, result) {
        
        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 when the client is not authorized`, function (done) {

      const options = {
        method: 'POST',
        url: `/property/${mPropertyList[0].id}/restore`,
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when property isn't owned by to the requestee's account`, function (done) {

      const options = {
        method: 'POST',
        url: `/property/${mPropertyList[0].id}/restore`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 when successfully restores the property`, function (done) {

      const options = {
        method: 'POST',
        url: `/property/${mPropertyList[0].id}/restore`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('property');
        expect(id).to.be.a.string();

        expect(attributes.name).to.be.a.string();
        expect(attributes.url).to.be.a.string();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();

        done();
      });
    });

    it(`400 when attempting to restore a property that is not deleted`, function (done) {

      const options = {
        method: 'POST',
        url: `/property/${mPropertyList[1].id}/restore`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it(`404 when property doesn't exist`, function (done) {

      const _id = Uuid.v4();
      const options = {
        method: 'POST',
        url: `/property/${_id}/restore`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(404);

        done();
      });
    });

  });

});

