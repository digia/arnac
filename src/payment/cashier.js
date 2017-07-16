import Stripe from './stripe';
import Db from '../database';
import { InputError } from '../foundation/errors';
import {
  PaymentBlockError,
  ChargeCardError,
  ChargeCardDeclinedError,
  ChargeCardFraudulentError,
  ChargeCardCVCError,
  ChargeCardExpirationError,
  ChargeCardProcessingError,
  RefundAmountError,
} from './errors';
import { PaymentCollection } from './collections';


export default function Cashier({
  stripe = Stripe,
  paymentCollection = PaymentCollection.forge(),
} = {}) {
  function chargePayment(invoice, stripeAttrs, opts) {
    return stripe.charges.create(stripeAttrs)
    .then((charge) => {
      const payment = paymentCollection.model.forge();
      const paymentAttrs = {
        method: 'charge',
        amount: charge.amount,
        currency: charge.currency,
        chargeId: charge.id,
        chargeGateway: 'stripe',
        invoiceId: invoice.get('id'),
      };

      return payment.create(paymentAttrs, opts);
    });
  }

  function payByCharge(invoice, account, attributes, opts = {}) {
    const { amount, currency, chargeId } = attributes;
    const stripeAttrs = {
      amount,
      currency,
      source: chargeId,
      metadata: {
        invoiceId: invoice.get('id'),
      },
    };

    return chargePayment(invoice, stripeAttrs, opts)
    .then((payment) => {
      // Refresh with all of it's payments
      return invoice.refresh({ withRelated: ['payments'] })
      .then(() => {
        // Update the invoice
        return invoice.applyPayment(payment)
        .save(null, opts)
        .then(() => {
          // Return the payment
          return payment;
        });
      });
    })
    .catch((err) => {
      if (err.code === 'card_declined' && !err.raw.decline_code) {
        throw new ChargeCardDeclinedError(err.message);
      }

      if (err.code === 'card_declined' &&
          err.raw.decline_code &&
          err.raw.decline_code === 'fraudulent') {
        const msg = `Your card was declined and flagged as a fraudulent charge`;
        throw new ChargeCardFraudulentError(msg);
      }

      if (err.code === 'incorrect_cvc') {
        throw new ChargeCardCVCError(err.message);
      }

      if (err.code === 'expired_card') {
        throw new ChargeCardExpirationError(err.message);
      }

      if (err.code === 'processing_error') {
        throw new ChargeCardProcessingError(err.message);
      }

      throw new ChargeCardError(err.message);
    });
  }

  function payByBlock(invoice, attributes, blocks, opts = {}) {
    const { amount, currency } = attributes;

    if (amount !== blocks.length) {
      const msg = `The amount of blocks provided must match the payment amount.`;
      return Promise.reject(new InputError(msg));
    }

    const aId = invoice.get('accountId');
    const blockPassCheck = blocks.every((b) => {
      return aId === b.get('accountId') && b.get('isAvailable');
    });

    if (!blockPassCheck) {
      const msg = `All blocks must belong to the invoice's account and be available.`;
      return Promise.reject(new PaymentBlockError(msg));
    }

    const payment = paymentCollection.model.forge();
    const paymentAttrs = {
      method: 'block',
      amount,
      currency,
      invoiceId: invoice.get('id'),
    };

    return payment.create(paymentAttrs, opts)
      .then(() => {
        // Refresh invoice and load all of it's payments
        return invoice.refresh({ withRelated: ['payments'] });
      })
      .then(() => {
        // Update invoice and attach blocks to payment
        const { transacting } = opts;
        const blockTable = blocks.first().tableName;
        const blockIdList = blocks.map(b => b.get('id'));
        const query = Db.knex(blockTable)
        .transacting(transacting)
        .whereIn('id', blockIdList);

        // Update blocks and invoice
        return Promise.all([
          query.update({ payment_id: payment.get('id') }),
          invoice.applyPayment(payment).save(null, opts),
        ]);
      })
      .then(() => payment);
  }

  function refundByBlock(payment, refundAmount, opts = {}) {
    if (!refundAmount) {
      return Promise.resolve(null);
    }

    const availableBlockList = payment.related('blocks')
    .filter(b => !b.get('isExhausted'));

    if (availableBlockList.length < refundAmount) {
      const msg = `Not enough blocks to refund.`;
      throw new RefundAmountError(msg);
    }

    const { transacting } = opts;
    const blockTable = availableBlockList[0].tableName;
    const blockIdList = availableBlockList.map(b => b.get('id'));
    const refund = payment.toRefund(refundAmount, 'overestimated')
    .set('method', 'Block');
    const blockQuery = Db.knex(blockTable)
    .transacting(transacting)
    .whereIn('id', blockIdList);

    return Promise.all([
      refund.create(null, opts),
      blockQuery.update({ payment_id: null }),
    ])
    .then(() => refund);
  }

  return { payByCharge, payByBlock, refundByBlock };
}
