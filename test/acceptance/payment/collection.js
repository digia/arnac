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
  server as Server,
} from '../helpers';


describe('Payment - Collection', function () {
  const mAddressIdList = uuidList(1);
  const mAccountIdList = uuidList(2);
  const mUserIdList = uuidList(2);
  const mInvoiceIdList = uuidList(2);
  const mPaymentIdList = uuidList(2);
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

  describe('GET /payment', function () {
    let mAccount;
    let mUser;
    let mAddressList;
    let mInvoiceList;
    let mPaymentList;

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
    };

    const mInvoiceListData = {
      paid: {
        id: mInvoiceIdList[0],
        paid: true,
        closed: true,
        attempted: true,
        attempt_count: 1,
        note: null,
        account_id: mAccountIdList[0],
        address_id: mAddressIdList[0],
      },
      open: {
        id: mInvoiceIdList[1],
        paid: false,
        closed: false,
        attempted: false,
        attempt_count: 0,
        note: null,
        account_id: mAccountIdList[0],
        address_id: mAddressIdList[0],
      },
    };

    const mPaymentListData = {
      usd: {
        id: mPaymentIdList[0],
        invoice_id: mInvoiceIdList[0],
        method: 'Credit Card', // TODO(digia): double check this payment method
        amount: 10 * 100,
        currency: 'usd',
        charge_id: 'ch_imfromstripe',
        charge_gateway: 'stripe',
      },
      blk: {
        id: mPaymentIdList[1],
        invoice_id: mInvoiceIdList[0],
        method: 'Block',
        amount: 10,
        currency: 'blk',
      },
    };

    before((done) => {
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

      const createPayments = function (next) {
        const data = _.values(mPaymentListData);

        Db.create('payment', data).then((paymentList) => {
          mPaymentList = paymentList;

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
        createAddresses,
        createInvoices,
        createPayments,
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
        url: `/payment?filter[accountId]=${mAccount.id}`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 if account id of the request doesn't match the authToken account id`, function (done) {
      const options = {
        method: 'GET',
        url: `/payment?filter[accountId]=${mAccount.id}`,
        headers: generateAuthHeaders(authTokenAccount2),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 when successfully returns the requested payment`, function (done) {
      const options = {
        method: 'GET',
        url: `/payment?filter[accountId]=${mAccount.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(2);

        done();
      });
    });

    it(`200 when successfully returns the requested payment filtered by currency`, function (done) {
      const options = {
        method: 'GET',
        url: `/payment?filter[accountId]=${mAccount.id}&filter[currency]=blk`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(1);
        expect(data[0].attributes.currency).to.be.equal('blk');

        done();
      });
    });

    it(`200 when successfully returns the requested payment filtered by invoice`, function (done) {
      const options = {
        method: 'GET',
        url: `/payment?filter[accountId]=${mAccount.id}&filter[invoiceId]=${mInvoiceListData.open.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(0);

        done();
      });
    });
  });
});
