import _ from 'lodash';
import Async from 'async';
import Uuid from 'node-uuid';
import {
  db,
  server,
  refreshDb,
  uuidList,
  generateAuthHeaders,
  generateAuthToken,
  createRegistration,
  createAddress,
  createRequest,
  createOrder,
  createInvoice,
  createInvoiceItem,
} from '../helpers';


const mAddressIdList = uuidList(2);
const mAccountIdList = uuidList(2);
const mUserIdList = uuidList(2);
const mRequestIdList = uuidList(1);
const mOrderIdList = uuidList(3);
const mInvoiceIdList = uuidList(3);
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

describe('Invoice - Collection - GET /invoice', function () {
  let mAccount;
  let mAccount2;
  let mUser;
  let mUser2;
  let mOrderList;
  let mAddressList;
  let mInvoiceList;

  const mRequestListData = {
    estimate: {
      id: mRequestIdList[0],
      state: 1,
      previous_state: 0,
      subject: 'Estimate Stage',
      body: '<p>Request has been submitted and either has an estimate or is awaiting one.</p>',
      account_id: mAccountIdList[0],
      submitted_at: new Date(),
    },
  };

  const mOrderListData = {
    invoiced: {
      id: mOrderIdList[0],
      state: 5,
      request_id: mRequestIdList[0],
      account_id: mAccountIdList[0],
    },
    invoiced2: {
      id: mOrderIdList[1],
      state: 5,
      account_id: mAccountIdList[0],
    },
    partial: {
      id: mOrderIdList[2],
      state: 5,
      account_id: mAccountIdList[0],
    },
  };

  const mAddressListData = {
    normal1: {
      id: mAddressIdList[0],
      organization: 'Normal 1',
      street: 'Normal 1 Ave.',
      city: 'Lansing',
      state: 'MI',
      zipcode: '99999',
      country: 'US',
    },
    normal2: {
      id: mAddressIdList[1],
      organization: 'Normal 2',
      street: 'Normal 2 Ave.',
      city: 'Lansing',
      state: 'MI',
      zipcode: '99999',
      country: 'US',
    },
  };

  const mInvoiceListData = {
    open: {
      id: mInvoiceIdList[0],
      paid: false,
      closed: false,
      attempted: false,
      attempt_count: 0,
      note: 'This is your first invoice, congrats.',
      account_id: mAccountIdList[0],
      address_id: mAddressIdList[0],
    },
    openOnPartial: {
      id: mInvoiceIdList[1],
      paid: false,
      closed: false,
      attempted: false,
      attempt_count: 0,
      note: 'This is your first invoice, congrats.',
      account_id: mAccountIdList[0],
      address_id: mAddressIdList[1],
    },
    open2: {
      id: mInvoiceIdList[2],
      paid: false,
      closed: false,
      attempted: false,
      attempt_count: 0,
      note: null,
      account_id: mAccountIdList[0],
      address_id: mAddressIdList[0],
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

        return Promise.all(data.map(createRequest));
      })
      .then(() => {
        const data = _.values(mOrderListData);

        return Promise.all(data.map(createOrder))
          .then(orderList => mOrderList = orderList);
      })
      .then(() => {
        const data = _.values(mAddressListData);

        return Promise.all(data.map(createAddress))
          .then(addressList => mAddressList = addressList);
      })
      .then(() => {
        const data = _.values(mInvoiceListData);

        return Promise.all(data.map(createInvoice))
          .then(invoiceList => mInvoiceList = invoiceList);
      })
      .then(() => {
        // Create a invoiceItems for each invoice
        const invoiceData = _.values(mInvoiceListData);
        const pList = invoiceData.map((inv) => {
          return createInvoiceItem({ invoice_id: inv.id });
        });

        return Promise.all(pList);
      })
      .then(() => {
        // Invoice to Order Relation for Open
        const data = [
          { invoice_id: mInvoiceIdList[0], order_id: mOrderIdList[0], },
          { invoice_id: mInvoiceIdList[2], order_id: mOrderIdList[1], }
        ];

        return db.knex('invoice_order').insert(data);
      })
      .then(() => {
        // Invoice to Order Relation for Partial
        const data = {
          invoice_id: mInvoiceIdList[1],
          order_id: mOrderIdList[2],
        };

        return db.knex('invoice_order').insert(data);
      })
      .catch(err => console.warn(err));
  });

  it(`401 if client is not authorized`, function () {
    const options = {
      method: 'GET',
      url: `/invoice?filter[accountId]=${mAccount.id}`,
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`401 if account id isn't passed as a filter`, function () {
    const options = {
      method: 'GET',
      url: `/invoice`,
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
      url: `/invoice?filter[accountId]=${mAccount.id}`,
      headers: generateAuthHeaders(authTokenAccount2),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`200 if successfully returns the invoice collection`, function () {
    const options = {
      method: 'GET',
      url: `/invoice?filter[accountId]=${mAccount.id}&include=invoice-item`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data, included, meta } = response.result;

        expect(data).to.be.length(3);
        expect(included.filter(i => i.type === 'invoice-item')).to.be.length(3);
        expect(meta.count).to.equal(3);
      });
  });

  it(`200 if successfully returns the empty invoice collection`, function () {
    const options = {
      method: 'GET',
      url: `/invoice?filter[accountId]=${mAccount2.id}`,
      headers: generateAuthHeaders(authTokenAccount2),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(0);
      });
  });

  it(`200 when returning the invoice collection filtered by order id`, function () {
    const options = {
      method: 'GET',
      url: `/invoice?filter[accountId]=${mAccount.id}&filter[orderId]=${mOrderListData.invoiced.id}`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(1);
      });
  });

  it(`200 when returning the empty invoice collection filtered by non-existent order id`, function () {
    const _id = Uuid.v4();
    const options = {
      method: 'GET',
      url: `/invoice?filter[accountId]=${mAccount.id}&filter[orderId]=${_id}`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(0);
      });
  });

  it(`200 when returning the invoice collection filtered by request id`, function () {
    const options = {
      method: 'GET',
      url: `/invoice?filter[accountId]=${mAccount.id}&filter[requestId]=${mRequestListData.estimate.id}`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(1);
      });
  });

  it(`200 when returning the invoice collection filtered by order id and request id`, function () {
    const accountId = mAccount.id;
    const orderId = mOrderListData.invoiced2.id;
    const requestId = mRequestListData.estimate.id;
    const options = {
      method: 'GET',
      url: `/invoice?filter[accountId]=${accountId}&filter[orderId]=${orderId}&filter[requestId]=${requestId}`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(2);
      });
  });
});
