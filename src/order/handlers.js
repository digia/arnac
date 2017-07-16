import {
  isEmpty as IsEmpty,
  merge as Merge,
  chain as Chain,
  isUndefined as IsUndefined,
} from 'lodash';
import Async from 'async';
import Joi from 'joi';
import { Order } from './models';
import { OrderMediator } from './mediators';
import * as Serializers from './serializers';
import { NotFoundError, AuthenticationError, StateError } from '../foundation/errors';
import { LineItem } from '../product/models';


export const GetOrder = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },

    query: {
      include: Joi.string(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const opts = {
      require: true,
      withRelated: ['orderItems'], // Needed to calculate total
    };
    const order = Order.forge({ id });

    if (req.include('account')) {
      opts.withRelated.push('account');
    }

    if (req.include('request')) {
      opts.withRelated.push('request');
    }

    order.fetch(opts)
      .then(() => {
        const accountId = order.get('accountId');
        const toInclude = {};

        if (credentials.accountId !== accountId) {
          res.unauthorized();
          return;
        }

        if (order.isDraft()) {
          res.conflict();
          return;
        }

        if (req.hasInclude()) {
          if (req.include('account')) {
            toInclude.account = order.related('account')
              .toJSON();
          }

          if (req.include('order-item') && order.related('orderItems').length) {
            toInclude['order-item'] = order.related('orderItems')
              .invoke('toJSON');
          }

          if (req.include('request') && order.related('request').get('id')) {
            toInclude.request = order.related('request')
              .toJSON();
          }
        }

        res.serializer(Serializers.Order)
          .ok(order.toJSON(), toInclude);
      })
      .catch((err) => {
        if (err.message === 'EmptyResponse') {
          res.notFound();
          return;
        }

        console.log(err); // eslint-disable-line
        res.error();
      });
  },
};

export const GetOrderCollection = {
  validate: {

    query: {
      include: Joi.string(),
      filter: Joi.object({
        accountId: Joi.string().guid().required(),
        requestId: Joi.string().guid(),
      }).required(),
    },

  },
  auth: 'token-query-account',
  handler(req, res) {
    const { accountId, requestId } = req.query.filter;
    const opts = { withRelated: ['account'] };
    const order = Order.forge();
    const query = { account_id: accountId };

    // TODO(digia): Move this into a event within the model
    // NOTE(digia): Clients should not see draft orders!
    order.where('state', '!=', 0);

    if (requestId) {
      order.where({ request_id: requestId });
    }

    if (req.include('order-item')) {
      opts.withRelated.push('orderItems');
    }

    if (req.include('request')) {
      opts.withRelated.push('request');
    }

    order.where(query)
      .orderBy('updatedAt')
      .fetchAll(opts)
      .then((collection) => {
        const toInclude = {};

        if (req.include('order-item')) {
          toInclude['order-item'] = Chain(collection.invoke('related', 'orderItems'))
            .invokeMap('toJSON')
            .flatten()
            .value();
        }

        if (req.include('request')) {
          toInclude.request = Chain(collection.invoke('related', 'request'))
            .invokeMap('toJSON')
            .filter(r => !IsUndefined(r.id))
            .value();
        }

        res.serializer(Serializers.Order)
        .ok(collection.toJSON(), toInclude);
      });
  },
};

export const ApproveOrder = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },

    query: {
      include: Joi.string(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const order = Order.forge({ id });

    const opts = {
      require: true,
      withRelated: [
        'account',
        'orderItems',
      ],
    };

    order.fetch(opts)
      .then(() => {
        if (credentials.accountId !== order.get('accountId')) {
          throw new AuthenticationError();
        }

        return OrderMediator().approve(order);
      })
      .then(() => {
        res.serializer(Serializers.Order)
          .ok(order.toJSON());
      })
      .catch((err) => {
        if (err instanceof AuthenticationError) {
          res.unauthorized();
          return;
        }

        if (err.message === 'EmptyResponse') {
          res.notFound();
          return;
        }

        if (err instanceof StateError) {
          res.conflict();
          return;
        }

        console.log(err); // eslint-disable-line
        res.error();
      });
  },
};

export const RejectOrder = {
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
      withRelated: ['orderItems'], // Needed to calculate total
    };
    const order = Order.forge({ id });

    order.fetch(opts)
      .then(() => {
        const accountId = order.get('accountId');

        if (credentials.accountId !== accountId) {
          res.unauthorized();
          return;
        }

        OrderMediator().reject(order)
          .then(() => {
            res.serializer(Serializers.Order)
            .ok(order.toJSON());
          })
          .catch(() => {
            res.conflict();
          });
      })
      .catch(() => {
        res.notFound();
      });
  },
};

export const InvoiceOrder = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },

    query: {
      include: Joi.string(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const order = Order.forge({ id });

    const opts = {
      require: true,
      withRelated: [
        'account',
        'account.address',
        'orderItems',
        'invoices',
        'invoices.address',
      ],
    };

    order.fetch(opts)
      .then(() => {
        const account = order.related('account');
        const address = account.related('address');

        if (credentials.accountId !== account.get('id')) {
          throw new AuthenticationError();
        }

        // Orders require the account to have an address in order to generate
        // an invoice.
        if (address.isNew()) {
          throw new StateError();
        }

        return OrderMediator().invoice(order);
      })
      .then(() => {
        const toInclude = {};

        if (req.include('invoice')) {
          toInclude.invoice = order.related('invoices')
            .map((invoice) => {
              const address = invoice.related('address');
              const invoiceJSON = invoice.toJSON();

              invoiceJSON.orderId = id; // Many-to-many patch

              return { ...invoiceJSON, ...address.toJSON({ exclude: ['id'] }) };
            });
        }

        // FIXME(digia): When jaysonapi support include to include relationships
        // we'll also allow for include of the invoice items here.

        res.serializer(Serializers.Order)
          .ok(order.toJSON(), toInclude);
      })
      .catch((err) => {
        if (err instanceof AuthenticationError) {
          res.unauthorized();
          return;
        }

        if (err.message === 'EmptyResponse') {
          res.notFound();
          return;
        }

        // - Organization doesn't have an address
        if (err instanceof StateError) {
          res.conflict();
          return;
        }

        console.log(err); // eslint-disable-line
        res.error();
      });
  },
};


export const GetOrderItem = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },

    query: {
      include: Joi.string(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const opts = { require: true, withRelated: [] };
    const lineItem = LineItem.forge();
    const order = Order.forge();

    if (req.include('sku')) {
      opts.withRelated.push('sku');
    }

    lineItem.query({
      where: { id },
      andWhere: { lineable_type: order.tableName }
    })
      .fetch(opts)
      .then((orderItem) => {

        return order.query({ where: { id: orderItem.get('lineableId') } })
          .fetch({ require: true })
          .then(() => orderItem);
      })
      .then((orderItem) => {
        const accountId = order.get('accountId');
        const toInclude = {};

        if (credentials.accountId !== accountId) {
          throw new AuthenticationError;
        }

        // NOTE(digia): Clients should not see draft orders!
        if (order.isDraft()) {
          throw new StateError;
        }

        if (req.include('order')) {
          toInclude.order = order.toJSON();
        }

        if (req.include('sku')) {
          toInclude.sku = orderItem.related('sku')
            .toJSON();
        }

        res.serializer(Serializers.OrderItem)
          .ok(orderItem.toJSON(), toInclude);
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

        if (err instanceof StateError) {
          res.conflict();
          return;
        }

        console.log(err); // eslint-disable-line
        res.error();
      });
  },
};

export const GetOrderItemCollection = {
  validate: {

    query: {
      include: Joi.string(),
      filter: Joi.object({
        orderId: Joi.string().guid().required(),
        currency: Joi.string().allow('usd', 'blk'),
      }).required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { orderId, currency } = req.query.filter;
    const opts = {
      require: true,
      withRelated: ['orderItems', {
        orderItems(qb) {
          if (currency) {
            qb.where('currency', currency);
          }
        },
      }],
    };
    const order = Order.forge({ id: orderId });

    if (req.include('sku')) {
      opts.withRelated.push('orderItems.sku');
    }

    order.fetch(opts)
      .then(() => {
        const toInclude = {};
        const orderItems = order.related('orderItems');
        const accountId = order.get('accountId');

        if (credentials.accountId !== accountId) {
          res.unauthorized();
          return;
        }

        // NOTE(digia): Clients should not see draft orders!
        if (order.isDraft()) {
          res.conflict();
          return;
        }

        if (req.include('order')) {
          toInclude.order = order.toJSON();
        }

        if (req.include('sku')) {
          toInclude.sku = Chain(orderItems.invoke('related', 'sku'))
            .map(s => s.toJSON())
            .filter(s => !IsEmpty(s))
            .uniqBy('id')
            .value();
        }

        res.serializer(Serializers.OrderItem)
          .ok(orderItems.toJSON(), toInclude);
      })
      .catch(() => {
        res.serializer(Serializers.OrderItem)
        .ok([]);
      });
  },
};
