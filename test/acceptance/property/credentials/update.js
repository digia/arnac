import _ from 'lodash';
import Async from 'async';
import Uuid from 'node-uuid';
import { PropertyCredential } from '../../../../src/property/models';
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


describe('Property - Credential - Update', function () {
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

  describe('POST /property/{propertyId}/credential/{id}', function () {
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
      const _id = Uuid.v4();
      const payload = {
        type: 'Basic',
        identity: 'testasdfa@gmadasdf.com',
        authentication: '123456',
      };
      const options = {
        method: 'POST',
        url: `/property/${mPropertyListData.website.id}/credential/${_id}`,
        payload: structurePayload('property-credential', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when property isn't owned by to the authToken account`, function (done) {
      const _id = Uuid.v4();
      const payload = {
        type: 'Basic',
        identity: 'testasdfa@gmadasdf.com',
        authentication: '123456',
      };
      const options = {
        method: 'POST',
        url: `/property/${mPropertyListData.website.id}/credential/${_id}`,
        headers: generateAuthHeaders(authTokenAccount2),
        payload: structurePayload('property-credential', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 when successfully update the property credential`, function (done) {
      const credentialAttrs = {
        id: Uuid.v4(),
        type: 'Basic',
        identity: 'adddd@gmail.com',
        authentication: 'z9afaskdfjasdf',
      };

      const property = {
        id: mPropertyListData.website.id,
        credentialKey: mPropertyListData.website.credential_key,
        get(key) {
          return this[key];
        }
      };

      const factory = PropertyCredential();

      factory.forge(credentialAttrs, { property })
      .create()
      .then(() => {
        const payload = {
          identity: 'newidenitty@gmaiaa.com',
        };
        const options = {
          method: 'POST',
          url: `/property/${mPropertyListData.website.id}/credential/${credentialAttrs.id}?include=property`,
          headers: generateAuthHeaders(authToken),
          payload: structurePayload('property-credential', payload),
        };

        Server.inject(options, (response) => {
          expect(response.statusCode).to.equal(200);

          const { data, included } = response.result;

          const property = included.filter(i => i.type === 'property')[0];

          expect(property).to.exist();

          const { type, id, attributes, relationships } = data;

          expect(id).to.be.a.string();
          expect(type).to.be.a.string().and.equal('property-credential');

          expect(attributes.type).to.be.a.string();
          expect(attributes.identity).to.be.a.string();
          expect(attributes.authentication).to.be.a.string();
          expect(attributes.createdAt).to.be.a.string();
          expect(attributes.updatedAt).to.be.a.string();
          expect(attributes.propertyId).to.not.exist();

          expect(relationships.property).to.exist();

          done();
        });
      });
    });

    it(`409 when attempting to update property credential and it match a pre-existing property credential`, function (done) {
      const credentialAttrs1 = {
        id: Uuid.v4(),
        type: 'Basic',
        identity: 'asdfasf@gmail.com',
        authentication: 'z9afaskdfjasdf',
      };

      const credentialAttrs2 = {
        id: Uuid.v4(),
        type: 'PIN',
        authentication: '55232',
      };

      const property = {
        id: mPropertyListData.website.id,
        credentialKey: mPropertyListData.website.credential_key,
        get(key) {
          return this[key];
        }
      };

      const factory = PropertyCredential();

      factory.forge(credentialAttrs1, { property })
      .create()
      .then(() => {
        return factory.forge(credentialAttrs2, { property })
        .create();
      })
      .then(() => {
        const payload = {
          type: 'Basic',
          identity: 'asdfasf@gmail.com',
          authentication: 'z9afaskdfjasdf',
        };
        const options = {
          method: 'POST',
          url: `/property/${mPropertyListData.website.id}/credential/${credentialAttrs2.id}?include=property`,
          headers: generateAuthHeaders(authToken),
          payload: structurePayload('property-credential', payload),
        };

        Server.inject(options, (response) => {
          expect(response.statusCode).to.equal(409);

          done();
        });
      });
    });



    it(`404 when property credential doesn't exist`, function (done) {
      const _id = Uuid.v4();
      const payload = {
        type: 'Basic',
        identity: 'testasdfa@gmadasdf.com',
        authentication: '123456',
      };

      const options = {
        method: 'POST',
        url: `/property/${mPropertyListData.website.id}/credential/${_id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('property-credential', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

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
        url: `/property/${_id}/credential/${_id}`,
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

