import Joi from 'joi';
import ModelFactory from '../foundation/model-factory';
import Db from '../database';


export const Refund = ModelFactory('refund', {

  hasTimestamps: ['createdAt'],

  rules: {
    method: Joi.string().required(),
    amount: Joi.string().required(),
    currency: Joi.string().required(),
    refundId: Joi.string(),
    refundGateway: Joi.string(),
    reason: Joi.string(),
  },

  payment() {
    return this.belongsTo('Payment');
  },
});


Db.model('Refund', Refund);
