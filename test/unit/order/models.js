import _ from 'lodash';
import Uuid from 'node-uuid';
import { Address } from '../../../src/address/models';
import { Account } from '../../../src/account/models';
import { Product, Sku } from '../../../src/product/models';
import { Request } from '../../../src/request/models';
import { Payment } from '../../../src/payment/models';
import { Order } from '../../../src/order/models';
import { OrderCollection } from '../../../src/order/collections';


describe('Order Model', function () {

  it(`instantiates`, function (done) {

    const order = Order.forge();

    expect(order).to.exist();

    done();
  });

  it(`defaults to a draft status`, function (done) {

    const order = Order.forge();

    expect(order.get('status')).to.equal('Draft');

    done();
  });

  it(`can generate it's total without any order items`, function (done) {

    const order = Order.forge();

    const total = order.get('total');

    expect(total).to.be.an.object();
    expect(_.isEmpty(total)).to.be.true;

    done();
  });

  it(`can generate it's total`, function (done) {

    // Setup

    const order = Order.forge({ id: Uuid.v4() });
    const collection = OrderCollection.forge();
    const orderItems = [
      collection.makeOrderItem({
        orderId: order.get('id'),
        amount: 1,
        currency: 'usd',
        quantity: 1,
      }),
      collection.makeOrderItem({
        orderId: order.get('id'),
        amount: 2,
        currency: 'usd',
        quantity: 2,
      }),
      collection.makeOrderItem({
        orderId: order.get('id'),
        amount: 1,
        currency: 'blk',
        quantity: 3,
      }),
    ];

    order.related('orderItems').add(orderItems);

    // Test

    const orderTotal = order.get('total');

    expect(orderTotal).to.be.an.object();
    expect(orderTotal.usd).to.equal(5);
    expect(orderTotal.blk).to.equal(3);

    done();
  });

  it(`belongs to an account`, function (done) {

    const order = Order.forge();

    expect(order.account().relatedData.type).to.equal('belongsTo');

    done();
  });

  it(`can belongs to a request`, function (done) {

    const order = Order.forge();

    expect(order.request().relatedData.type).to.equal('belongsTo');

    done();
  });

  it(`can have many order items`, function (done) {

    const order = Order.forge();

    expect(order.orderItems().relatedData.type).to.equal('morphMany');

    done();
  });

  it(`can have many invoices`, function (done) {

    const order = Order.forge();

    expect(order.invoices().relatedData.type).to.equal('belongsToMany');

    done();
  });

  it(`can generate an invoice`, function (done) {

    // Setup

    const account = Account.forge({ id: Uuid.v4(), addressId: Uuid.v4() });
    const order = Order.forge({ id: Uuid.v4() });
    const collection = OrderCollection.forge();
    const orderItems = [
      collection.makeOrderItem({
        orderId: order.get('id'),
        amount: 1,
        currency: 'usd',
        quantity: 1,
      }),
      collection.makeOrderItem({
        orderId: order.get('id'),
        amount: 2,
        currency: 'usd',
        quantity: 2,
      }),
      collection.makeOrderItem({
        orderId: order.get('id'),
        amount: 1,
        currency: 'blk',
        quantity: 3,
      }),
    ];

    order.related('orderItems').add(orderItems);
    order.relations.account = account;

    // Test

    const invoice = order.toInvoice();

    const orderTotal = order.get('total');
    expect(invoice.get('accountId')).to.equal(account.get('id'));
    expect(invoice.get('addressId')).to.equal(account.get('addressId'));
    expect(invoice.get('subtotal').blk).to.equal(orderTotal.blk);
    expect(invoice.get('subtotal').usd).to.equal(orderTotal.usd);
    expect(invoice.get('total').blk).to.equal(orderTotal.blk);
    expect(invoice.get('total').usd).to.equal(orderTotal.usd);
    expect(invoice.get('amountDue').blk).to.equal(orderTotal.blk);
    expect(invoice.get('amountDue').usd).to.equal(orderTotal.usd);
    expect(invoice.get('paid')).to.equal(false);
    expect(invoice.get('closed')).to.equal(false);
    expect(invoice.get('attempted')).to.equal(false);
    expect(invoice.get('attemptCount')).to.equal(0);

    expect(invoice.related('invoiceItems')).to.be.length(3);

    done();
  });

});

