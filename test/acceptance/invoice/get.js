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


describe('Invoice - Get', function () {
  const mAddressIdList = uuidList(2);
  const mAccountIdList = uuidList(2);
  const mUserIdList = uuidList(2);
  const mOrderIdList = uuidList(2);
  const mInvoiceIdList = uuidList(2);
  const mInvoiceItemIdList = uuidList(2);
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

  describe('GET /invoice/{id}', function () {
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
        organization: 'Test, LLC',
        street: 'digia Ave.',
        city: 'Lansing',
        state: 'MI',
        zipcode: '99999',
        country: 'US',
      },
      normal2: {
        id: mAddressIdList[1],
        organization: 'Soft Deleted',
        street: 'Soft Delete Ave.',
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
      softDeleted: {
        id: mInvoiceIdList[1],
        paid: false,
        closed: false,
        attempted: false,
        attempt_count: 0,
        note: null,
        account_id: mAccountIdList[0],
        address_id: mAddressIdList[1],
        deleted_at: new Date(),
      },
    };

    const mInvoiceItemListData = {
      usd: {
        id: mInvoiceItemIdList[0],
        lineable_id: mInvoiceIdList[0],
        lineable_type: 'invoice',
        amount: 30 * 100,
        currency: 'usd',
        quantity: 3,
      },
      blk: {
        id: mInvoiceItemIdList[1],
        lineable_id: mInvoiceIdList[0],
        lineable_type: 'invoice',
        amount: 1,
        currency: 'blk',
        quantity: 1,
      },
    };

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

      const createInvoices = function (next) {
        const data = _.values(mInvoiceListData);

        Db.create('invoice', data).then((invoiceList) => {
          mInvoiceList = invoiceList;

          next(null);
        })
        .catch((err) => {
          next(err);
        });
      }

      const createInvoiceToOrderRelation = function (next) {
        const data = {
          invoice_id: mInvoiceIdList[0],
          order_id: mOrderIdList[0],
        };

        Db.knex('invoice_order').insert(data).then(() => {
          next(null);
        })
        .catch((err) => {
          next(err);
        });
      }

      const createInvoiceItems = function (next) {
        const data = _.values(mInvoiceItemListData);

        Db.create('line_item', data).then((invoiceItemList) => {
          mInvoiceItemList = invoiceItemList;

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
        createAddresses,
        createInvoices,
        createInvoiceToOrderRelation,
        createInvoiceItems,
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
        url: `/invoice/${mInvoiceListData.open.id}`,
      };

      Server.inject(options, (response) => {

        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 if account id of the request doesn't match the authToken account id`, function (done) {

      const options = {
        method: 'GET',
        url: `/invoice/${mInvoiceListData.open.id}`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 if successfully returns the invoice`, function (done) {
      const options = {
        method: 'GET',
        url: `/invoice/${mInvoiceListData.open.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('invoice');
        expect(id).to.be.a.string();

        expect(attributes.amountDue).to.an.object();
        expect(attributes.amountDue.usd).to.equal(9000);
        expect(attributes.amountDue.blk).to.equal(1)

        expect(attributes.total).to.an.object();
        expect(attributes.total.usd).to.equal(9000);
        expect(attributes.total.blk).to.equal(1)

        expect(attributes.subtotal).to.an.object();
        expect(attributes.subtotal.usd).to.equal(9000);
        expect(attributes.subtotal.blk).to.equal(1)

        expect(attributes.paid).to.equal(false);
        expect(attributes.closed).to.equal(false);
        expect(attributes.attempted).to.equal(false);
        expect(attributes.attemptCount).to.equal(0);
        expect(attributes.note).to.be.a.string();

        expect(attributes.organization).to.be.a.string();
        expect(attributes.phone).to.be.null();
        expect(attributes.street).to.be.a.string();
        expect(attributes.street2).to.be.null();
        expect(attributes.city).to.be.a.string();
        expect(attributes.state).to.be.a.string();
        expect(attributes.zipcode).to.be.a.string();
        expect(attributes.country).to.be.a.string();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();

        done();
      });
    });

    it(`404 if invoice has been soft deleted`, function (done) {
      const options = {
        method: 'GET',
        url: `/invoice/${mInvoiceListData.softDeleted.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    it(`404 if invoice doesn't exist`, function (done) {
      const _id = Uuid.v4();
      const options = {
        method: 'GET',
        url: `/invoice/${_id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });
  });
});
