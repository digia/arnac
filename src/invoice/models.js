import {
  some as Some,
} from 'lodash';
import Joi from 'joi';
import ModelFactory from '../foundation/model-factory';
import Db from '../database';
import { Block } from '../block/models';
import { LineItem } from '../product/models';
import {
  InvoicePaymentRelationshipError,
  InvoicePaymentCurrencyError,
  InvoiceItemRelationshipError,
} from './errors';
import InvoiceCalculator from './invoice-calculator';


export const Invoice = ModelFactory('invoice', {

  hasTimestamps: ['createdAt', 'updatedAt'],
  soft: true,

  rules: {
    // Whether or not payment was successfully collected for this invoice.
    paid: Joi.boolean().required(),

    /**
    * Whether or not the invoice is still trying to collect payment.
    * An invoice is closed if it's either paid or it has been marked closed.
    */
    closed: Joi.boolean().required(),
    attempted: Joi.boolean().required(),
    attemptCount: Joi.number().required(),
    note: Joi.string(),
  },

  defaults: {
    paid: false,
    closed: false,
    attempted: false,
    attemptCount: 0,
  },

  virtuals: {

    // Total of all line items
    subtotal() {
      const items = this.related('invoiceItems');

      return InvoiceCalculator(items.toJSON()).subtotal();
    },

    // Total after discount
    total() {
      // Get subtotal
      // Apply any discounts
      // Return
      const subtotal = this.get('subtotal');

      // TODO(digia): Process discounts against subtotal...

      return subtotal;
    },

    // Final amount due at the time for this invoice. Accounts for any payments
    // already made.
    amountDue() {
      const items = this.related('invoiceItems');
      const payments = this.related('payments');

      return InvoiceCalculator(items.toJSON()).amountDue(payments.toJSON());
    },
  },

  address() {
    return this.belongsTo('Address');
  },

  invoiceItems() {
    return this.morphMany(LineItem, 'lineable');
  },

  orders() {
    return this.belongsToMany('Order', 'invoice_order', 'invoice_id', 'order_id');
  },

  account() {
    return this.belongsTo('Account');
  },

  payments() {
    return this.hasMany('Payment');
  },

  generatedBlocks() {
    return this.morphMany(Block, 'generator');
  },

  subscription() {
    return this.belongsTo('Subscription');
  },

  markAsPaid() {
    this.set('paid', true);
    this.recordAttempt();
    this.markAsClosed();
  },

  markAsClosed() {
    this.set('closed', true);
  },

  recordAttempt(type = 'manual') {
    const attemptCount = this.get('attemptCount');

    this.set('attempted', true);

    if (type === 'manual' && attemptCount === 1) {
      return attemptCount;
    }

    this.incrementAttempts();

    return this.get('attemptCount');
  },

  incrementAttempts() {
    const attempts = this.get('attemptCount') || 0;

    this.set('attemptCount', attempts + 1);
  },

  applyPayment(payment) {
    if (payment.get('invoiceId') !== this.get('id')) {
      const msg = `Payment must belong to the invoice in order to apply it`;
      throw new InvoicePaymentRelationshipError(msg);
    }

    if (!this.related('invoiceItems').length) {
      const msg = `Invoice items are required to apply a payment.`;
      throw new InvoiceItemRelationshipError(msg);
    }

    const amountDue = this.get('amountDue');
    const currencyAmountDue = amountDue[payment.get('currency')];

    // Applying a payment in a currency which is not on this invoice
    if (!currencyAmountDue) {
      const msg = `Attempting to apply a payment with currency not due on the invoice.`;
      throw new InvoicePaymentCurrencyError(msg);
    }

    this.related('payments').add(payment);

    const updatedAmountDue = this.get('amountDue');

    // Invoice still require payments if amountDue still have currencies
    // with a value greater than 0.
    if (Some(updatedAmountDue, amount => amount > 0)) {
      this.recordAttempt();
      return this;
    }

    this.markAsPaid();

    return this;
  },

});

Db.model('Invoice', Invoice);
