import _ from 'lodash';
import Uuid from 'node-uuid';
import Cashier from '../../../src/payment/cashier';


describe('Invoice Cashier', function () {
  it(`instantiates`, function (done) {
    const cashier = Cashier({ stripe: {}, paymentCollection: {} });

    expect(cashier).to.exist();

    done();
  });

  describe('#payByCharge', function () {
    it(`pays the invoice by charge - stripe`, function (done) {

      const stripe = {
        charges: {
          create(attrs) {
            return Promise.resolve({ id: 1, amount: 3000, currency: 'usd' });
          },
        },
      };
      const paymentCollection = {
        model: {
          forge() {
            return {
              create(attrs) {
                return Promise.resolve('payment');
              },
            };
          },
        },
      };
      const invoice = {
        get() {
          return 1;
        },
        applyPayment() {
          return this;
        },
        save() {
          return Promise.resolve('invoice');
        },
      };
      const cashier = Cashier({ stripe, paymentCollection });


      // Test

      cashier.payByCharge(invoice, {})
      .then((payment) => {
        expect(payment).to.equal('payment');

        done();
      })
    });
  });

  describe('#payByBlock', function () {
    it(`pays the invoice by block`, function (done) {

      const stripe = {};
      const paymentCollection = {
        forge() {
          return this;
        },
        model: {
          forge() {
            return {
              get() {
                return 1;
              },
              create() {
                return Promise.resolve(this);
              },
            };
          },
        },
      };

      const blockCollection = {
        every() {
          return true;
        },
        invokeThen() {
          return Promise.resolve();
        },
      };

      const invoice = {
        get() {
          return 1;
        },
        applyPayment() {
          return this;
        },
        save() {
          return Promise.resolve();
        }
      };
      const cashier = Cashier({ stripe, paymentCollection });


      // Test

      cashier.payByBlock(invoice, {}, blockCollection)
      .then((payment) => {
        expect(payment.get()).to.equal(1);

        done();
      })
    });
  });
});
