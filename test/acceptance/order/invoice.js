import _ from 'lodash';
import Async from 'async';
import Uuid from 'node-uuid';
import {
  db as Db,
  refreshDb,
  uuidList,
  generateAuthHeaders,
  generateAuthToken,
  createRegistration,
  createAddress,
  createOrder,
  createOrderItem,
  server,
} from '../helpers';

/**
 * Orders which have been approved can generate invoices. This will be done
 * by hitting the /order/<id>/invoice endpoint. The endpoint will update the
 * state of the order to invoiced - does not support partially invoices at this
 * time - and it'll generate an invoice from the order. Response will be the
 * updated order and the created invoice can be included using the JSONAPI
 * include method.
 *
 * - Orders not in the approved state cannot generate invoices: 409 conflict
 * - Orders without any orderItems cannot generate invoices: 409 conflict
 * - Accounts without addresses cannot generate invoices: 409 conflict
 */

const mAddressIdList = uuidList(1);
const mAccountIdList = uuidList(3);
const mUserIdList = uuidList(3);
const mOrderIdList = uuidList(10);
const mOrderItemIdList = uuidList(9);
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

describe('Order - Invoice - POST /order/{id}/invoice', function () {
  let mAccount;
  let mUser;
  let mAccountNonAddress;
  let mUserNonAddress;
  let mAddress;
  let mOrderList;
  let mAddressList;
  let mOrderItemList;

  const mOrderListData = {
    pending: {
      id: mOrderIdList[0],
      state: 1,
      account_id: mAccountIdList[0],
    },
    rejected: {
      id: mOrderIdList[2],
      state: 2,
      account_id: mAccountIdList[0],
    },
    approved: {
      id: mOrderIdList[1],
      state: 3,
      account_id: mAccountIdList[0],
    },
    approvedNonAddress: {
      id: mOrderIdList[3],
      state: 3,
      account_id: mAccountIdList[1],
    },
  };

  const mOrderItemListData = [
    {
      id: mOrderItemIdList[0],
      lineable_id: mOrderIdList[0],
      lineable_type: 'order',
      amount: 1,
      currency: 'BLK',
      quantity: 3,
    },
    {
      id: mOrderItemIdList[1],
      lineable_id: mOrderIdList[1],
      lineable_type: 'order',
      amount: 30 * 100,
      currency: 'USD',
      quantity: 3,
    },
    {
      id: mOrderItemIdList[2],
      lineable_id: mOrderIdList[3],
      lineable_type: 'order',
      amount: 1,
      currency: 'BLK',
      quantity: 12,
    },
  ];


  before(() => {
    return refreshDb()
      .then(() => {
        return createAddress({ id: mAddressIdList[0], organization: 'Non Null Org.' })
          .then(address => mAddress = address);
      })
      .then(() => {
        return Promise.all([
          createRegistration({
            account: { id: mAccountIdList[0], address_id: mAddressIdList[0] },
            user: { id: mUserIdList[0] },
          })
            .then(({ account, user }) => {
              mAccount = account;
              mUser = user;
            }),
          createRegistration({
            account: { id: mAccountIdList[1], },
            user: { id: mUserIdList[1], },
          })
            .then(({ account, user }) => {
              mAccountNonAddress = account;
              mUserNonAddress = user;
            }),
        ]);
      })
      .then(() => {
        const data = _.values(mOrderListData);
        const pList = data.map(createOrder);

        return Promise.all(pList)
          .then(orderList => mOrderList = orderList);
      })
      .then(() => {
        const data = _.values(mOrderItemListData);
        const pList = data.map(createOrderItem);

        return Promise.all(pList)
          .then(orderItemList => mOrderItemList = orderItemList);
      })
      .catch(err => console.error(err));
  });

  it(`401 if client is not authorized`, function () {
    const options = {
      method: 'POST',
      url: `/order/${mOrderListData.approved.id}/invoice`,
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`401 if account id of the request doesn't match the authToken account id`, function () {
    const options = {
      method: 'POST',
      url: `/order/${mOrderListData.approved.id}/invoice`,
      headers: generateAuthHeaders(authTokenAccount2),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`200 order generates an invoice`, function () {
    const options = {
      method: 'POST',
      url: `/order/${mOrderListData.approved.id}/invoice?include=invoice`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data, included, meta } = response.result;

        expect(included).to.be.length(1);

        const invoice = included.filter(i => i.type === 'invoice')[0];

        expect(invoice.id).to.be.string();
        expect(invoice.attributes.amountDue.BLK).to.equal(3);
        expect(invoice.attributes.total.BLK).to.equal(3);
        expect(invoice.attributes.subtotal.BLK).to.equal(3);
        expect(invoice.attributes.paid).to.equal(false);
        expect(invoice.attributes.closed).to.equal(false);
        expect(invoice.attributes.attempted).to.equal(false);
        expect(invoice.attributes.attemptCount).to.equal(0);
        expect(invoice.attributes.note).to.be.null();
        expect(invoice.attributes.organization).to.be.a.string();
        expect(invoice.attributes.phone).to.be.null();
        expect(invoice.attributes.street).to.be.a.string();
        expect(invoice.attributes.street2).to.be.null();
        expect(invoice.attributes.city).to.be.a.string();
        expect(invoice.attributes.state).to.be.a.string();
        expect(invoice.attributes.zipcode).to.be.a.string();
        expect(invoice.attributes.country).to.be.a.string();
        expect(invoice.attributes.createdAt).to.be.a.string();
        expect(invoice.attributes.updatedAt).to.be.a.string();
        expect(invoice.attributes.deletedAt).to.be.null();

        const { type, id, attributes, relationships } = data;

        expect(type).to.be.a.string().and.equal('order');
        expect(id).to.be.a.string();

        expect(attributes.state).to.equal(5);
        expect(attributes.status).to.be.a.string().and.equal('Invoiced');
        expect(attributes.note).to.be.null();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();

        expect(relationships.invoice).to.exist();
      });
  });

  it(`409 when account doesn't have an address`, function () {
    const options = {
      method: 'POST',
      url: `/order/${mOrderListData.approvedNonAddress.id}/invoice`,
      headers: generateAuthHeaders(authTokenAccount2),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(409);
      });
  });


  it(`409 when order is not in the approved state`, function () {
    const options = {
      method: 'POST',
      url: `/order/${mOrderListData.rejected.id}/invoice`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(409);
      });
  });

  // NOTE(digia): This must be after the 200 success
  it(`409 if attempting to invoice an already invoiced order`, function () {
    const options = {
      method: 'POST',
      url: `/order/${mOrderListData.approved.id}/invoice`,
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
      method: 'POST',
      url: `/order/${_id}/invoice`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(404);
      });
  });
});
