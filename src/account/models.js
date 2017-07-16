import {
  defaults as Defaults,
  compact as Compact,
  omit as Omit,
  isNull as IsNull,
} from 'lodash';
import Moment from 'moment';
import Joi from 'joi';
import Stripe from '../payment/stripe';
import ModelFactory from '../foundation/model-factory';
import Db from '../database';


export const Account = ModelFactory('account', {

  hasTimestamps: ['createdAt', 'updatedAt'],
  soft: true,

  rules: {
    organization: Joi.string().required(),
    phone: Joi.string(),
    stripeId: Joi.string(),
  },

  address() {
    return this.belongsTo('Address');
  },

  users() {
    return this.hasMany('User');
  },

  requests() {
    return this.hasMany('Request');
  },

  properties() {
    return this.hasMany('Property');
  },

  orders() {
    return this.hasMany('Order');
  },

  invoices() {
    return this.hasMany('Invoice');
  },

  subscriptions() {
    return this.hasMany('Subscription');
  },

  cards() {
    return this.hasMany('Card');
  },


  createStripeCustomer(source = null, options = {}) {
    if (this.get('stripeId')) {
      return Promise.resolve(this);
    }

    const opts = Defaults(options, { update: true });
    const customerAttrs = {
      source,
      metadata: {
        accountId: this.get('id'),
      },
    };

    return Stripe.customers.create(Compact(customerAttrs))
    .then((customer) => {
      if (!opts.update) {
        this.set('stripeId', customer.id);

        return this;
      }

      return this.update({ stripeId: customer.id }, opts);
    });
  },

  deleteStripeCustomer(options = {}) {
    if (!this.get('stripeId')) {
      return Promise.resolve(this);
    }

    const opts = Defaults(options, { update: true });

    return Stripe.customers.del(this.get('stripeId'))
    .then(() => {
      if (!opts.update) {
        this.get('stripeId', null);

        return this;
      }

      return this.update({ stripeId: null }, opts);
    });
  },

});


export const Card = ModelFactory('card', {

  hasTimestamps: ['createdAt'],

  rules: {
    stripeId: Joi.string().required(),
    brand: Joi.string().required(),
    last4: Joi.string().required(),
    expirationMonth: Joi.number().required(),
    expirationYear: Joi.number().required(),
  },

  virtuals: {
    hasExpired() {
      const month = this.get('expirationMonth');
      const year = this.get('expirationYear');

      if (IsNull(month) || IsNull(year)) {
        return null;
      }

      if (Moment(year+month, 'YYYYMM') <= new Date()) {
        return true;
      }

      return false;
    }
  },

  initialize() {
    this.on('creating', this.handleStripeCreation, this);
    this.on('destroying', this.handleStripeDeletion, this);
  },

  account() {
    return this.belongsTo('Account');
  },

  handleStripeCreation(model, attrs) {
    const { token, customerId } = attrs;

    // NOTE(digia): Feels so hacky, BUT YOU'RE GONNA TAKE IT!
    model.attributes = Omit(model.attributes, ['customerId', 'token']);

    return Stripe.customers.createSource(customerId, { source: token })
    .then((card) => {
      const stripeId = card.id;
      const { brand, last4, exp_month, exp_year } = card;

      return model.set({
        stripeId,
        brand,
        last4,
        expirationMonth: exp_month,
        expirationYear: exp_year,
      });
    });
  },

  handleStripeDeletion(model, attrs) {
    const account = model.related('account');
    const customerId = account.get('stripeId');
    const cardId = model.get('stripeId');

    if (!account || !customerId) {
      const msg = `Account must be loaded on the Card in order to destroy!`;
      throw new Error(msg);
    }

    return Stripe.customers.deleteCard(customerId, cardId)
    .then((response) => {
      if (!response.deleted) {
        const msg = `Card deletion failed with Stripe.`;
        throw new Error(msg);
      }
    });
  },

});


Db.model('Account', Account);
Db.model('Card', Card);
