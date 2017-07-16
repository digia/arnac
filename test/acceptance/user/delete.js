import Async from 'async';
import Uuid from 'node-uuid';
import {
  db as Db,
  refreshDb,
  generateAuthHeaders,
  generateTokens,
  createAccountUserDuo,
  authority as Authority,
  server as Server } from '../helpers';


describe('User - TODO - Delete - Not Implemented', function () {

  let mAccountIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
  let mUserIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
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


  it(`TODO(digia): Implement this later on. Determine how use deletion should be handled`, function (done) {

    const _id = Uuid.v4();
    const options = {
      method: 'DELETE',
      url: `/user/${_id}`,
      headers: generateAuthHeaders(authToken),
    };

    Server.inject(options, (response) => {

      expect(response.statusCode).to.equal(404);

      done();
    });
  });

  /*
  // TODO(digia): Focus more on user deletion later on
  describe('DELETE /user/{id}', function () {

    let mAccount;
    let mAccountId;
    let mUser;
    let mUserId;
    let authTokenUser2;

    before((done) => {

      const generateAuthTokenUser2 = function (next)
      {
        const payload = { accountId: 1, userId: 2 };

        Authority().generateAuthToken(payload).then((token) => {

          authTokenUser2 = token;

          next(null)
        })
        .catch((err) => next(err));
      }

      const assignAccountUser = function (models, next) 
      {
        mAccount = models.account;
        mAccountId = uuidHasher.encode(models.account.id);
        mUser = models.user;
        mUserId = uuidHasher.encode(models.user.id);

        next(null);
      }

      Async.waterfall([
        refreshDb,
        generateAuthTokenUser2,
        createAccountUserDuo,
        assignAccountUser,
      ], function (err, result) {

        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 when deleting client is not authorized`, function (done) {

      const options = {
        method: 'DELETE',
        url: `/user/${mUserId}`,
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when authorized deletee user's id doesn't match the user id`, function (done) {

      const options = {
        method: 'DELETE',
        url: `/user/${mUserId}`,
        headers: generateAuthHeaders(authTokenUser2), // Mismatch token
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`deletes a user resulting in a soft delete`, function (done) {

      const options = {
        method: 'DELETE',
        url: `/user/${mUserId}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(204);

        done();
      });
    });

    it(`deleting an already deleted user results on a 409`, function (done) {

      const options = {
        method: 'DELETE',
        url: `/user/${mUserId}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(409);

        done();
      });
    });

  });
  */

});
