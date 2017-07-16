import _ from 'lodash';
import Async from 'async';
import { Promise } from 'bluebird';
import Uuid from 'node-uuid';
import Moment from 'moment';
import Stripe from '../../../src/payment/stripe';
import {
  db as Db,
  refreshDb,
  seedDb,
  uuidList,
  config,
  generateAuthHeaders,
  generateAuthToken,
  createRegistration,
  structurePayload,
  structureRelationshipPayload,
  createAccountUserDuo,
  createRequest,
  authority as Authority,
  server as Server,
} from '../helpers';


/**
 * NOTE(digia): We use Knex to see the the initial state of the database for
 * this test. This gives us an account, user, products, and skus.
 *
 * However this also causes an issue with the account id variable - mAccount.
 * In order to work with this, a hack was done for the sake of time.
 *
 * addAccountId will add an accountId to an array of object, if an account_id
 * property doesn't exist on the object.
 */


function addAccountId(accountId, data) {
  return data.map((d) => {
    if (d.account_id) {
      return d;
    }

    return _.merge(d, { account_id: accountId })
  });
}

describe('Invoice - Pay', function () {
  const mAddressIdList = uuidList(2);
  const mAccountIdList = uuidList(2);
  const mUserIdList = uuidList(2);
  const mBlockIdList = uuidList(7);
  const mOrderIdList = uuidList(2);
  const mInvoiceIdList = uuidList(6);
  const mPaymentIdList = uuidList(1);
  const mInvoiceItemIdList = uuidList(5);
  let authToken;
  let authTokenAccount2;

  before((done) => {
    Async.waterfall([
      function (next) {
        Promise.all([
          generateAuthToken({ accountId: mAccountIdList[0], userId: mUserIdList[0] })
            .then(token => authToken = token),
          generateAuthToken({ accountId: mAccountIdList[1], userId: mUserIdList[1] })
            .then(token => authTokenAccount2 = token),
        ])
          .then(() => next(null))
          .catch(err => next(err));
      },
    ], (err) => {
      if (err) {
        console.log(err);
      }

      done();
    });
  });

  describe('POST /invoice/{id}/pay', function () {
    const generatorId = Uuid.v4();
    let mAccount;
    let mUser;
    let mAccount2;
    let mUser2;
    let mBlockList;
    let mOrderList;
    let mAddressList;
    let mInvoiceList;
    let mInvoiceItemList;
    const expiredBlockCreationDate = Moment().subtract(config.get('blocks.daysAlive') + 1, 'days').format();

    const mBlockListData = {
      available: {
        id: mBlockIdList[0],
        generator_id: generatorId,
        generator_type: 'test',
        account_id: mAccountIdList[0],
      },
      available2: {
        id: mBlockIdList[1],
        generator_id: generatorId,
        generator_type: 'test',
        account_id: mAccountIdList[0],
      },
      account2: {
        id: mBlockIdList[2],
        generator_id: generatorId,
        generator_type: 'test',
        account_id: mAccountIdList[1],
      },
      expired: {
        id: mBlockIdList[3],
        generator_id: generatorId,
        generator_type: 'test',
        account_id: mAccountIdList[0],
      },
      softDeleted: {
        id: mBlockIdList[4],
        generator_id: generatorId,
        generator_type: 'test',
        deleted_at: new Date(),
        account_id: mAccountIdList[0],
      },
      exhausted: {
        id: mBlockIdList[5],
        generator_id: generatorId,
        generator_type: 'test',
        exhausted_at: new Date(),
        account_id: mAccountIdList[0],
      },
      usedAsPayment: {
        id: mBlockIdList[6],
        payment_id: mPaymentIdList[0],
        generator_id: generatorId,
        generator_type: 'test',
        account_id: mAccountIdList[0],
      },
    };

    let mOrderListData = {
      invoiced: {
        id: mOrderIdList[0],
        state: 5,
      },
      invoiced2: {
        id: mOrderIdList[1],
        state: 5,
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
    };

    const mInvoiceListData = {
      openUSD: {
        id: mInvoiceIdList[0],
        paid: false,
        closed: false,
        attempted: false,
        attempt_count: 0,
        note: 'openUSD',
        address_id: mAddressIdList[0],
      },
      openBLK: {
        id: mInvoiceIdList[1],
        paid: false,
        closed: false,
        attempted: false,
        attempt_count: 0,
        note: 'openBLK',
        address_id: mAddressIdList[0],
      },
      openMultiple: {
        id: mInvoiceIdList[2],
        paid: false,
        closed: false,
        attempted: false,
        attempt_count: 0,
        note: 'openMultiple',
        address_id: mAddressIdList[0],
      },
      softDeleted: {
        id: mInvoiceIdList[3],
        paid: false,
        closed: false,
        attempted: false,
        attempt_count: 0,
        note: null,
        address_id: mAddressIdList[0],
        deleted_at: new Date(),
      },
      noLineItems: {
        id: mInvoiceIdList[4],
        paid: false,
        closed: false,
        attempted: false,
        attempt_count: 0,
        note: null,
        address_id: mAddressIdList[0],
      },
      paid: {
        id: mInvoiceIdList[5],
        paid: true,
        closed: true,
        attempted: true,
        attempt_count: 1,
        note: null,
        address_id: mAddressIdList[0],
      },
    };

    const mInvoiceItemListData = {
      usd: {
        id: mInvoiceItemIdList[0],
        lineable_id: mInvoiceIdList[0],
        lineable_type: 'invoice',
        amount: 25 * 100,
        currency: 'usd',
        quantity: 1,
        sku_id: 1,
      },
      blk: {
        id: mInvoiceItemIdList[1],
        lineable_id: mInvoiceIdList[1],
        lineable_type: 'invoice',
        amount: 1,
        currency: 'blk',
        quantity: 2,
      },
      multipleUSD: {
        id: mInvoiceItemIdList[2],
        lineable_id: mInvoiceIdList[2],
        lineable_type: 'invoice',
        amount: 30 * 100,
        currency: 'usd',
        quantity: 3,
      },
      multipleBLK: {
        id: mInvoiceItemIdList[3],
        lineable_id: mInvoiceIdList[2],
        lineable_type: 'invoice',
        amount: 1,
        currency: 'blk',
        quantity: 2,
      },
      onPaid: {
        id: mInvoiceItemIdList[4],
        lineable_id: mInvoiceIdList[5],
        lineable_type: 'invoice',
        amount: 30 * 100,
        currency: 'usd',
        quantity: 1,
      },
    };

    const mPaymentListData = {
      normal: {
        id: mPaymentIdList[0],
        method: 'block',
        amount: 1,
        currency: 'blk',
        invoice_id: mInvoiceListData.paid.id,
      },
    };

    before((done) => {
      const createBlocks = function (next) {
        const data = _.values(mBlockListData);

        Db.create('block', data).then((blockList) => {
          mBlockList = blockList;

          next(null);
        })
        .catch((err) => {
          next(err);
        });
      }

      const createOrders = function (next) {
        const data = addAccountId(mAccount.id, _.values(mOrderListData));

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
        const data = addAccountId(mAccount.id, _.values(mInvoiceListData));

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

      const createPayments = function (next) {
        const data = _.values(mPaymentListData);

        Db.create('payment', data).then(() => {
          next(null);
        })
        .catch((err) => {
          next(err);
        });
      }

      const updateExpiredBlock = function (next) {
        const id = mBlockListData.expired.id;
        const data = {
          created_at: expiredBlockCreationDate,
        };

        Db.knex('block').where({ id }).update(data)
        .then(() => {
          next(null);
        })
        .catch((err) => {
          next(err);
        });
      }

      Async.waterfall([
        refreshDb,
        seedDb,
        (next) => {
          Promise.all([
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
          ])
          .then(() => next(null))
          .catch((err) => next(err));
        },
        createOrders,
        createAddresses,
        createInvoices,
        createInvoiceToOrderRelation,
        createInvoiceItems,
        createPayments,
        createBlocks,
        updateExpiredBlock,
      ], function (err, result) {

        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 if client is not authorized`, function (done) {
      const payload = {
        method: 'charge',
        amount: 2500,
        currency: 'usd',
        chargeId: 'tk_stripetoken',
        chargeGateway: 'stripe',
      };
      const options = {
        method: 'POST',
        url: `/invoice/${mInvoiceListData.openUSD.id}/pay`,
        payload: structurePayload('payment', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 if account id of the request doesn't match the authToken account id`, function (done) {
      const payload = {
        method: 'charge',
        amount: 2500,
        currency: 'usd',
        chargeId: 'tk_stripetoken',
        chargeGateway: 'stripe',
      };
      const options = {
        method: 'POST',
        url: `/invoice/${mInvoiceListData.openUSD.id}/pay`,
        headers: generateAuthHeaders(authTokenAccount2),
        payload: structurePayload('payment', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`400 if amount doesn't match blocks passed in`, function (done) {
      const payload = {
        method: 'block',
        amount: 2,
        currency: 'blk',
      };
      const relationship = structureRelationshipPayload('block', mBlockListData.available.id);
      const options = {
        method: 'POST',
        url: `/invoice/${mInvoiceListData.openBLK.id}/pay`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('payment', payload, relationship),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it(`422 if block doesn't belong to the invoice's account`, function (done) {
      const payload = {
        method: 'block',
        amount: 2,
        currency: 'blk',
      };

      const blockList = [
        mBlockListData.available.id,
        mBlockListData.account2.id
      ];

      const relationship = structureRelationshipPayload('block', blockList);
      const options = {
        method: 'POST',
        url: `/invoice/${mInvoiceListData.openBLK.id}/pay`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('payment', payload, relationship),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(422);

        done();
      });
    });

    it(`422 if block is expired`, function (done) {
      const payload = {
        method: 'block',
        amount: 2,
        currency: 'blk',
      };
      const blockList = [
        mBlockListData.available.id,
        mBlockListData.expired.id
      ];
      const relationship = structureRelationshipPayload('block', blockList);
      const options = {
        method: 'POST',
        url: `/invoice/${mInvoiceListData.openBLK.id}/pay`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('payment', payload, relationship),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(422);

        done();
      });
    });

    it(`422 if block is exhausted`, function (done) {
      const payload = {
        method: 'block',
        amount: 2,
        currency: 'blk',
      };
      const blockList = [
        mBlockListData.available.id,
        mBlockListData.exhausted.id
      ];
      const relationship = structureRelationshipPayload('block', blockList);
      const options = {
        method: 'POST',
        url: `/invoice/${mInvoiceListData.openBLK.id}/pay`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('payment', payload, relationship),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(422);

        done();
      });
    });

    it(`422 if block is spent`, function (done) {
      const payload = {
        method: 'block',
        amount: 2,
        currency: 'blk',
      };
      const blockList = [
        mBlockListData.available.id,
        mBlockListData.usedAsPayment.id
      ];
      const relationship = structureRelationshipPayload('block', blockList);
      const options = {
        method: 'POST',
        url: `/invoice/${mInvoiceListData.openBLK.id}/pay`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('payment', payload, relationship),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(422);

        done();
      });
    });

    // The issue is that knex doesn't camelcase the returned values
    // Can we get the collection to camelcase on forge?
    it(`200 when successfully pays the invoice by blocks`, function (done) {
      const payload = {
        method: 'block',
        amount: 2,
        currency: 'blk',
      };
      const blockList = [
        mBlockListData.available.id,
        mBlockListData.available2.id
      ];
      const relationship = structureRelationshipPayload('block', blockList);
      const options = {
        method: 'POST',
        url: `/invoice/${mInvoiceListData.openBLK.id}/pay?include=payment,invoiceItem,account`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('payment', payload, relationship),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { data, included } = response.result;

        expect(included).to.be.length(3);

        const payment = included.filter(p => p.type === 'payment')[0];
        const invoiceItem = included.filter(p => p.type === 'invoice-item')[0];
        const account = included.filter(p => p.type === 'account')[0];

        expect(payment.type).to.equal('payment');
        expect(payment.id).to.be.a.string();
        expect(payment.attributes).to.be.an.object();
        expect(payment.attributes.method).to.equal('block');
        expect(payment.attributes.amount).to.equal(2);
        expect(payment.attributes.currency).to.equal('blk');
        expect(payment.attributes.chargeId).to.be.null();
        expect(payment.attributes.chargeGateway).to.be.null();
        expect(payment.attributes.note).to.be.null();

        expect(invoiceItem.type).to.equal('invoice-item');
        expect(invoiceItem.id).to.be.a.string();

        expect(account.type).to.equal('account');
        expect(account.id).to.be.a.string();

        const { type, id, attributes, relationships } = data;

        expect(type).to.be.a.string().and.equal('invoice');
        expect(id).to.be.a.string();

        expect(attributes.amountDue).to.an.object();
        expect(attributes.amountDue.usd).to.not.exist();
        expect(attributes.amountDue.blk).to.equal(0);

        expect(attributes.total).to.an.object();
        expect(attributes.total.usd).to.not.exist();
        expect(attributes.total.blk).to.equal(2)

        expect(attributes.subtotal).to.an.object();
        expect(attributes.subtotal.usd).to.not.exist();
        expect(attributes.subtotal.blk).to.equal(2)

        expect(attributes.paid).to.equal(true);
        expect(attributes.closed).to.equal(true);
        expect(attributes.attempted).to.equal(true);
        expect(attributes.attemptCount).to.equal(1);
        expect(attributes.note).to.be.equal('openBLK');
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

        expect(relationships.payment).to.be.an.object();
        expect(relationships.payment.data).to.be.an.array();
        expect(relationships.payment.data[0].type).to.equal('payment');
        expect(relationships.payment.data[0].id).to.be.a.string();

        expect(relationships.invoiceItem).to.be.an.object();
        expect(relationships.invoiceItem.data).to.be.an.array();
        expect(relationships.invoiceItem.data[0].type).to.equal('invoice-item');
        expect(relationships.invoiceItem.data[0].id).to.be.a.string();

        expect(relationships.account).to.be.an.object();
        expect(relationships.account.data).to.be.an.object();
        expect(relationships.account.data.type).to.equal('account');
        expect(relationships.account.data.id).to.be.a.string();

        done();
      });
    });

    // NOTE(digia): The order of the following charge tests does matter.
    it(`422 when card is declined`, function (done) {
      this.timeout(5000);

      const tokenAttrs = {
        card: {
          number: 4000000000000002,
          exp_month: 12,
          exp_year: 2017,
          cvc: 123
        },
      };

      Stripe.tokens.create(tokenAttrs)
      .then((token) => {
        const payload = {
          method: 'charge',
          amount: 2500,
          currency: 'usd',
          chargeId: token.id,
          chargeGateway: 'stripe',
        };
        const options = {
          method: 'POST',
          url: `/invoice/${mInvoiceListData.openUSD.id}/pay`,
          headers: generateAuthHeaders(authToken),
          payload: structurePayload('payment', payload),
        };

        Server.inject(options, (response) => {
          expect(response.statusCode).to.equal(422);

          done();
        });
      })
      .catch((err) => {
        console.log('Stripe Token error: ', err);
      })
    });

    it(`422 when card is declined for fraudulent reasons`, function (done) {
      this.timeout(5000);

      const tokenAttrs = {
        card: {
          number: 4100000000000019,
          exp_month: 12,
          exp_year: 2017,
          cvc: 123
        },
      };

      Stripe.tokens.create(tokenAttrs)
      .then((token) => {
        const payload = {
          method: 'charge',
          amount: 2500,
          currency: 'usd',
          chargeId: token.id,
          chargeGateway: 'stripe',
        };
        const options = {
          method: 'POST',
          url: `/invoice/${mInvoiceListData.openUSD.id}/pay`,
          headers: generateAuthHeaders(authToken),
          payload: structurePayload('payment', payload),
        };

        Server.inject(options, (response) => {
          expect(response.statusCode).to.equal(422);

          done();
        });
      })
      .catch((err) => {
        console.log('Stripe Token error: ', err);
      })
    });

    it(`422 when card is declined for incorrect cvc code`, function (done) {
      this.timeout(5000);

      const tokenAttrs = {
        card: {
          number: 4000000000000127,
          exp_month: 12,
          exp_year: 2017,
          cvc: 123
        },
      };

      Stripe.tokens.create(tokenAttrs)
      .then((token) => {
        const payload = {
          method: 'charge',
          amount: 2500,
          currency: 'usd',
          chargeId: token.id,
          chargeGateway: 'stripe',
        };
        const options = {
          method: 'POST',
          url: `/invoice/${mInvoiceListData.openUSD.id}/pay`,
          headers: generateAuthHeaders(authToken),
          payload: structurePayload('payment', payload),
        };

        Server.inject(options, (response) => {
          expect(response.statusCode).to.equal(422);

          done();
        });
      })
      .catch((err) => {
        console.log('Stripe Token error: ', err);
      })
    });

    it(`422 when card is declined for expiration issue`, function (done) {
      this.timeout(5000);

      const tokenAttrs = {
        card: {
          number: 4000000000000069,
          exp_month: 12,
          exp_year: 2017,
          cvc: 123
        },
      };

      Stripe.tokens.create(tokenAttrs)
      .then((token) => {
        const payload = {
          method: 'charge',
          amount: 2500,
          currency: 'usd',
          chargeId: token.id,
          chargeGateway: 'stripe',
        };
        const options = {
          method: 'POST',
          url: `/invoice/${mInvoiceListData.openUSD.id}/pay`,
          headers: generateAuthHeaders(authToken),
          payload: structurePayload('payment', payload),
        };

        Server.inject(options, (response) => {
          expect(response.statusCode).to.equal(422);

          done();
        });
      })
      .catch((err) => {
        console.log('Stripe Token error: ', err);
      })
    });

    it(`422 when card is declined for processing error`, function (done) {
      this.timeout(5000);

      const tokenAttrs = {
        card: {
          number: 4000000000000119,
          exp_month: 12,
          exp_year: 2017,
          cvc: 123
        },
      };

      Stripe.tokens.create(tokenAttrs)
      .then((token) => {
        const payload = {
          method: 'charge',
          amount: 2500,
          currency: 'usd',
          chargeId: token.id,
          chargeGateway: 'stripe',
        };
        const options = {
          method: 'POST',
          url: `/invoice/${mInvoiceListData.openUSD.id}/pay`,
          headers: generateAuthHeaders(authToken),
          payload: structurePayload('payment', payload),
        };

        Server.inject(options, (response) => {
          expect(response.statusCode).to.equal(422);

          done();
        });
      })
      .catch((err) => {
        console.log('Stripe Token error: ', err);
      })
    });

    it(`200 when successfully pays the invoice by charge`, function (done) {
      this.timeout(3000);

      const tokenAttrs = {
        card: {
          number: 4242424242424242,
          exp_month: 12,
          exp_year: 2017,
          cvc: 123
        },
      };

      Stripe.tokens.create(tokenAttrs)
      .then((token) => {
        const payload = {
          method: 'charge',
          amount: 2500,
          currency: 'usd',
          chargeId: token.id,
          chargeGateway: 'stripe',
        };
        const options = {
          method: 'POST',
          url: `/invoice/${mInvoiceListData.openUSD.id}/pay?include=payment,invoiceItem,account`,
          headers: generateAuthHeaders(authToken),
          payload: structurePayload('payment', payload),
        };

        Server.inject(options, (response) => {
          expect(response.statusCode).to.equal(200);

          const { data, included } = response.result;

          expect(included).to.be.length(3);

          const payment = included.filter(p => p.type === 'payment')[0];
          const invoiceItem = included.filter(p => p.type === 'invoice-item')[0];
          const account = included.filter(p => p.type === 'account')[0];

          expect(payment.type).to.equal('payment');
          expect(payment.id).to.be.a.string();
          expect(payment.attributes).to.be.an.object();
          expect(payment.attributes.method).to.equal('charge');
          expect(payment.attributes.amount).to.equal(2500);
          expect(payment.attributes.currency).to.equal('usd');
          expect(payment.attributes.chargeId).to.be.a.string();
          expect(payment.attributes.chargeGateway).to.equal('stripe');
          expect(payment.attributes.note).to.be.null();

          expect(invoiceItem.type).to.equal('invoice-item');
          expect(invoiceItem.id).to.be.a.string();

          expect(account.type).to.equal('account');
          expect(account.id).to.be.a.string();

          const { type, id, attributes, relationships } = data;

          expect(type).to.be.a.string().and.equal('invoice');
          expect(id).to.be.a.string();

          expect(attributes.amountDue).to.an.object();
          expect(attributes.amountDue.blk).to.not.exist();
          expect(attributes.amountDue.usd).to.equal(0);

          expect(attributes.total).to.an.object();
          expect(attributes.total.blk).to.not.exist();
          expect(attributes.total.usd).to.equal(2500)

          expect(attributes.subtotal).to.an.object();
          expect(attributes.subtotal.blk).to.not.exist();
          expect(attributes.subtotal.usd).to.equal(2500)

          expect(attributes.paid).to.equal(true);
          expect(attributes.closed).to.equal(true);
          expect(attributes.attempted).to.equal(true);
          expect(attributes.attemptCount).to.equal(1);
          expect(attributes.note).to.be.equal('openUSD');
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

          expect(relationships.payment).to.be.an.object();
          expect(relationships.payment.data).to.be.an.array();
          expect(relationships.payment.data[0].type).to.equal('payment');
          expect(relationships.payment.data[0].id).to.be.a.string();

          expect(relationships.account).to.be.an.object();
          expect(relationships.account.data).to.be.an.object();
          expect(relationships.account.data.type).to.equal('account');
          expect(relationships.account.data.id).to.be.a.string();

          // Check that a block was generated, because the line item was for an
          // additional block.

          Db.knex('block')
          .where('generator_id', id)
          .then((blockList) => {
            expect(blockList).to.be.length(1);

            const block = blockList.pop();

            expect(block.generator_id).to.equal(id);
            expect(block.generator_type).to.equal('invoice');

            done();
          });
        });
      })
      .catch((err) => {
        console.log('Stripe Token error: ', err);
      })
    });

    it(`409 when attempting to pay an already paid invoice`, function (done) {
      this.timeout(3000);

      const tokenAttrs = {
        card: {
          number: 4242424242424242,
          exp_month: 12,
          exp_year: 2017,
          cvc: 123
        },
      };

      Stripe.tokens.create(tokenAttrs)
      .then((token) => {
        const payload = {
          method: 'charge',
          amount: 2500,
          currency: 'usd',
          chargeId: token.id,
          chargeGateway: 'stripe',
        };
        const options = {
          method: 'POST',
          url: `/invoice/${mInvoiceListData.paid.id}/pay`,
          headers: generateAuthHeaders(authToken),
          payload: structurePayload('payment', payload),
        };

        Server.inject(options, (response) => {
          expect(response.statusCode).to.equal(409);

          done();
        });
      })
      .catch((err) => {
        console.log('Stripe Token error: ', err);
      })
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
