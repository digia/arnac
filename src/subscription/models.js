import Joi from 'joi';
import ModelFactory from '../foundation/model-factory';
import Db from '../database';


const statusList = [
  '', // Not in use. Potentially Trial later on.
  'Active',
  'Past Due',
  'Canceled',
  'Unpaid',
];

export const Subscription = ModelFactory('subscription', {

  hasTimestamps: ['createdAt', 'updatedAt',],

  rules: {
    state: Joi.number().min(0).max(statusList.length - 1).required(),
    currentPeriodStart: Joi.date().required(),
    currentPeriodEnd: Joi.date().required(),
    canceledAt: Joi.date(),
    endedAt: Joi.date(),
  },

  virtuals: {
    status: {
      get() {
        let state = this.get('state');

        if (!state) state = 0;

        return statusList[state];
      },
      set(value) {
        const idx = statusList.indexOf(Capitalize(value));
        let message;

        if (idx === -1) {
          message = `${value} status does not map to a state.`;
          throw Error(message);
        }

        this.set('state', idx);

        return this;
      },
    },
  },

  account() {
    return this.belongsTo('Account');
  },

  plan() {
    return this.belongsTo('Plan');
  },

  invoices() {
    return this.hasMany('Invoice');
  },

  toInvoice() {
    throw new Error(`Not yet implemented`);
  },

}, {
  statuses: statusList,
});


Db.model('Subscription', Subscription);
