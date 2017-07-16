import Async from 'async';
import Uuid from 'node-uuid';
import {
  db as Db,
  refreshDb,
  uuidList,
  generateAuthHeaders,
  generateTokens,
  createAccountUserDuo,
  authority as Authority,
  server as Server,
} from '../helpers';


describe('User - Get', function () {
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

  describe('GET /user/{id}', function () {
    let mAccount;
    let mUser;
    let mUserSoftDelete;

    before((done) => {
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
          const data = {
            id: mUserIdList[1],
            email: 'softdeleted@digia.com',
            fname: 'Tony',
            lname: 'Stark',
            password_hash: hash,
            account_id: mAccountIdList[1],
            deleted_at: new Date(),
          };

          Db.create('user', data).then((user) => {
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

    it(`401 when client is not authorized`, function (done) {
      const options = {
        method: 'GET',
        url: `/user/${mUser.id}`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when user id doesn't match the authToken user id`, function (done) {
      const options = {
        method: 'GET',
        url: `/user/${mUser.id}`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 respondes with the requested user`, function (done) {
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

        expect(attributes.email).to.equal(mUser.email);
        expect(attributes.fname).to.equal(mUser.fname);
        expect(attributes.lname).to.equal(mUser.lname);
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

    it(`200 respondes with soft deleted users`, function (done) {
      const options = {
        method: 'GET',
        url: `/user/${mUserSoftDelete.id}`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;
        const { type, id, attributes } = data;

        expect(type).to.be.a.string().and.equal('user');
        expect(id).to.be.a.string();

        expect(attributes.deletedAt).to.be.a.string();

        done();
      });
    });

    it(`200 respondes with the requested user and it's included account`, function (done) {
      const options = {
        method: 'GET',
        url: `/user/${mUser.id}?include=account`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { included } = response.result;
        const { type, id, attributes, relationships } = response.result.data;

        expect(type).to.be.a.string().and.equal('user');
        expect(id).to.be.a.string();

        expect(relationships.account).to.be.an.object();
        expect(relationships.account.data).to.be.an.object();
        expect(relationships.account.data.type).to.equal('account');
        expect(relationships.account.data.id).to.be.a.string();

        done();
      });
    });

    it(`404 when user doesn't exist`, function (done) {
      const _id = Uuid.v4();
      const options = {
        method: 'GET',
        url: `/user/${_id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });
  });
});
