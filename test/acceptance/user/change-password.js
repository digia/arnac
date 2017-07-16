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
  server as Server,
  uuidList,
} from '../helpers';


describe('User - Change Password', function () {

  let mAccountIdList = uuidList(2);
  let mUserIdList = uuidList(2);
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

  describe('POST /user/{id}/password', function () {
    let mAccount;
    let mUser;
    let mUserSoftDelete;

    before((done) => {
      const createSoftDeleteUsersAccount = function (next) {
        const data = {
          id: mAccountIdList[1],
          organization: 'What up?',
        };

        Db.create('account', data)
        .then(() => {
          next(null);
        });
      };

      const createSoftDeletedUser = function (next) {
        Authority().generateHash('aaaaaa')
        .then((hash) => {
          const data = {
            id: mUserIdList[1],
            email: 'softdeleted@digidigia.com',
            fname: 'Tony',
            lname: 'Stark',
            password_hash: hash,
            account_id: mAccountIdList[1],
            deleted_at: new Date(),
          };

          Db.create('user', data)
          .then((user) => {
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
        createSoftDeleteUsersAccount,
        createSoftDeletedUser,
      ], (err) => {
        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 when password updating client is not authorized`, function (done) {
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}/password`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when user id doesn't match the authToken user id`, function (done) {
      const attributes = {
        currentPassword: 'aaaaaa',
        newPassword: '123456',
      };
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}/password`,
        headers: generateAuthHeaders(authTokenAccount2),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`400 when password update payload is empty`, function (done) {
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}/password`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it.only(`200 when successfully updates the users password`, function (done) {
      const attributes = {
        currentPassword: 'aaaaaa',
        newPassword: '123456',
      };
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}/password`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { id, type, attributes } = response.result.data;

        expect(id).to.equal(mUser.id);
        expect(type).to.be.equal('user');

        expect(attributes.email).to.be.a.string();
        expect(attributes.fname).to.be.a.string();
        expect(attributes.lname).to.be.a.string();
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

    it(`422 when current password is incorect`, function (done) {
      const attributes = {
        currentPassword: 'baaaaa',
        newPassword: '123456',
      };
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}/password`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(422);

        done();
      });
    });

    it(`400 when password is not at least 6 characters long`, function (done) {
      const attributes = {
        currentPassword: '12345',
        newPassword: '12345',
      };
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}/password`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it(`400 when current password is not provided`, function (done) {
      const attributes = {
        newPassword: '123456',
      };
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}/password`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it(`400 when new password is not provided`, function (done) {
      const attributes = {
        currentPassword: 'aaaaaa',
      };
      const options = {
        method: 'POST',
        url: `/user/${mUser.id}/password`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it(`404 when attempting to update the password of a deleted user`, function (done) {
      const attributes = {
        currentPassword: 'aaaaaa',
        newPassword: '123456',
      };
      const options = {
        method: 'POST',
        url: `/user/${mUserSoftDelete.id}/password`,
        headers: generateAuthHeaders(authTokenAccount2),
        payload: structurePayload('user', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    it(`404 when user doesn't exist`, function (done) {
      const attributes = {
        currentPassword: 'aaaaaa',
        newPassword: '123456',
      };
      const _id = Uuid.v4();
      const options = {
        method: 'POST',
        url: `/user/${_id}/password`,
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
