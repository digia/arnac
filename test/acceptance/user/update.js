import Async from 'async';
import Uuid from 'node-uuid';
import {
  db as Db,
  refreshDb,
  generateAuthHeaders,
  generateTokens,
  structurePayload,
  createAccountUserDuo,
  authority as Authority,
  server as Server } from '../helpers';


describe('User - Update', function () {
  const mAccountIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
  const mUserIdList = Array.apply(null, Array(3)).map(() => Uuid.v4());
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
    ], function (err) {

      if (err) {
        console.log(err);
      }

      done();
    });
  });

  describe('POST /user/{id}', function () {
    let mAccount;
    let mUser;
    let mUserSoftDeleteData;
    let mUserSoftDelete;

    before((done) => {
      const createDuplicateUser = function (next) {
        Authority().generateHash('aaaaaa').then((hash) => {
          const data = {
            id: mUserIdList[2],
            email: 'duplicate@digia.com',
            password_hash: hash,
            account_id: mAccountIdList[0],
          };

          Db.create('user', data).then((user) => {
            next(null);
          });
        });
      }

      const createSoftDeleteUsersAccount = function (next) {
        const data = {
          id: mAccountIdList[1],
          organization: 'What up?',
        };

        Db.create('account', data).then(() => {
          next(null);
        });
      };

      const createSoftDeletedUser = function (next) {
        Authority().generateHash('aaaaaa').then((hash) => {
          mUserSoftDeleteData = {
            id: mUserIdList[1],
            email: 'softdeleted@digia.com',
            fname: 'Tony',
            lname: 'Stark',
            password_hash: hash,
            account_id: mAccountIdList[1],
            deleted_at: new Date(),
          };

          Db.create('user', mUserSoftDeleteData).then((user) => {
            mUserSoftDelete = user;

            next(null);
          });
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
        createDuplicateUser,
        createSoftDeleteUsersAccount,
        createSoftDeletedUser,
      ], function (err) {
        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 when a updating client is not authorized`, function (done) {
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`400 when a update payload is empty`, function (done) {
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it(`401 when user id doesn't match the authToken user id`, function (done) {
      const attributes = {
        fname: 'Pass validation',
      };
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}`,
        headers: generateAuthHeaders(authTokenAccount2),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 when user successfully updates their information`, function (done) {
      const attributes = {
        email: 'smith@digia.com',
        fname: 'Jimmy',
        lname: 'Smith',
      };
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('user');
        expect(id).to.be.a.string();

        expect(attributes.email).to.equal('smith@digia.com');
        expect(attributes.fname).to.equal('Jimmy');
        expect(attributes.lname).to.equal('Smith');
        expect(attributes.password).to.not.exist();
        expect(attributes.passwordHash).to.not.exist();
        expect(attributes.passwordResetToken).to.not.exist();
        expect(attributes.passwordResetAt).to.not.exist();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();

        // Make sure it updated

        const options = {
          method: 'GET',
          url: `/user/${mUser.id}`,
          headers: generateAuthHeaders(authToken),
        };

        Server.inject(options, (response) => {
          expect(response.statusCode).to.equal(200);

          const { data } = response.result;
          const { type, id, attributes } = data;

          expect(type).to.be.a.string().and.equal('user');
          expect(id).to.be.a.string();

          expect(attributes.email).to.equal('smith@digia.com');
          expect(attributes.fname).to.equal('Jimmy');
          expect(attributes.lname).to.equal('Smith');
          expect(attributes.password).to.not.exist();
          expect(attributes.passwordHash).to.not.exist();
          expect(attributes.passwordResetToken).to.not.exist();
          expect(attributes.passwordResetAt).to.not.exist();
          expect(attributes.createdAt).to.be.a.string();
          expect(attributes.updatedAt).to.be.a.string();
          expect(attributes.deletedAt).to.be.null();

          done();
        });
      });
    });

    it(`200 when successfully clearing properties via null`, function (done) {
      const attributes = {
        lname: null,
      };
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('user');
        expect(id).to.be.a.string();

        expect(attributes.email).to.equal('smith@digia.com');
        // TODO(digia): Empty strings should be converted to null. Need to write a bookshelf addon
        expect(attributes.lname).to.equal(null);

        done();
      });
    });

    it(`200 successfully updating user email address`, function (done) {
      const attributes = {
        email: 'joesy@digia.com',
      };
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('user');
        expect(id).to.be.a.string();

        expect(attributes.email).to.equal(attributes.email);

        done();
      });
    });

    it(`400 when a invalid email address is provided`, function (done) {
      const attributes = {
        email: 'notvalidemail.com',
      };
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });


    it(`400 when attempting to update password as part of a normal update`, function (done) {
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}`,
        headers: generateAuthHeaders(authToken),
        payload: {
          password: 'should not work'
        }
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it(`400 when attempting to clear the email field`, function (done) {
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}`,
        headers: generateAuthHeaders(authToken),
        payload: {
          email: '',
        }
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it(`422 when updating email results in a duplicate`, function (done) {
      const attributes = {
        email: 'duplicate@digia.com',
      };
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(422);

        done();
      });
    });

    it(`404 when attempting to update a deleted user`, function (done) {
      const attributes = {
        fname: 'Joi',
      };
      const options = {
        method: 'POST',
        url: `/user/${mUserSoftDelete.id}`,
        headers: generateAuthHeaders(authTokenAccount2),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    it(`404 when attempting to update non-existant user`, function (done) {
      const _id = Uuid.v4();
      const attributes = {
        fname: 'Joi',
      };
      const options = {
        method: 'POST',
        url: `/user/${_id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });
  });
});

