import _ from 'lodash';
import Async from 'async';
import Uuid from 'node-uuid';
import { Promise } from 'bluebird';
import {
  db,
  refreshDb,
  uuidList,
  generateAuthHeaders,
  generateAuthToken,
  createRegistration,
  createRequest,
  createOrder,
  createOrderItem,
  server,
} from '../helpers';


const mAccountIdList = uuidList(2);
const mUserIdList = uuidList(2);
const mOrderIdList = uuidList(2);
const mOrderItemIdList = uuidList(2);
const mRequestIdList = uuidList(1);
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

describe('Order - Get - GET /order/{id}', function () {
  let mAccount;
  let mUser;
  let mOrderList;
  let mOrderItemList;
  let mRequest;

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
      request_id: mRequestIdList[0],
    },
  };

  const mOrderItemListData = {
    usd: {
      id: mOrderItemIdList[0],
      order_id: mOrderIdList[1],
      amount: 30 * 100,
      currency: 'usd',
      quantity: 3,
    },
    blk: {
      id: mOrderItemIdList[1],
      order_id: mOrderIdList[1],
      amount: 1,
      currency: 'blk',
      quantity: 1,
    },
  };

  before(() => {
    return refreshDb()
      .then(() => {
        return createRegistration({
          account: { id: mAccountIdList[0], }, user: { id: mUserIdList[0] },
        })
          .then(({ account, user }) => {
            mAccount = account;
            mUser = user;
          });
      })
      .then(() => {
        return createRequest({ id: mRequestIdList[0], account_id: mAccountIdList[0] })
          .then(request => mRequest = request);
      })
      .then(() => {
        const data = _.values(mOrderListData);
        const pList = data.map(createOrder);

        return Promise.all(pList)
          .then(orderList => mOrderList = orderList)
      })
      .then(() => {
        const data = _.values(mOrderItemListData);
        const pList = data.map(createOrderItem);

        return Promise.all(pList)
          .then(orderItemList => mOrderItemList = orderItemList)
      })
      .catch(err => console.error(err));
  });

  it(`401 if client is not authorized`, function () {
    const options = {
      method: 'GET',
      url: `/order/${mOrderListData.pending.id}`,
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`401 if account id of the request doesn't match the authToken account id`, function () {
    const options = {
      method: 'GET',
      url: `/order/${mOrderListData.pending.id}`,
      headers: generateAuthHeaders(authTokenAccount2),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`200 if successfully returns the order`, function () {
    const options = {
      method: 'GET',
      url: `/order/${mOrderListData.pending.id}?include=account,order-item,request`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data, included } = response.result;
        const { type, id, attributes, relationships } = data;

        expect(type).to.be.a.string().and.equal('order');
        expect(id).to.be.a.string();

        expect(attributes.state).to.equal(1);
        expect(attributes.status).to.be.a.string().and.equal('Pending');
        expect(attributes.total).to.be.an.object()
        expect(attributes.total.usd).to.equal(9000);
        expect(attributes.total.blk).to.equal(1);
        expect(attributes.note).to.be.null();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();

        expect(included).to.be.length(4);
        expect(_.some(included, i => i.type === 'account'));
        expect(_.filter(included, i => i.type === 'order-item')).to.be.length(2);
        expect(_.some(included, i => i.type === 'request'));
      });
  });

  it(`409 if requesting an order that is a draft`, function () {
    const options = {
      method: 'GET',
      url: `/order/${mOrderListData.draft.id}`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(409);
      });
  });

  it(`404 if order doesn't exist`, function () {
    const _id = Uuid.v4();
    const options = {
      method: 'GET',
      url: `/order/${_id}`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(404);
      });
  });
});
