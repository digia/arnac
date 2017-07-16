import _ from 'lodash';
import Uuid from 'node-uuid';
import { Address } from '../../../src/address/models';
import { Account } from '../../../src/account/models';
import { Block } from '../../../src/block/models';
import { Payment } from '../../../src/payment/models';
import { Invoice } from '../../../src/invoice/models';
import { InvoiceCollection } from '../../../src/invoice/collections';
import {
  InvoicePaymentRelationshipError,
  InvoicePaymentCurrencyError,
  InvoiceItemRelationshipError,
} from '../../../src/invoice/errors';
import { ModelRelationshipError } from '../../../src/foundation/errors';


describe('Invoice Model', function () {

  it(`instantiates`, function (done) {

    const invoice = Invoice.forge();

    expect(invoice).to.exist();

    done();
  });

  it(`can generate it's subtotal`, function (done) {

    const invoice = Invoice.forge({ id: Uuid.v4() });
    const collection = InvoiceCollection.forge();
    const invoiceItemAttrs = {
      amount: 1,
      currency: 'blk',
      quantity: 3,
      invoiceId: invoice.get('id'),
    };
    const invoiceItem = collection.makeInvoiceItem(invoiceItemAttrs);
    const invoiceItem2 = collection.makeInvoiceItem(invoiceItemAttrs);

    invoice.related('invoiceItems').add([ invoiceItem, invoiceItem2 ]);

    // Test

    const subtotal = invoice.get('subtotal');

    expect(subtotal).to.be.an.object();
    expect(subtotal.blk).to.equal(6);

    done();
  });

  it(`can generate it's subtotal without any invoice items`, function (done) {

    const invoice = Invoice.forge();

    const subtotal = invoice.get('subtotal');

    expect(subtotal).to.be.an.object();
    expect(subtotal.blk).to.be.undefined();
    expect(subtotal.usd).to.be.undefined();

    done();
  });

  it(`can generate it's total without any invoice items`, function (done) {

    const invoice = Invoice.forge();

    const total = invoice.get('total');

    expect(total).to.be.an.object();
    expect(total.blk).to.be.undefined();
    expect(total.usd).to.be.undefined();

    done();
  });

  it(`can generate it's amountDue`, function (done) {

    const invoice = Invoice.forge({ id: Uuid.v4() });
    const collection = InvoiceCollection.forge();
    const invoiceItemAttrs = {
      amount: 1,
      currency: 'blk',
      quantity: 3,
      invoiceId: invoice.get('id'),
    };
    const invoiceItem = collection.makeInvoiceItem(invoiceItemAttrs);

    invoice.related('invoiceItems').add(invoiceItem);

    // Test

    const amountDue = invoice.get('amountDue');

    expect(amountDue).to.be.an.object();
    expect(amountDue.blk).to.equal(3);

    done();
  });

  it(`can generate it's an amount due without any invoice items`, function (done) {

    const invoice = Invoice.forge();

    const amountDue = invoice.get('amountDue');

    expect(amountDue).to.be.an.object();
    expect(amountDue.blk).to.be.undefined();
    expect(amountDue.usd).to.be.undefined();

    done();
  });

  it(`can apply a payment to itself`, function (done) {

    const invoiceId = Uuid.v4();
    const collection = InvoiceCollection.forge();
    const invoice = Invoice.forge({
      id: invoiceId,
    });
    const invoiceItemAttrs = {
      amount: 30 * 100,
      currency: 'usd',
      quantity: 3,
      invoiceId,
    };
    const invoiceItem = collection.makeInvoiceItem(invoiceItemAttrs);
    const invoiceItem2 = collection.makeInvoiceItem(invoiceItemAttrs);

    invoice.related('invoiceItems').add([ invoiceItem, invoiceItem2 ]);

    const payment = Payment.forge({
      id: Uuid.v4(),
      amount: invoice.get('amountDue').usd,
      currency: 'usd',
      invoiceId,
    });


    // Test

    const paidInvoice = invoice.applyPayment(payment);

    expect(paidInvoice.get('paid')).to.be.true();
    expect(paidInvoice.get('closed')).to.be.true();
    expect(paidInvoice.get('attempted')).to.be.true();
    expect(paidInvoice.get('attemptCount')).to.be.equal(1);

    done();
  });

  it(`can apply a partial payment to itself`, function (done) {

    const invoiceId = Uuid.v4();
    const collection = InvoiceCollection.forge();
    const invoice = Invoice.forge(_.merge({ id: invoiceId }, Invoice.forge().defaults));
    const invoiceItemAttrs = {
      amount: 30 * 100,
      currency: 'usd',
      quantity: 3,
      invoiceId,
    };
    const invoiceItem = collection.makeInvoiceItem(invoiceItemAttrs);
    const invoiceItem2 = collection.makeInvoiceItem(invoiceItemAttrs);

    invoice.related('invoiceItems').add([ invoiceItem, invoiceItem2 ]);

    const payment = Payment.forge({
      id: Uuid.v4(),
      amount: invoice.get('amountDue').usd / 2,
      currency: 'usd',
      invoiceId: invoiceId,
    });


    // Test

    const paidInvoice = invoice.applyPayment(payment);

    expect(paidInvoice.get('paid')).to.be.false();
    expect(paidInvoice.get('closed')).to.be.false();
    expect(paidInvoice.get('attempted')).to.be.true();
    expect(paidInvoice.get('attemptCount')).to.be.equal(1);

    done();
  });

  it(`can apply a partial payment by only paying one of the multiple currencies due`, function (done) {

    const invoiceId = Uuid.v4();
    const collection = InvoiceCollection.forge();
    const invoice = Invoice.forge(_.merge({ id: invoiceId }, Invoice.forge().defaults));
    const usdAttrs = {
      amount: 30 * 100,
      currency: 'usd',
      quantity: 3,
      invoiceId,
    };
    const blkAttrs = {
      amount: 1,
      currency: 'blk',
      quantity: 3,
      invoiceId,
    };
    const invoiceItem = collection.makeInvoiceItem(usdAttrs);
    const invoiceItem2 = collection.makeInvoiceItem(blkAttrs);

    invoice.related('invoiceItems').add([ invoiceItem, invoiceItem2 ]);

    const payment = Payment.forge({
      id: Uuid.v4(),
      amount: 3,
      currency: 'blk',
      invoiceId: invoiceId,
    });


    // Test

    const paidInvoice = invoice.applyPayment(payment);

    expect(paidInvoice.get('amountDue').blk).to.equal(0);
    expect(paidInvoice.get('amountDue').usd).to.equal(9000);
    expect(paidInvoice.get('paid')).to.be.false();
    expect(paidInvoice.get('closed')).to.be.false();
    expect(paidInvoice.get('attempted')).to.be.true();
    expect(paidInvoice.get('attemptCount')).to.be.equal(1);

    done();
  });

  it(`throws InvoicePaymentRelationshipError when payment does not belong to invoice`, function (done) {

    const invoiceId = Uuid.v4();
    const collection = InvoiceCollection.forge();
    const invoice = Invoice.forge(_.merge({ id: invoiceId }, Invoice.forge().defaults));
    const invoiceItemAttrs = {
      amount: 30 * 100,
      currency: 'usd',
      quantity: 3,
      invoiceId: invoice.get('id'),
    };
    const invoiceItem = collection.makeInvoiceItem(invoiceItemAttrs);

    invoice.related('invoiceItems').add(invoiceItem);

    const payment = Payment.forge({
      id: Uuid.v4(),
      amount: invoice.get('amountDue').usd / 2,
      currency: 'usd',
      invoiceId: 1,
    });


    // Test

    function throws() {
      invoice.applyPayment(payment);
    }

    expect(throws).to.throw(InvoicePaymentRelationshipError);

    done();
  });

  it(`throws InvoiceItemRelationshipError when invoice items dont exist`, function (done) {

    const invoiceId = Uuid.v4();
    const collection = InvoiceCollection.forge();
    const invoice = Invoice.forge(_.merge({ id: invoiceId }, Invoice.forge().defaults));

    const payment = Payment.forge({
      id: Uuid.v4(),
      amount: 1,
      currency: 'blk',
      invoiceId,
    });


    // Test

    function throws() {
      invoice.applyPayment(payment);
    }

    expect(throws).to.throw(InvoiceItemRelationshipError);

    done();
  });

  it(`throws InvoicePaymentCurrencyError when payment is in an currency not on the invoice`, function (done) {

    const invoiceId = Uuid.v4();
    const collection = InvoiceCollection.forge();
    const invoice = Invoice.forge(_.merge({ id: invoiceId }, Invoice.forge().defaults));
    const invoiceItemAttrs = {
      amount: 30 * 100,
      currency: 'usd',
      quantity: 3,
      invoiceId,
    };
    const invoiceItem = collection.makeInvoiceItem(invoiceItemAttrs);

    invoice.related('invoiceItems').add(invoiceItem);

    const payment = Payment.forge({
      id: Uuid.v4(),
      amount: 1,
      currency: 'blk',
      invoiceId,
    });


    // Test

    function throws() {
      invoice.applyPayment(payment);
    }

    expect(throws).to.throw(InvoicePaymentCurrencyError);

    done();
  });

  it(`belongs to an account`, function (done) {

    const invoice = Invoice.forge();

    expect(invoice.account().relatedData.type).to.equal('belongsTo');

    done();
  });

  it(`can have invoice items`, function (done) {

    const invoice = Invoice.forge();

    expect(invoice.invoiceItems().relatedData.type).to.equal('morphMany');

    done();
  });

  it(`it belongs to an address`, function (done) {

    const invoice = Invoice.forge();

    expect(invoice.address().relatedData.type).to.equal('belongsTo');

    done();
  });

});

