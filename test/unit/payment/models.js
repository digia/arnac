import Uuid from 'node-uuid';
import { Account } from '../../../src/account/models';
import { Block } from '../../../src/block/models';
import { Payment } from '../../../src/payment/models';
import { Invoice } from '../../../src/invoice/models';


describe('Payment Model', function () {

  it(`instantiates`, function (done) {

    const payment = Payment.forge();

    expect(payment).to.exist();

    done();
  });

  it(`can create a refund`, function (done) {

    const paymentAttrs = {
      id: Uuid.v4(),
      method: 'Charge',
      amount: 30000,
      currency: 'usd',
      chargeId: 'ch_stripeid',
      chargeGateway: 'stripe',
      note: null,

    };
    const payment = Payment.forge(paymentAttrs);

    const refund = payment.toRefund();

    expect(refund.get('method')).to.undefined(); // Not set and model isn't refresh
    expect(refund.get('amount')).to.equal(paymentAttrs.amount);
    expect(refund.get('currency')).to.equal(paymentAttrs.currency);
    expect(refund.get('refundId')).to.undefined(); // Not set and model isn't refresh
    expect(refund.get('refundGateway')).to.undefined(); // Not set and model isn't refreshed
    expect(refund.get('paymentId')).to.equal(paymentAttrs.id);
    expect(refund.get('reason')).to.be.null();

    done();
  });

  it(`belongs to an invoice`, function (done) {

    const payment = Payment.forge();

    expect(payment.invoice().relatedData.type).to.equal('belongsTo');

    done();
  });

  it(`can have blocks`, function (done) {

    const payment = Payment.forge();

    expect(payment.blocks().relatedData.type).to.equal('hasMany');

    done();
  });

  it(`can have refunds`, function (done) {

    const payment = Payment.forge();

    expect(payment.refunds().relatedData.type).to.equal('hasMany');

    done();
  });

});

