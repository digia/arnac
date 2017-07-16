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


describe('Property - Credential - Delete', function () {
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

  describe('DELETE /property/{propertyId}/credential/{id}', function () {
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
      const options = {
        method: 'DELETE',
        url: `/property/${mPropertyListData.website.id}/credential/${_id}`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when property isn't owned by to the authToken account`, function (done) {
      const _id = Uuid.v4();
      const options = {
        method: 'DELETE',
        url: `/property/${mPropertyListData.website.id}/credential/${_id}`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`204 when successfully delete the property credential`, function (done) {
      const credentialAttrs = {
        id: Uuid.v4(),
        type: 'Basic',
        identity: 'asdfasf@gmail.com',
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
        const options = {
          method: 'DELETE',
          url: `/property/${mPropertyListData.website.id}/credential/${credentialAttrs.id}`,
          headers: generateAuthHeaders(authToken),
        };

        Server.inject(options, (response) => {
          expect(response.statusCode).to.equal(204);

          done();
        });
      });
    });

    it(`404 when property credential doesn't exist`, function (done) {
      const _id = Uuid.v4();
      const options = {
        method: 'DELETE',
        url: `/property/${mPropertyListData.website.id}/credential/${_id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    it(`404 when property doesn't exist`, function (done) {
      const _id = Uuid.v4();
      const options = {
        method: 'DELETE',
        url: `/property/${_id}/credential/${_id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });
  });
});
