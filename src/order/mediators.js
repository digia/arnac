import { defaults as Defaults } from 'lodash';
import { StateError } from '../foundation/errors';
import { Order } from './models';


export function OrderMediator() {
  function reject(order, options = {}) {
    const opts = Defaults({ patch: true }, options);
    const rejectedState = Order.statuses.indexOf('Rejected');

    if (!order.isPending()) {
      return Promise.reject(new StateError);
    }

    return order.save({ state: rejectedState }, opts);
  }

  function approve(order, options = {}) {
    const opts = Defaults({ patch: true }, options);
    const orderItems = order.related('orderItems');

    // NOTE(digia): Is this the proper error for not having any order items?
    if (order.isDraft() ||
        !orderItems.length ||
        order.isApproved() ||
        order.isInvoiced()) {
      return Promise.reject(new StateError);
    }

    return order.update({ state: Order.statuses.indexOf('Approved') }, opts);
  }

  function invoice(order, options = {}) {
    if (!order.isApproved() || !order.related('orderItems').length) {
      return Promise.reject(new StateError);
    }

    const orderOpts = Defaults({ patch: true }, options);
    const invoice = order.toInvoice();
    const invoiceItems = invoice.related('invoiceItems');

    return Promise.all([
      order.update({ state: Order.statuses.indexOf('Invoiced') }, orderOpts),
      invoice.create(null, options),
      invoice.related('invoiceItems').invokeThen('create', null, options),
    ])
      .then(() => {
        return order.related('invoices')
          .attach(invoice, options)
          .then(() => { order, invoice, invoiceItems });
      });
  }

  return { reject, approve, invoice };
}
