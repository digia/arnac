import { isEmpty as IsEmpty } from 'lodash';
import Joi from 'joi';
import { Payment } from './models';
import * as Serializers from './serializers';


export const GetPayment = {
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
      withRelated: ['invoice', 'invoice.account'],
    };
    const payment = Payment.forge({ id });

    payment.fetch(opts)
    .then(() => {
      const invoice = payment.related('invoice');
      const account = invoice.related('account');

      if (credentials.accountId !== account.get('id')) {
        res.unauthorized();
        return;
      }

      res.serializer(Serializers.Payment)
      .ok(payment.toJSON());
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

export const GetPaymentCollection = {
  validate: {

    query: {
      filter: Joi.object({
        accountId: Joi.string().guid().required(),
        invoiceId: Joi.string().guid(),
        currency: Joi.string().allow('usd', 'blk'),
      }).required(),
    },

  },
  auth: 'token-query-account',
  handler(req, res) {
    const { invoiceId, currency } = req.query.filter;
    const opts = { withRelated: ['invoice', 'invoice.account'] };
    const payment = Payment.forge();
    const query = {};

    if (currency) {
      query.currency = currency;
    }

    payment.where(query)
    .orderBy('createdAt')
    .fetchAll(opts)
    .then((collection) => {
      if (IsEmpty(collection)) {
        res.serializer(Serializers.Payment)
        .ok([]);
        return;
      }

      if (invoiceId) {
        const invoiceFilteredList = collection.filter((pay) => {
          const invoice = pay.related('invoice');

          return invoiceId === invoice.get('id');
        });

        collection.reset(invoiceFilteredList);
      }

      res.serializer(Serializers.Payment)
      .ok(collection.toJSON());
    });
  },
};
