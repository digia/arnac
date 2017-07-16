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
  authority as Authority,
  server as Server } from '../helpers';


describe('Order - Approve', function () {
  const mAddressIdList = uuidList(1);
  const mAccountIdList = uuidList(2);
  const mUserIdList = uuidList(2);
  const mOrderIdList = uuidList(10);
  const mOrderItemIdList = uuidList(9);
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

  describe('POST /order/{id}/approve', function () {
    let mAccount;
    let mAccountWithoutAddress;
    let mRequestList;
    let mOrderList;
    let mAddressList;
    let mOrderItemList;

    const mAddressListData = {
      normal: {
        id: mAddressIdList[0],
        organization: 'Normal 1',
        street: 'Normal 1 Ave.',
        city: 'Lansing',
        state: 'MI',
        zipcode: '99999',
        country: 'US',
      },
    };

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
      pending2: {
        id: mOrderIdList[2],
        state: 1,
        account_id: mAccountIdList[0],
      },
      pending3: {
        id: mOrderIdList[3],
        state: 1,
        account_id: mAccountIdList[1],
      },
      pendingMultipleCurrencies: {
        id: mOrderIdList[4],
        state: 1,
        account_id: mAccountIdList[0],
      },
      rejected: {
        id: mOrderIdList[5],
        state: 2,
        account_id: mAccountIdList[0],
      },
      approved: {
        id: mOrderIdList[6],
        state: 3,
        account_id: mAccountIdList[0],
      },
      partial: {
        id: mOrderIdList[7],
        state: 4,
        account_id: mAccountIdList[0],
      },
      invoiced: {
        id: mOrderIdList[8],
        state: 5,
        account_id: mAccountIdList[0],
      },
      deleted: {
        id: mOrderIdList[9],
        state: 5,
        account_id: mAccountIdList[0],
        deleted_at: new Date(),
      }
    };

    const mOrderItemListData = [
      {
        id: mOrderItemIdList[0],
        lineable_id: mOrderIdList[1],
        lineable_type: 'order',
        amount: 30 * 100,
        currency: 'usd',
        quantity: 3,
      },
      {
        id: mOrderItemIdList[1],
        lineable_id: mOrderIdList[2],
        lineable_type: 'order',
        amount: 30 * 100,
        currency: 'usd',
        quantity: 3,
      },
      {
        id: mOrderItemIdList[2],
        lineable_id: mOrderIdList[2],
        lineable_type: 'order',
        amount: 1,
        currency: 'blk',
        quantity: 1,
      },
      {
        id: mOrderItemIdList[3],
        lineable_id: mOrderIdList[3],
        lineable_type: 'order',
        amount: 30 * 100,
        currency: 'usd',
        quantity: 3,
      },
      {
        id: mOrderItemIdList[4],
        lineable_id: mOrderIdList[4],
        lineable_type: 'order',
        amount: 30 * 100,
        currency: 'usd',
        quantity: 3,
      },
      {
        id: mOrderItemIdList[5],
        lineable_id: mOrderIdList[5],
        lineable_type: 'order',
        amount: 30 * 100,
        currency: 'usd',
        quantity: 3,
      },
      {
        id: mOrderItemIdList[6],
        lineable_id: mOrderIdList[6],
        lineable_type: 'order',
        amount: 30 * 100,
        currency: 'usd',
        quantity: 3,
      },
      {
        id: mOrderItemIdList[7],
        lineable_id: mOrderIdList[7],
        lineable_type: 'order',
        amount: 30 * 100,
        currency: 'usd',
        quantity: 3,
      },
      {
        id: mOrderItemIdList[8],
        lineable_id: mOrderIdList[3],
        lineable_type: 'order',
        amount: 30 * 100,
        currency: 'usd',
        quantity: 3,
      },
    ];


    before((done) => {
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

      const createAddresses = function (next) {
        const data = _.values(mAddressListData);

        Db.create('address', data).then((addressList) => {
          mAddressList = addressList;

          next(null);
        })
        .catch((err) => {
          next(err);
        });
      }

      const createOrderItems = function (next) {
        Db.create('line_item', mOrderItemListData).then((orderItemList) => {
          mOrderItemList = orderItemList;

          next(null);
        })
        .catch((err) => {
          next(err);
        });
      }

      Async.waterfall([
        refreshDb,
        createAddresses,
        function (next) {
          const data = {
            id: mAccountIdList[0],
            organization: 'Account with Address',
            address_id: mAddressIdList[0],
          };

          Db.create('account', data).then((account) => {
            mAccount = account;

            next(null);
          })
          .catch((err) => {
            next(err);
          });
        },
        function (next) {
          const data = {
            id: mAccountIdList[1],
            organization: 'Account without a Address',
          };

          Db.create('account', data).then((account) => {
            mAccountWithoutAddress = account;

            next(null);
          })
          .catch((err) => {
            next(err);
          });
        },
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
        method: 'POST',
        url: `/order/${mOrderListData.pending.id}/approve`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 if account id of the request doesn't match the authToken account id`, function (done) {
      const options = {
        method: 'POST',
        url: `/order/${mOrderListData.pending.id}/approve`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 when approves the order without generating an invoice`, function (done) {
      const options = {
        method: 'POST',
        url: `/order/${mOrderListData.pending2.id}/approve`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('order');
        expect(id).to.be.a.string();

        expect(attributes.state).to.equal(3);
        expect(attributes.status).to.be.a.string().and.equal('Approved');
        expect(attributes.note).to.be.null();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();

        // TODO(digia): Fetch the invoice

        Server.inject({
          method: 'GET',
          url: `/invoice?filter[accountId]=${mAccount.id}&filter[orderId]=${id}`,
          headers: generateAuthHeaders(authToken),
        }, (response) => {
          const { data } = response.result;

          expect(data).to.be.length(0);

          done();
        });
      });
    });

    it(`200 when approves a rejected order`, function (done) {
      const options = {
        method: 'POST',
        url: `/order/${mOrderListData.rejected.id}/approve`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('order');
        expect(id).to.be.a.string();

        expect(attributes.state).to.equal(3);
        expect(attributes.status).to.be.a.string().and.equal('Approved');
        expect(attributes.note).to.be.null();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();

        done();
      });
    });

    it(`409 if attempting to approve an already approved order`, function (done) {
      const options = {
        method: 'POST',
        url: `/order/${mOrderListData.approved.id}/approve`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(409);

        done();
      });
    });

    it(`409 if attempting to approve an already invoiced order`, function (done) {
      const options = {
        method: 'POST',
        url: `/order/${mOrderListData.invoiced.id}/approve`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(409);

        done();
      });
    });

    it(`404 if order is soft deleted`, function (done) {
      const options = {
        method: 'POST',
        url: `/order/${mOrderListData.deleted.id}/approve`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    it(`404 if order doesn't exist`, function (done) {
      const _id = Uuid.v4();
      const options = {
        method: 'POST',
        url: `/order/${_id}/approve`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });
  });
});
