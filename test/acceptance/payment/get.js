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


describe('Payment - Get', function () {
  const mAddressIdList = uuidList(1);
  const mAccountIdList = uuidList(2);
  const mUserIdList = uuidList(2);
  const mInvoiceIdList = uuidList(1);
  const mPaymentIdList = uuidList(1);
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

  describe('GET /payment/{id}', function () {
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
        url: `/payment/${mPaymentListData.usd.id}`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 if account id of the request doesn't match the authToken account id`, function (done) {
      const options = {
        method: 'GET',
        url: `/payment/${mPaymentListData.usd.id}`,
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
        url: `/payment/${mPaymentListData.usd.id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('payment');
        expect(id).to.be.a.string();

        expect(attributes.method).to.be.a.string();
        expect(attributes.amount).to.be.a.number();
        expect(attributes.currency).to.be.a.string();
        expect(attributes.chargeId).to.be.a.string();
        expect(attributes.chargeGateway).to.be.a.string();
        expect(attributes.note).to.be.null();
        expect(attributes.createdAt).to.be.a.string();

        done();
      });
    });

    it(`404 if payment doesn't exist`, function (done) {
      const _id = Uuid.v4();
      const options = {
        method: 'GET',
        url: `/payment/${_id}`,
        headers: generateAuthHeaders(authToken),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });
  });
});
