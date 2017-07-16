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
  server as Server } from '../helpers';


describe('Order - Reject', function () {

  let mAccountIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
  let mUserIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
  let mOrderIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
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


  describe('POST /order/{id}/reject', function () {

    let mAccount;
    let mUser;
    let mRequestList;
    let mOrderList;
    const mOrderListData = {
      draft: {
        id: mOrderIdList[0],
        state: 0,
        account_id: mAccountIdList[0],
      },
      pending: {
        id: mOrderIdList[1],
        state: 1,
        account_id: mAccountIdList[0],
      }
    };


    before((done) => {

      const createOrders = function (next)
      {
        const data = _.values(mOrderListData);

        Db.create('order', data).then((orderList) => {

          mOrderList = orderList;

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
        createOrders,
      ], function (err, result) {

        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 if client is not authorized`, function (done) {

      const options = {
        method: 'POST',
        url: `/order/${mOrderListData.pending.id}/reject`,
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 if account id of the request doesn't match the authToken account id`, function (done) {

      const options = {
        method: 'POST',
        url: `/order/${mOrderListData.pending.id}/reject`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 if successfully rejects the order`, function (done) {

      const options = {
        method: 'POST',
        url: `/order/${mOrderListData.pending.id}/reject`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('order');
        expect(id).to.be.a.string();

        expect(attributes.state).to.equal(2);
        expect(attributes.status).to.be.a.string().and.equal('Rejected');
        expect(attributes.note).to.be.null();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
          expect(attributes.deletedAt).to.be.null();


        // Fetch for sanity

        const options = {
          method: 'GET',
          url: `/order/${mOrderListData.pending.id}`,
          headers: generateAuthHeaders(authToken),
        };

        Server.inject(options, (response) => {

          expect(response.statusCode).to.equal(200);

          const { type, id, attributes } = response.result.data;

          expect(type).to.be.a.string().and.equal('order');
          expect(id).to.be.a.string();

          expect(attributes.state).to.equal(2);
          expect(attributes.status).to.be.a.string().and.equal('Rejected');
          expect(attributes.note).to.be.null();
          expect(attributes.createdAt).to.be.a.string();
          expect(attributes.updatedAt).to.be.a.string();
          expect(attributes.deletedAt).to.be.null();

          done();
        });
      });
    });

    it(`409 if requesting an order that is a draft`, function (done) {

      const options = {
        method: 'POST',
        url: `/order/${mOrderListData.draft.id}/reject`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(409);

        done();
      });
    });

    it(`404 if order doesn't exist`, function (done) {

      const _id = Uuid.v4();
      const options = {
        method: 'POST',
        url: `/order/${_id}/reject`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(404);

        done();
      });
    });

  });

});
