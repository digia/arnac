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
  createRequest,
  createAddress,
  createSku,
  createOrder,
  createInvoiceOrder,
  createInvoice,
  createInvoiceItem,
  server,
} from '../helpers';


const mAddressIdList = uuidList(2);
const mAccountIdList = uuidList(2);
const mUserIdList = uuidList(2);
const mOrderIdList = uuidList(2);
const mInvoiceIdList = uuidList(2);
const mInvoiceItemIdList = uuidList(4);
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


describe('Invoice Item - Collection - GET /invoice-item', function () {
  let mAccount;
  let mUser;
  let mOrderList;
  let mAddressList;
  let mInvoiceList;
  let mInvoiceItemList;

  const mOrderListData = {
    invoice: {
      id: mOrderIdList[0],
      state: 5,
      account_id: mAccountIdList[0],
    },
  };

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
    onDeleted: {
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
    deleted: {
      id: mInvoiceIdList[1],
      paid: false,
      closed: false,
      attempted: false,
      attempt_count: 0,
      note: 'This is your first invoice, congrats.',
      account_id: mAccountIdList[0],
      address_id: mAddressIdList[1],
      deleted_at: new Date(),
    },
  };

  const mInvoiceItemListData = {
    USD: {
      id: mInvoiceItemIdList[0],
      lineable_id: mInvoiceIdList[0],
      lineable_type: 'invoice',
      amount: 30 * 100,
      currency: 'USD',
      quantity: 3,
      sku_id: 1,
    },
    BLK: {
      id: mInvoiceItemIdList[1],
      lineable_id: mInvoiceIdList[0],
      lineable_type: 'invoice',
      amount: 1,
      currency: 'BLK',
      quantity: 1,
      sku_id: 2,
    },
    USDOnDeleted: {
      id: mInvoiceItemIdList[2],
      lineable_id: mInvoiceIdList[1],
      lineable_type: 'invoice',
      amount: 10 * 100,
      currency: 'USD',
      quantity: 1,
      sku_id: 1,
    },
    notInvoiceType: {
      id: mInvoiceItemIdList[3],
      lineable_id: mOrderIdList[1],
      lineable_type: 'order',
      amount: 10 * 100,
      currency: 'USD',
      quantity: 1,
      sku_id: 1,
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
        const data = _.values(mOrderListData);
        const pList = data.map(createOrder);

        return Promise.all(pList)
          .then(orderList => mOrderList = orderList);
      })
      .then(() => {
        const data = _.values(mAddressListData);
        const pList = data.map(createAddress);

        return Promise.all(pList)
          .then(addressList => mAddressList = addressList);
      })
      .then(() => {
        return createSku({ id: 1 })
          .then(() => createSku({ id: 2 }));
      })
      .then(() => {
        const data = _.values(mInvoiceListData);
        const pList = data.map(createInvoice);

        return Promise.all(pList)
          .then(invoiceList => mInvoiceList = invoiceList);
      })
      .then(() => {
        const data = _.values(mInvoiceItemListData);
        const pList = data.map(createInvoiceItem);

        return Promise.all(pList)
          .then(invoiceItemList => mInvoiceItemList = invoiceItemList);
      })
      .then(() => {
        return createInvoiceOrder(mInvoiceIdList[0], mOrderIdList[0]);
      })
      .error(err => console.warn(err));
  });


  it(`401 if client is not authorized`, function () {
    const options = {
      method: 'GET',
      url: `/invoice-item?filter[invoiceId]=${mInvoiceListData.open.id}`,
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`401 if account id of the request doesn't match the authToken account id`, function () {
    const options = {
      method: 'GET',
      url: `/invoice-item?filter[invoiceId]=${mInvoiceListData.open.id}`,
      headers: generateAuthHeaders(authTokenAccount2),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`200 when returning the invoice`, function () {
    const options = {
      method: 'GET',
      url: `/invoice-item?filter[invoiceId]=${mInvoiceListData.open.id}&include=invoice,sku`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data, included, meta } = response.result;

        expect(data.filter(li => li.type === 'invoice-item')).to.be.length(2);
        expect(included.filter(li => li.id === mInvoiceListData.open.id)).to.be.length(1);
        expect(included.filter(li => li.type === 'sku')).to.be.length(2);
        expect(meta.count).to.equal(2);
      });
  });

  it(`200 when returning the invoice filtered by currency`, function () {
    const options = {
      method: 'GET',
      url: `/invoice-item?filter[invoiceId]=${mInvoiceListData.open.id}&filter[currency]=USD`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(1);

        expect(data[0].attributes.currency).to.equal('USD');
      });
  });

  it(`200 when returning a empty invoice item collection when then invoice is soft deleted`, function () {
    const options = {
      method: 'GET',
      url: `/invoice-item?filter[invoiceId]=${mInvoiceListData.deleted.id}`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(0);
      });
  });

  it(`200 when returning the empty invoice item collection when then invoice doesn't exist`, function () {
    const _id = Uuid.v4();
    const options = {
      method: 'GET',
      url: `/invoice-item?filter[invoiceId]=${_id}`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(0);
      });
  });
});
