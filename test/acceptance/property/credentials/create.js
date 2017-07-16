import _ from 'lodash';
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
  server as Server,
  structurePayload,
  uuidList,
} from '../../helpers';


describe('Property - Credential - Create', function () {
  const mAccountIdList = uuidList(2);
  const mUserIdList = uuidList(2);
  const mPropertyIdList = uuidList(3);
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

  describe('POST /property/{propertyId}/credential', function () {
    let mAccount;
    let mUser;

    const mPropertyListData = {
      website: {
        id: mPropertyIdList[0],
        name: 'Test Property One',
        url: 'asss.co.ue',
        account_id: mAccountIdList[0],
        credential_key: 'iamadasf',
      },
      websiteWithoutCredentialKey: {
        id: mPropertyIdList[1],
        name: 'Test Property One',
        url: 'asss.co.ue',
        account_id: mAccountIdList[0],
      },
    };

    before((done) => {
      const createProperties = function (next) {
        Db.create('property', _.values(mPropertyListData))
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
        createProperties,
      ], (err) => {
        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 when the client is not authorized`, function (done) {
      const payload = {
        type: 'Basic',
        identity: 'testasdfa@gmadasdf.com',
        authentication: '123456',
      };
      const options = {
        method: 'POST',
        url: `/property/${mPropertyListData.website.id}/credential`,
        payload: structurePayload('property-credential', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when property isn't owned by to the authToken account`, function (done) {
      const payload = {
        type: 'Basic',
        identity: 'testasdfa@gmadasdf.com',
        authentication: '123456',
      };
      const options = {
        method: 'POST',
        url: `/property/${mPropertyListData.website.id}/credential`,
        headers: generateAuthHeaders(authTokenAccount2),
        payload: structurePayload('property-credential', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 when successfully created the property credential`, function (done) {
      const payload = {
        type: 'Basic',
        identity: 'testasdfa@gmadasdf.com',
        authentication: '123456',
      };
      const options = {
        method: 'POST',
        url: `/property/${mPropertyListData.website.id}/credential?include=property`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('property-credential', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(201);

        const { data, included } = response.result;

        const property = included.filter(i => i.type === 'property')[0];

        expect(property).to.exist();

        const { type, id, attributes, relationships } = data;

        expect(id).to.be.a.string();
        expect(type).to.be.a.string().and.equal('property-credential');

        expect(attributes.type).to.be.equal(payload.type);
        expect(attributes.identity).to.be.a.string();
        expect(attributes.authentication).to.be.a.string();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.propertyId).to.not.exist();

        expect(relationships.property).to.exist();

        done();
      });
    });

    // NOTE(digia): This must come after the 200 success
    it(`409 when attempting to create a duplicate property credential`, function (done) {
      const payload = {
        type: 'Basic',
        identity: 'testasdfa@gmadasdf.com',
        authentication: '123456',
      };
      const options = {
        method: 'POST',
        url: `/property/${mPropertyListData.website.id}/credential`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('property-credential', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(409);

        done();
      });
    });

    it(`200 when successfully created the property credential with a predefined id`, function (done) {
      const id = Uuid.v4();
      const payload = {
        type: 'PIN',
        authentication: '10987654321',
      };
      const options = {
        method: 'POST',
        url: `/property/${mPropertyListData.website.id}/credential`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload({ type: 'property-credential', id }, payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(201);

        const { data } = response.result;

        const { type, id, attributes } = data;

        expect(id).to.be.equal(id);
        expect(type).to.be.a.string().and.equal('property-credential');

        expect(attributes.type).to.be.equal(payload.type);
        expect(attributes.identity).to.be.null();
        expect(attributes.authentication).to.be.a.string();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.propertyId).to.not.exist();

        done();
      });
    });

    it(`409 when attempting to create a credential without property having a credential key`, function (done) {
      const payload = {
        type: 'Basic',
        identity: 'nocredentialkey@adsdf.com',
        authentication: '33323211',
      };
      const options = {
        method: 'POST',
        url: `/property/${mPropertyListData.websiteWithoutCredentialKey.id}/credential`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('property-credential', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(409);

        done();
      });
    });

    it(`400 when attempting to create a basic credential without a authentication`, function (done) {
      const payload = {
        type: 'Basic',
        identity: 'testasdfa@gmadasdf.com',
      };
      const options = {
        method: 'POST',
        url: `/property/${mPropertyListData.website.id}/credential`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('property-credential', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it(`404 when property doesn't exist`, function (done) {
      const _id = Uuid.v4();
      const payload = {
        type: 'Basic',
        identity: 'testasdfa@gmadasdf.com',
        authentication: '123456',
      };
      const options = {
        method: 'POST',
        url: `/property/${_id}/credential`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('property-credential', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });
  });
});
