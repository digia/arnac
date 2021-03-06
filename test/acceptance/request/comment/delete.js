import _ from 'lodash';
import Async from 'async';
import Uuid from 'node-uuid';
import {
  db as Db,
  refreshDb,
  generateAuthHeaders,
  generateTokens,
  createAccountUserDuo,
  authority as Authority,
  server as Server } from '../../helpers';


describe('Request Comment - Delete', function () {

  let mAccountIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
  let mUserIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
  let mRequestIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
  let mRequestCommentIdList = Array.apply(null, Array(3)).map(() => Uuid.v4());
  let authToken;
  let authTokenAccount2;
  let authTokenUser2;

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
        const ids = { accountId: mAccountIdList[1], userId: mUserIdList[0] };

        generateTokens(ids, (err, tokens) => {

          authTokenAccount2 = tokens.authToken;

          next(null);
        });
      },
      function (next)
      {
        const ids = { accountId: mAccountIdList[0], userId: mUserIdList[1] };

        generateTokens(ids, (err, tokens) => {

          authTokenUser2 = tokens.authToken;

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


  describe('DELETE /request/{requestId}/comment/{id}', function () {

    let mAccount;
    let mUser;
    let mRequestList;
    let mRequestCommentList;
    const mRequestListData = {
      // Estimate
      estimate: {
        id: mRequestIdList[0],
        state: 1,
        previous_state: 0,
        subject: 'Estimate Stage',
        body: '<p>Request has been submitted and either has an estimate or is awaiting one.</p>',
        account_id: mAccountIdList[0],
        submitted_at: new Date(),
      },
      // Deleted
      deleted: {
        id: mRequestIdList[1],
        state: 0,
        subject: 'This is a deleted request',
        body: '<p>Boop, bob, beep</p>',
        account_id: mAccountIdList[0],
        deleted_at: new Date(),
      }
    };
    const mRequestCommentListData = {
      // Available
      available: {
        id: mRequestCommentIdList[0],
        message: 'I am a available request comment',
        user_id: mUserIdList[0],
        commentable_id: mRequestIdList[0],
        commentable_type: 'request',
      },
      // Available on deleted request
      availableOnDeletedRequest: {
        id: mRequestCommentIdList[1],
        message: 'I am a available request comment',
        user_id: mUserIdList[0],
        commentable_id: mRequestIdList[1],
        commentable_type: 'request',
      },
      // Deleted
      deleted: {
        id: mRequestCommentIdList[2],
        message: 'I am a deleted request comment',
        user_id: mUserIdList[0],
        commentable_id: mRequestIdList[0],
        commentable_type: 'request',
        deleted_at: new Date(),
      },
    };


    before((done) => {

      const createRequests = function (next)
      {
        const data = _.values(mRequestListData);

        Db.create('request', data).then((requestList) => {

          mRequestList = requestList;

          next(null);
        })
        .catch((err) => {

          next(err);
        });
      }

      const createRequestComments = function (next)
      {
        const data = _.values(mRequestCommentListData);

        Db.create('comment', data).then((requestCommentList) => {

          mRequestCommentList = requestCommentList;

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
          const ids = { accountId: mAccountIdList[1], userId: mUserIdList[1] };

          createAccountUserDuo(ids, (err, results) => {

            if (err) {
              next(err);
              return;
            }

            next(null);
          });
        },
        createRequests,
        createRequestComments,
      ], function (err) {

        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 if client is not authorized`, function (done) {

      const options = {
        method: 'DELETE',
        url: `/request/${mRequestListData.estimate.id}/comment/${mRequestCommentListData.available.id}`,
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 if user id doesn't match the authToken user id`, function (done) {

      const options = {
        method: 'DELETE',
        url: `/request/${mRequestListData.estimate.id}/comment/${mRequestCommentListData.available.id}`,
        headers: generateAuthHeaders(authTokenUser2),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 if account id of the request doesn't match the authToken account id`, function (done) {

      const options = {
        method: 'DELETE',
        url: `/request/${mRequestListData.estimate.id}/comment/${mRequestCommentListData.available.id}`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`204 if succesfully deletes the request comment`, function (done) {

      const options = {
        method: 'DELETE',
        url: `/request/${mRequestListData.estimate.id}/comment/${mRequestCommentListData.available.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(204);


        // Fetch that request for sanity

        const options = {
          method: 'GET',
          url: `/request/${mRequestListData.estimate.id}/comment/${mRequestCommentListData.available.id}`,
          headers: generateAuthHeaders(authToken),
        };

        Server.inject(options, (response) => {

          expect(response.statusCode).to.equal(200);

          const { type, id, attributes } = response.result.data;

          expect(type).to.be.a.string().and.equal('request.comment');
          expect(id).to.be.a.string();

          expect(attributes.message).to.be.a.string();
          expect(attributes.createdAt).to.be.a.string();
          expect(attributes.updatedAt).to.be.a.string();
          expect(attributes.deletedAt).to.be.a.string();

          done();
        });
      });
    });

    it(`404 if request is deleted`, function (done) {

      const options = {
        method: 'DELETE',
        url: `/request/${mRequestListData.deleted.id}/comment/${mRequestCommentListData.availableOnDeletedRequest.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    it(`404 if request doesn't exist`, function (done) {

      const _id = Uuid.v4();
      const _id2 = Uuid.v4();
      const options = {
        method: 'DELETE',
        url: `/request/${_id}/comment/${_id2}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    it(`404 if request comment doesn't exist`, function (done) {

      const _id = Uuid.v4();
      const options = {
        method: 'DELETE',
        url: `/request/${mRequestListData.deleted.id}/comment/${_id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    it(`409 for bad state if attempting to delete a previously deleted request comment`, function (done) {

      const options = {
        method: 'DELETE',
        url: `/request/${mRequestListData.estimate.id}/comment/${mRequestCommentListData.deleted.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(409);

        done();
      });
    });

  });

});
