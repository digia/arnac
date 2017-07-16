import Joi from 'joi';
import ModelFactory from '../foundation/model-factory';
import Db from '../database';
import { Refund } from '../refund/models';


export const Payment = ModelFactory('payment', {

  hasTimestamps: ['createdAt'],

  rules: {
    method: Joi.string().required(),
    amount: Joi.string().required(),
    currency: Joi.string().required(),
    chargeId: Joi.string(),
    chargeGateway: Joi.string(),
    note: Joi.string(),
  },

  invoice() {
    return this.belongsTo('Invoice');
  },

  refunds() {
    return this.hasMany('Refund');
  },

  blocks() {
    return this.hasMany('Block');
  },

  toRefund(amount = this.get('amount'), reason = null) {
    const attrs = {
      amount,
      currency: this.get('currency'),
      paymentId: this.get('id'),
      reason,
    };

    return Refund.forge(attrs);
  },

});


Db.model('Payment', Payment);
