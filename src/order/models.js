import { capitalize as Capitalize } from 'lodash';
import Joi from 'joi';
import Uuid from 'node-uuid';
import ModelFactory from '../foundation/model-factory';
import Db from '../database';
import { Invoice } from '../invoice/models';
import { LineItem } from '../product/models';
import LineItemCalculator from '../product/line-item-calculator';


const statusList = [
  'Draft',
  'Pending', // Pending "response" from client
  'Rejected', // Client rejected the order
  'Approved', // Client approved the order
  'Partial', // Approved, and partially invoiced
  'Invoiced', // Approved, and invoiced. Check invoice/payment to determine if paid.
];

export const Order = ModelFactory('order', {

  hasTimestamps: ['createdAt', 'updatedAt'],
  soft: true,

  defaults: {
    state: 0,
  },

  rules: {
    state: Joi.number().min(0).max(statusList.length - 1).required(),
    note: Joi.string(),
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

    total() {
      const items = this.related('orderItems');

      return LineItemCalculator(items.toJSON()).subtotal();
    },
  },

  account() {
    return this.belongsTo('Account');
  },

  request() {
    return this.belongsTo('Request');
  },

  orderItems() {
    return this.morphMany(LineItem, 'lineable');
  },

  invoices() {
    return this.belongsToMany('Invoice', 'invoice_order', 'order_id', 'invoice_id');
  },

  isDraft() {
    return statusList.indexOf('Draft') === this.get('state');
  },

  isPending() {
    return statusList.indexOf('Pending') === this.get('state');
  },

  isRejected() {
    return statusList.indexOf('Rejected') === this.get('state');
  },

  isApproved() {
    return statusList.indexOf('Approved') === this.get('state');
  },

  isPartiallyInvoice() {
    return statusList.indexOf('Partial') === this.get('state');
  },

  isInvoiced() {
    return statusList.indexOf('Invoiced') === this.get('state');
  },

  approve() {
    throw new Error;
  },

  reject() {
    throw new Error;
  },

  toInvoice() {
    const account = this.related('account');
    const address = account.related('address');
    const items = this.related('orderItems');

    if (!account.get('id') || !address.get('id') || !items || !items.length) {
      const msg = `Order requires account, account address, and order items in
      order to create an invoice.`;
      throw new Error(msg);
    }

    const orderTotal = this.get('total');
    const invoiceAttrs = {
      id: Uuid.v4(),
      subtotal: orderTotal,
      total: orderTotal,
      amountDue: orderTotal,
      paid: false,
      closed: false,
      attempted: false,
      attemptCount: 0,
      accountId: account.get('id'),
      addressId: address.get('id'),
    };

    const invoice = Invoice.forge(invoiceAttrs);

    invoice.relations.address = address;

    invoice.related('invoiceItems').add(items.invoke(
      'duplicate',
      invoice.get('id'),
      invoice.tableName
    ));

    return invoice;
  },

}, {

  statuses: statusList,
});

Db.model('Order', Order);
