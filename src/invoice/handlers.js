import {
  isEmpty as IsEmpty,
  isArray as IsArray,
  merge as Merge,
  chain as Chain,
} from 'lodash';
import Async from 'async';
import Joi from 'joi';
import Db from '../database';
import {
  NotFoundError,
  PayloadError,
  AuthenticationError,
  InputError,
} from '../foundation/errors';
import {
  PaymentBlockError,
  PaymentMethodError,
  ChargeCardDeclinedError,
  ChargeCardFraudulentError,
  ChargeCardCVCError,
  ChargeCardExpirationError,
  ChargeCardProcessingError,
} from '../payment/errors';
import {
  InvoiceClosedError,
  InvoiceItemRelationshipError,
  InvoicePaymentCurrencyError,
} from '../invoice/errors';
import { LineItem } from '../product/models';
import Cashier from '../payment/cashier';
import { Block } from '../block/models';
import { BlockCollection } from '../block/collections';
import BlockGenerator from '../block/block-generator';
import { Invoice } from './models';
import * as Serializers from './serializers';


export const GetInvoice = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const opts = {
      require: true,
      withRelated: ['account', 'address', 'invoiceItems'],
    };
    const invoice = Invoice.forge({ id });

    invoice.fetch(opts)
    .then(() => {
      const account = invoice.related('account');
      const address = invoice.related('address');

      if (credentials.accountId !== account.get('id')) {
        throw new AuthenticationError();
      }

      const invoiceJSON = invoice.toJSON();
      const addressJSON = address.toJSON({ exclude: ['id'] });

      res.serializer(Serializers.Invoice)
        .ok({ ...addressJSON, ...invoiceJSON });
    })
    .catch((err) => {
      if (err.message === 'EmptyResponse') {
        res.notFound();
        return;
      }

      if (err instanceof AuthenticationError) {
        res.unauthorized();
        return;
      }

      console.log(err); // eslint-disable-line
      res.error();
    });
  },
};

export const GetInvoiceCollection = {
  validate: {

    query: {
      include: Joi.string(),
      filter: Joi.object({
        accountId: Joi.string().guid().required(),
        orderId: Joi.string().guid(),
        requestId: Joi.string().guid(),
      }).required(),
    },

  },
  auth: 'token-query-account',
  handler(req, res) {
    const { accountId, orderId, requestId } = req.query.filter;
    const withRelated = ['invoiceItems'];
    const invoice = Invoice.forge();
    const query = { account_id: accountId };

    if (orderId) {
      withRelated.push('orders');
    }

    if (requestId) {
      withRelated.push('orders.request');
    }

    invoice.where(query)
      .orderBy('createdAt')
      .fetchAll({ withRelated })
      .then((collection) => {
        if (IsEmpty(collection)) {
          res.serializer(Serializers.Invoice)
            .ok([]);
          return;
        }

        let orderFilteredList = [];
        let requestFilteredList = [];

        if (orderId) {
          // Invoices can have multiple orders. We just need to make sure
          // at least one of the order id's match the filter id. Additionally
          // orders can have multiple invoices.
          orderFilteredList = collection.filter((inv) => {
            const orders = inv.related('orders');

            if (!orders.length) {
              return false;
            }

            return orders.some(order => orderId === order.get('id'));
          });
        }

        if (requestId) {
          // Orders can only have one request. However invoices can have
          // multiple orders. We need to filter orders down to ones which are
          // connected to a request, then check if at least one of those
          // order's request matches the filter requestId.
          requestFilteredList = collection.filter((inv) => {
            const orders = inv.related('orders');

            if (!orders.length) {
              return false;
            }

            const requestOrders = orders.filter(order => Boolean(order.related('request')));

            if (!requestOrders.length) {
              return false;
            }

            return requestOrders.some(order => requestId === order.related('request').get('id'));
          });
        }

        // Reset the collection if orderId or requestId filters are present.
        if (orderId || requestId) {
          collection.reset([...orderFilteredList, ...requestFilteredList]);
        }

        const toInclude = {};
        const meta = { count: collection.length };

        if (req.include('invoice-item')) {
          toInclude['invoice-item'] = Chain(collection.invoke('related', 'invoiceItems'))
            .map(collection => collection.invoke('toJSON'))
            .flatten()
            .filter(ii => !IsEmpty(ii))
            .value();
        }

        res.serializer(Serializers.Invoice)
          .ok(collection.toJSON(), toInclude, meta);
      });
  },
};

export const PayInvoice = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },

    query: {
      include: Joi.string().allow('payment', 'invoiceItem'),
    },

    payload: {
      data: Joi.object({
        type: Joi.string().required().allow('payment'),
        id: Joi.string().guid(),
        attributes: Joi.object({
          method: Joi.string().required(),
          amount: Joi.number().required(),
          currency: Joi.string().required().allow('USD', 'BLK'),
          chargeId: Joi.string(),
          chargeGateway: Joi.string(),
        }).required().and('chargeId', 'chargeGateway'),

        relationships: Joi.object({
          block: Joi.object({
            data: Joi.alternatives().try([
              Joi.object({
                type: Joi.string().required().allow('block'),
                id: Joi.string().guid().required(),
              }),
              Joi.array().items(
                Joi.object({
                  type: Joi.string().required().allow('block'),
                  id: Joi.string().guid().required(),
                })
              ),
            ]).required(),
          }),
        }),
      }).required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const attributes = req.getAttributes();
    const opts = {
      require: true,
      withRelated: ['account', 'address', 'invoiceItems'],
    };
    const invoice = Invoice.forge({ id });

    invoice.fetch(opts)
      .then(() => {
        // Run checks on the invoice
        const accountId = invoice.get('accountId');
        const invoiceItems = invoice.related('invoiceItems');

        if (credentials.accountId !== accountId) {
          throw new AuthenticationError();
        }

        // FIXME(digia): Refactor into InvoiceMediator

        if (invoice.get('closed')) {
          throw new InvoiceClosedError();
        }

        if (!invoiceItems.length) {
          throw new InvoiceItemRelationshipError();
        }
      })
      .then(() => {
        // Check if it's a block payment.
        // Fetch the block(s).
        const { method, amount } = attributes;

        if (method === 'block') {
          const blocks = req.getRelationship('block');
          const blockList = IsArray(blocks) ? blocks : [blocks];

          if (!blocks || blockList.length !== amount) {
            throw new PayloadError();
          }

          // Payment
          return Db.knex(Block.tableName)
            .whereIn('id', blockList.map(b => b.id))
            .then((results) => {
              // Blocks don't exist or only part of them do.
              if (results.length !== amount) {
                throw new NotFoundError();
              }

              return BlockCollection.forge(results);
            });
        }
      })
      .then((blockCollection) => {
        // Handle the payment
        const payBy = attributes.method;
        const cashier = Cashier();

        if (payBy === 'block' && blockCollection) {
          return Db.transaction((t) => {
            return cashier.payByBlock(invoice, attributes, blockCollection, { transacting: t });
          });
        }

        if (payBy === 'charge') {
          const account = invoice.related('account');

          return Db.transaction((t) => {
            return cashier.payByCharge(invoice, account, attributes, { transacting: t })
            .then(() => {
              // NOTE(digia): At this point the invoice should be updated as "paid".
              // Additionally the client has been charged.
              return BlockGenerator()
              .fromInvoice(invoice, { transacting: t })
              .catch((err) => {
                // FIXME(digia): Catch exceptions BlockGenerator exception.
                // InvoiceOpenError -> Invoice is still open.
                // ModelRelationshipError -> Account and or invoice items not loaded.
                // DatabaseSeedError -> Products aren't in the database.
                console.error(err); // eslint-disable-line
              });
            });
          });
        }

        throw new PaymentMethodError(`Unsupported payment method.`);
      })
      .then(() => {
        // Respond
        const include = {};
        const address = invoice.related('address');
        const invoiceJSON = invoice.toJSON();
        const addressJSON = address.toJSON({ exclude: ['id'] });
        const json = Merge(invoiceJSON, addressJSON);

        if (req.include('account')) {
          include.account = invoice.related('account').toJSON();
        }

        if (req.include('payment')) {
          // Cashier refreshed with and loaded payments then added the new payment
          // to the invoice.
          include.payment = invoice.related('payments').toJSON();
        }

        if (req.include('invoiceItem')) {
          include.invoiceItem = invoice.related('invoiceItems').toJSON();
        }

        res.serializer(Serializers.Invoice)
        .ok(json, include);
      })
      .catch((err) => {
        // Invoice was not found
        if (err.message === 'EmptyResponse') {
          res.notFound();
          return;
        }

        // Blocks were not found
        if (err instanceof NotFoundError) {
          res.notFound();
          return;
        }

        if (err instanceof AuthenticationError) {
          res.unauthorized();
          return;
        }

        // Either happened; [in order of exception]
        // - Invoice is already paid or closed
        // - Invoice doesn't have any invoice items
        if (err instanceof InvoiceClosedError ||
            err instanceof InvoiceItemRelationshipError) {
          res.conflict();
          return;
        }

        // Payment method was block but no blocks relationship were provided in
        // payload.
        if (err instanceof PayloadError) {
          res.badRequest();
          return;
        }

        // Either happened; [in order of exception]
        // - Blocks were provided, however the amount did not match the invoice
        //   amount due.
        // - Provided blocks do not belong to the invoice's account
        // - Attempting to apply a payment in a currency which is not due on
        //   the invoice.
        // - Payment method is not supported
        // - Charge card was declined
        // - Charge card was declined and flagged as fraudulent
        // - Charge card failed because of incorrect CVC number
        // - Charge card failed because of expiration
        // - Charge card failed because of a processing error
        if (err instanceof InputError ||
            err instanceof PaymentBlockError ||
            err instanceof InvoicePaymentCurrencyError ||
            err instanceof PaymentMethodError ||
            err instanceof ChargeCardDeclinedError ||
            err instanceof ChargeCardFraudulentError ||
            err instanceof ChargeCardCVCError ||
            err instanceof ChargeCardExpirationError ||
            err instanceof ChargeCardProcessingError) {
          res.badData();
          return;
        }

        res.error();
      });
  },
};

export const GetInvoiceItem = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const lineItem = LineItem.forge({ id });
    const invoice = Invoice.forge();

    function fetchLineItem(next) {
      const opts = { require: true };

      lineItem.fetch(opts)
      .then(() => {
        next(null);
      })
      .catch(() => {
        next(new NotFoundError);
      });
    }

    function checkLineItem(next) {
      // Check that it's an invoice line item
      if (invoice.tableName !== lineItem.get('lineableType')) {
        next(new NotFoundError);
        return;
      }

      next(null);
    }

    function fetchInvoice(next) {
      const opts = {
        require: true,
        withRelated: ['account'],
      };

      invoice.set('id', lineItem.get('lineableId'));

      invoice.fetch(opts)
      .then(() => {
        const account = invoice.related('account');

        if (credentials.accountId !== account.get('id')) {
          next(new AuthenticationError);
          return;
        }

        next(null);
      })
      .catch(() => {
        next(new NotFoundError);
      });
    }

    Async.waterfall([
      fetchLineItem,
      checkLineItem,
      fetchInvoice,
    ], (err) => {
      if (err instanceof NotFoundError) {
        res.notFound();
        return;
      }

      if (err instanceof AuthenticationError) {
        res.unauthorized();
        return;
      }

      if (err) {
        console.log(err); // eslint-disable-line
        res.error();
        return;
      }

      res.serializer(Serializers.InvoiceItem)
      .ok(lineItem.toJSON());
    });
  },
};

export const GetInvoiceItemCollection = {
  validate: {

    query: {
      include: Joi.string(),
      filter: Joi.object({
        invoiceId: Joi.string().guid().required(),
        currency: Joi.string().allow('USD', 'BLK'),
      }).required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { invoiceId, currency } = req.query.filter;
    const opts = {
      require: true,
      withRelated: ['invoiceItems'],
    };
    const invoice = Invoice.forge({ id: invoiceId });


    // Include;
    // - Invoice
    // - Skus

    if (req.include('invoice')) {
      opts.withRelated.push('address');
    }

    if (req.include('sku')) {
      opts.withRelated.push('invoiceItems.sku');
    }

    invoice.fetch(opts)
      .then(() => {
        const accountId = invoice.get('accountId');

        if (credentials.accountId !== accountId) {
          res.unauthorized();
          return;
        }

        const invoiceItemCollection = invoice.related('invoiceItems');
        const meta = {};
        const toInclude = {};

        if (IsEmpty(invoiceItemCollection)) {
          res.serializer(Serializers.InvoiceItem)
            .ok([]);
          return;
        }

        if (currency) {
          const currencyFilterList = invoiceItemCollection.filter((item) => {
            if (currency !== item.get('currency')) {
              return false;
            }

            return true;
          });

          if (!IsEmpty(currencyFilterList)) {
            invoiceItemCollection.reset(currencyFilterList);
          }
        }

        if (req.hasInclude()) {
          if (req.include('invoice')) {
            const invoiceJSON = invoice.toJSON();
            const addressJSON = invoice.related('address').toJSON({ exclude: ['id'] });

            toInclude.invoice = { ...invoiceJSON, ...addressJSON };
          }

          if (req.include('sku')) {
            toInclude.sku = Chain(invoiceItemCollection.invoke('related', 'sku'))
              .map(s => s.toJSON())
              .filter(s => !IsEmpty(s))
              .uniqBy('id')
              .value();
          }
        }

        res.serializer(Serializers.InvoiceItem)
          .ok(invoiceItemCollection.toJSON(), toInclude, { count: invoiceItemCollection.length });
      })
      .catch((err) => {
        if (err.message === 'EmptyResponse') {
          res.serializer(Serializers.InvoiceItem)
            .ok([]);
          return;
        }

        console.warn(err); // eslint-disable-line
        res.error();
      });
  },
};
