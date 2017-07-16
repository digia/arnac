import _ from 'lodash';
import Async from 'async';
import Uuid from 'node-uuid';
import { Promise } from 'bluebird';
import {
  db,
  refreshDb,
  uuidList,
  server,
  generateAuthHeaders,
  generateTokens,
  generateAuthToken,
  createRegistration,
  createRequest,
  createOrderItem,
  authority as Authority,
} from '../helpers';


// CURRENTLY:
// - Including request will crash with a jaysonapi error

const mAccountIdList = uuidList(2);
const mUserIdList = uuidList(2);
const mRequestIdList = uuidList(2);
const mOrderIdList = uuidList(3);
const mOrderItemIdList = uuidList(1);
let authToken;
let authTokenAccount2;

before(() => {
  return Promise.all([
    generateAuthToken({ accountId: mAccountIdList[0], userId: mUserIdList[0] })
      .then((token) => authToken = token),
    generateAuthToken({ accountId: mAccountIdList[1], userId: mUserIdList[1] })
      .then((token) => authTokenAccount2 = token),
  ]);
});

describe('Order - Collection - GET /order', function () {
  let mAccount;
  let mAccount2;
  let mUser;
  let mUser2;
  let mRequestList;
  let mOrderList;

  const mRequestListData = {
    order: {
      id: mRequestIdList[0],
      state: 1,
      previous_state: 0,
      subject: 'Order Stage',
      body: '<p>Request has been submitted and either has an order or is awaiting one.</p>',
      account_id: mAccountIdList[0],
      submitted_at: new Date(),
    },
    orderWithoutOrder: {
      id: mRequestIdList[1],
      state: 1,
      previous_state: 0,
      subject: 'Order Stage without an order',
      body: '<p></p>',
      account_id: mAccountIdList[0],
      submitted_at: new Date(),
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
    pendingWithRequest: {
      id: mOrderIdList[2],
      state: 1,
      account_id: mAccountIdList[0],
      request_id: mRequestIdList[0],
    },
  };

  before(() => {
    return refreshDb()
      .then(() => {
        return Promise.all([
          createRegistration({
            account: { id: mAccountIdList[0], }, user: { id: mUserIdList[0] },
          })
            .then(({ account, user }) => {
              mAccount = account;
              mUser = user;
            }),
          createRegistration({
            account: { id: mAccountIdList[1], }, user: { id: mUserIdList[1] },
          })
            .then(({ account, user }) => {
              mAccount2 = account;
              mUser2 = user;
            }),
        ]);
      })
      .then(() => {
        const data = _.values(mRequestListData);

        return db.create('request', data).then(requestList => mRequestList = requestList);
      })
      .then(() => {
        const data = _.values(mOrderListData);

        return db.create('order', data).then(orderList => mOrderList = orderList);
      })
      .then(() => {
        return Promise.all([
          createOrderItem({ order_id: mOrderListData.pending.id }),
          createOrderItem({ order_id: mOrderListData.pendingWithRequest.id })
        ]);
      })
      .catch((err) => {
        console.error(err);
      });
  });

  it(`401 if client is not authorized`, function () {
    const options = {
      method: 'GET',
      url: `/order?filter[accountId]=${mAccount.id}`,
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`401 if account id isn't passed as a filter`, function () {
    const options = {
      method: 'GET',
      url: `/order`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`401 if account id of the request doesn't match the authToken account id`, function () {
    const options = {
      method: 'GET',
      url: `/order?filter[accountId]=${mAccount.id}`,
      headers: generateAuthHeaders(authTokenAccount2),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`200 if successfully returns the order collection`, function () {
    const options = {
      method: 'GET',
      url: `/order?filter[accountId]=${mAccount.id}&include=order-item,request`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data, included } = response.result;

        expect(data).to.be.length(2);
        expect(included).to.be.length(3);

        const orderWithoutRequest = data.filter((o) => {
          return o.id === mOrderListData.pending.id;
        })[0];
        expect(orderWithoutRequest.relationships).to.be.length(1);

        const orderWithRequest = data.filter((o) => {
          return o.id === mOrderListData.pendingWithRequest.id;
        })[0];
        expect(orderWithRequest.relationships).to.be.length(2);
      });
  });

  it(`200 if successfully returns the order collection filtered by request id`, function () {
    const options = {
      method: 'GET',
      url: `/order?filter[accountId]=${mAccount.id}&filter[requestId]=${mRequestListData.orderWithoutOrder.id}`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(0);
      });
  });

  it(`200 if successfully returns the empty order collection`, function () {
    const options = {
      method: 'GET',
      url: `/order?filter[accountId]=${mAccount2.id}`,
      headers: generateAuthHeaders(authTokenAccount2),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(0);
      });
  });
});
