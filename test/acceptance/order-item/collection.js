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
  createSku,
  authority as Authority,
  server as Server,
} from '../helpers';


describe('Order Item - Collection', function () {
  let mAccountIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
  let mUserIdList = Array.apply(null, Array(2)).map(() => Uuid.v4());
  let mOrderIdList = Array.apply(null, Array(4)).map(() => Uuid.v4());
  let mOrderItemIdList = Array.apply(null, Array(4)).map(() => Uuid.v4());
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


  describe('GET /order-item', function () {

    let mAccount;
    let mUser;
    let mOrderList;
    let mOrderItemList;
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
      },
      pendingWithoutItems: {
        id: mOrderIdList[2],
        state: 1,
        account_id: mAccountIdList[0],
      },
      deleted: {
        id: mOrderIdList[3],
        state: 1,
        account_id: mAccountIdList[0],
        deleted_at: new Date()
      },
    };

    const mOrderItemListData = {
      block: {
        id: mOrderItemIdList[0],
        lineable_id: mOrderIdList[1],
        lineable_type: 'order',
        amount: 1,
        currency: 'blk',
        quantity: 3,
        sku_id: 1,
      },
      license: {
        id: mOrderItemIdList[1],
        lineable_id: mOrderIdList[1],
        lineable_type: 'order',
        amount: 99 * 100,
        currency: 'usd',
        quantity: 1,
        sku_id: 2,
      },
      blockOnDraft: {
        id: mOrderItemIdList[2],
        lineable_id: mOrderIdList[0],
        lineable_type: 'order',
        amount: 30 * 100,
        currency: 'usd',
        quantity: 2,
      },
      blockOnDeleted: {
        id: mOrderItemIdList[3],
        lineable_id: mOrderIdList[3],
        lineable_type: 'order',
        amount: 30 * 100,
        currency: 'usd',
        quantity: 2,
      },
    };

    before((done) => {

      const createOrders = function (next) {
        const data = _.values(mOrderListData);

        Db.create('order', data)
          .then((orderList) => {
            mOrderList = orderList;

            next(null);
          })
          .catch((err) => {
            next(err);
          });
      }

      const createOrderItemSkus = function (next) {
        createSku({ id: 1 })
          .then(() => createSku({ id: 2 }))
          .then(() => next(null))
          .catch((err) => next(err));
      }

      const createOrderItems = function (next) {
        const data = _.values(mOrderItemListData);

        Db.create('line_item', data)
          .then((orderItemList) => {
            mOrderItemList = orderItemList;

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
        createOrders,
        createOrderItemSkus,
        createOrderItems,
      ], function (err, result) {
        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 if client is not authorized`, function (done) {

      const options = {
        method: 'GET',
        url: `/order-item?filter[orderId]=${mOrderListData.pending.id}`,
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 if account id of the request doesn't match the authToken account id`, function (done) {

      const options = {
        method: 'GET',
        url: `/order-item?filter[orderId]=${mOrderListData.pending.id}`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 if successfully returns the order item collection`, function (done) {
      const options = {
        method: 'GET',
        url: `/order-item?filter[orderId]=${mOrderListData.pending.id}&include=order,sku`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { data, included } = response.result;

        expect(data).to.be.length(2);
        expect(included).to.be.length(3);

        expect(included.filter(i => i.type == 'order')).to.be.length(1);
        expect(included.filter(i => i.type == 'sku')).to.be.length(2);

        done();
      });
    });

    it(`200 if successfully returns the empty order item collection`, function (done) {

      const options = {
        method: 'GET',
        url: `/order-item?filter[orderId]=${mOrderListData.pendingWithoutItems.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(0);

        done();
      });
    });

    it(`200 if successfully returns the empty order item collection for a nonexistant order`, function (done) {

      const _id = Uuid.v4();
      const options = {
        method: 'GET',
        url: `/order-item?filter[orderId]=${_id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(0);

        done();
      });
    });

    it(`200 if successfully returns the empty order item collection for a soft deleted order`, function (done) {

      const options = {
        method: 'GET',
        url: `/order-item?filter[orderId]=${mOrderListData.deleted.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(0);

        done();
      });
    });

    it(`200 if successfully returns the order filtered by currency`, function (done) {

      const options = {
        method: 'GET',
        url: `/order-item?filter[orderId]=${mOrderListData.pending.id}&filter[currency]=usd`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(1);

        expect(data[0].attributes.currency).to.equal('usd');

        done();
      });
    });

    it(`409 if requesting an order item attached to a draft order`, function (done) {

      const options = {
        method: 'GET',
        url: `/order-item?filter[orderId]=${mOrderListData.draft.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(409);

        done();
      });
    });

  });

});

