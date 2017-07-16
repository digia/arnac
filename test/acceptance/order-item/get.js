import _ from 'lodash';
import Async from 'async';
import Uuid from 'node-uuid';
import {
  db as Db,
  refreshDb,
  uuidList,
  generateAuthHeaders,
  generateTokens,
  createAccountUserDuo,
  createRequest,
  createSku,
  authority as Authority,
  server as Server,
} from '../helpers';


describe('Order Item - Get', function () {
  const mAccountIdList = uuidList(2);
  const mUserIdList = uuidList(2);
  const mInvoiceIdList = uuidList(1);
  const mOrderIdList = uuidList(3);
  const mOrderItemIdList = uuidList(6);
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

  describe('GET /order-item/{id}', function () {
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
      deleted: {
        id: mOrderIdList[2],
        state: 1,
        account_id: mAccountIdList[0],
        deleted_at: new Date(),
      },
    };

    const mOrderItemListData = {
      usd: {
        id: mOrderItemIdList[0],
        lineable_id: mOrderIdList[1],
        lineable_type: 'order',
        amount: 30 * 100,
        currency: 'usd',
        quantity: 3,
      },
      blk: {
        id: mOrderItemIdList[1],
        lineable_id: mOrderIdList[1],
        lineable_type: 'order',
        amount: 1,
        currency: 'blk',
        quantity: 1,
        sku_id: 1,
      },
      blkOnDraft: {
        id: mOrderItemIdList[2],
        lineable_id: mOrderIdList[0],
        lineable_type: 'order',
        amount: 30 * 100,
        currency: 'blk',
        quantity: 2,
      },
      usdOnDeleted: {
        id: mOrderItemIdList[3],
        lineable_id: mOrderIdList[2],
        lineable_type: 'order',
        amount: 10 * 100,
        currency: 'usd',
        quantity: 1,
      },
      notOrderType: {
        id: mOrderItemIdList[4],
        lineable_id: mOrderIdList[1],
        lineable_type: 'invoice',
        amount: 10 * 100,
        currency: 'usd',
        quantity: 1,
      },
      halfQuantity: {
        id: mOrderItemIdList[5],
        lineable_id: mOrderIdList[1],
        lineable_type: 'order',
        amount: 10 * 100,
        currency: 'usd',
        quantity: 0.5,
      },
    };

    before((done) => {
      const createOrderItemSku = function (next) {
        createSku()
          .then(() => next(null))
          .catch((err) => next(err));
      }

      const createOrders = function (next) {
        const data = _.values(mOrderListData);

        Db.create('order', data).then((orderList) => {
          mOrderList = orderList;

          next(null);
        })
        .catch((err) => {
          next(err);
        });
      }

      const createOrderItems = function (next) {
        const data = _.values(mOrderItemListData);

        Db.create('line_item', data).then((orderItemList) => {
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
        createOrderItemSku,
        createOrders,
        createOrderItems,
      ], (err) => {
        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 if client is not authorized`, function (done) {
      const options = {
        method: 'GET',
        url: `/order-item/${mOrderItemListData.blk.id}`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 if account id of the request doesn't match the authToken account id`, function (done) {
      const options = {
        method: 'GET',
        url: `/order-item/${mOrderItemListData.blk.id}`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 if successfully returns the order item`, function (done) {
      const options = {
        method: 'GET',
        url: `/order-item/${mOrderItemListData.blk.id}?include=order,sku`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { data, included } = response.result;
        const { type, id, attributes, relationships } = data;

        expect(included).to.be.length(2);
        expect(relationships).to.be.length(2);

        expect(type).to.be.a.string().and.equal('order-item');
        expect(id).to.be.a.string();

        expect(attributes.amount).to.be.a.number()
        expect(attributes.currency).to.be.a.string();
        expect(attributes.quantity).to.be.a.number();
        expect(attributes.description).to.be.null();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();


        expect(_.some(included, (i) => i.type === 'order')).to.be.true();
        expect(_.some(included, (i) => i.type === 'sku')).to.be.true();

        done();
      });
    });

    it(`200 if successfully returns the order item with a half quantity`, function (done) {
      const options = {
        method: 'GET',
        url: `/order-item/${mOrderItemListData.halfQuantity.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('order-item');
        expect(id).to.be.a.string();

        expect(attributes.amount).to.be.a.number()
        expect(attributes.currency).to.be.a.string();
        expect(attributes.quantity).to.be.equal(0.5);
        expect(attributes.description).to.be.null();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();

        done();
      });
    });

    it(`409 if requesting an order item attached to a draft order`, function (done) {
      const options = {
        method: 'GET',
        url: `/order-item/${mOrderItemListData.blkOnDraft.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(409);

        done();
      });
    });

    it(`404 if the order has been soft deleted`, function (done) {
      const options = {
        method: 'GET',
        url: `/order-item/${mOrderItemListData.usdOnDeleted.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    it(`404 if it's not attached to an order`, function (done) {
      const options = {
        method: 'GET',
        url: `/order-item/${mOrderItemListData.notOrderType.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    it(`404 if order is soft deleted`, function (done) {
      const options = {
        method: 'GET',
        url: `/order-item/${mOrderItemListData.usdOnDeleted.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });


    it(`404 if order item doesn't exist`, function (done) {
      const _id = Uuid.v4();
      const options = {
        method: 'GET',
        url: `/order-item/${_id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });
  });
});
