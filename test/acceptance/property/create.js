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


describe('Property - Create', function () {
  const mAccountIdList = uuidList(2);
  const mUserIdList = uuidList(2);
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


  describe('POST /property', function () {
    let mAccount;
    let mUser;

    before((done) => {
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
        url: `/property`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when authorized creater account id does not match the property account id`, function (done) {
      const attributes = {
        name: 'Test Property',
        url: 'testtesee.ao.au',
      };
      const relationships = structureRelationshipPayload('account', mAccount.id);
      const options = {
        method: 'POST',
        url: `/property`,
        headers: generateAuthHeaders(authTokenAccount2),
        payload: structurePayload('property', attributes, relationships),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`201 when successfully creates a new property`, function (done) {
      const attributes = {
        name: 'Test Property',
        url: 'testtesee.ao.au',
      };
      const relationships = structureRelationshipPayload('account', mAccount.id);
      const options = {
        method: 'POST',
        url: `/property`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('property', attributes, relationships),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(201);

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

    it(`201 when successfully creates a new property with a premade id`, function (done) {
      const id = Uuid.v4();
      const attributes = {
        name: 'Premade Id test',
        url: 'uuid.can.be.cool.com',
      };
      const relationships = structureRelationshipPayload('account', mAccount.id); 

      const options = {
        method: 'POST',
        url: `/property`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload({ type: 'property', id }, attributes, relationships),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(201);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('property');
        expect(id).to.equal(id).and.be.a.string();

        expect(attributes.name).to.be.a.string();
        expect(attributes.url).to.be.a.string();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();

        done();
      });
    });

    it(`400 when attempting to create a property without a url`, function (done) {
      const attributes = { name: 'i wont create' };
      const relationships = structureRelationshipPayload('account', mAccount.id);
      const options = {
        method: 'POST',
        url: `/property`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('property', attributes, relationships),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it(`400 when attempting to create a property without an account relationship`, function (done) {
      const attributes = {
        name: 'i wont create',
        url: 'disbe.bot',
      };
      const options = {
        method: 'POST',
        url: `/property`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('property', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });
  });
});
