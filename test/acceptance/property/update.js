import Async from 'async';
import Uuid from 'node-uuid';
import {
  db as Db,
  refreshDb,
  generateAuthHeaders,
  structurePayload,
  structureRelationshipPayload,
  generateTokens,
  createAccountUserDuo,
  createRequest,
  authority as Authority,
  server as Server,
  uuidList,
} from '../helpers';


describe('Property - Update', function () {
  const mAccountIdList = uuidList(2);
  const mUserIdList = uuidList(2);
  const mPropertyIdList = uuidList(3);
  const mRequestIdList = uuidList(1);
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
    ], (err) => {
      if (err) {
        console.log(err);
      }

      done();
    });
  });

  describe('POST /property/{id}', function () {
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
      const createProperties = function (next) {
        Db.create('property', mPropertyListData)
        .then((propertyList) => {

          mPropertyList = propertyList;

          next(null);
        })
        .catch((err) => {
          next(err);
        });
      }

      const createRequestProperty = function (next) {
        const data = {
          property_id: mPropertyIdList[2],
          request_id: mRequestIdList[0],
        };

        Db.knex('property_request').insert(data)
        .then(() => {
          next(null);
        })
        .catch((err) => {
          next(err);
        });
      }

      Async.waterfall([
        refreshDb,
        function (next) {
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
        function (next) {
          createRequest({ id: mRequestIdList[0], account_id: mAccountIdList[0]})
            .then((model) => {
              mRequest = model;

              next(null);
            });
        },
        createProperties,
        createRequestProperty,
      ], (err) => {
        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 when client is not authorized`, function (done) {
      const options = {
        method: 'POST',
        url: `/property/${mPropertyList[0].id}`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when authorized creater account id does not match the property account id`, function (done) {
      const attributes = { name: 'changed' };
      const options = {
        method: 'POST',
        url: `/property/${mPropertyList[0].id}`,
        headers: generateAuthHeaders(authTokenAccount2),
        payload: structurePayload('property', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 when successfully update property`, function (done) {
      const attributes = { name: 'Updated' };
      const options = {
        method: 'POST',
        url: `/property/${mPropertyList[0].id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('property', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('property');
        expect(id).to.be.a.string();

        expect(attributes.name).to.be.equal(attributes.name);
        expect(attributes.url).to.be.a.string();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();

        done();
      });
    });

    it(`400 when no update attributes are provided`, function (done) {
      const options = {
        method: 'POST',
        url: `/property/${mPropertyList[0].id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('property', {}),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it(`400 when attempting to update it's account relation`, function (done) {
      const attributes = { name: 'hello' };
      const relationships = structureRelationshipPayload('account', mAccountIdList[1]);
      const options = {
        method: 'POST',
        url: `/property/${mPropertyList[0].id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('property', attributes, relationships),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it(`404 when property doesn't exist`, function (done) {
      const _id = Uuid.v4();
      const attributes = { name: 'changed' };
      const options = {
        method: 'POST',
        url: `/property/${_id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('property', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    it(`404 when attempting to update a deleted property`, function (done) {
      const attributes = { name: 'hello' };
      const options = {
        method: 'POST',
        url: `/property/${mPropertyList[1].id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('property', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });
  });
});
