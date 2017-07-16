import _ from 'lodash';
import InvoiceCalculator from '../../../src/invoice/invoice-calculator';


const makeItem = function (currency='usd')
{
  return {
    amount: _.random(1, 99),
    quantity: _.random(1, 99),
    currency,
  };
}

/**
 * Note: subtotalFor, subtotal is tested on the line-item calculator
 */
describe('InvoiceCalculator', function () {

  it(`instantiates`, function (done) {

    const calculator = InvoiceCalculator();

    expect(calculator).to.exist();

    done();
  });

  describe('#totalFor', function () {
  }); // End totalFor

  describe('#total', function () {
  }); // End total

  describe('#amountDueFor', function () {

    it(`calculates the amount due for a specific currency`, function (done) {

      const itemList = [
        {
          amount: 1,
          quantity: 3,
          currency: 'blk',
        },
      ];
      const paymentList = [
        {
          amount: 1,
          currency: 'blk',
        },
      ];

      const calculator = InvoiceCalculator(itemList);

      // Test

      const amountDue = calculator.amountDueFor('blk', paymentList);

      expect(amountDue).to.equal(2);

      done();
    });

    it(`calculates the amount due for a specific currency when no payments have been made`, function (done) {

      const itemList = [ makeItem(), makeItem(), makeItem('blk'), ];
      const blkItemSubtotal = itemList[2].amount * itemList[2].quantity;
      const paymentList = [];

      const calculator = InvoiceCalculator(itemList);

      // Test

      const amountDue = calculator.amountDueFor('blk', paymentList);

      expect(amountDue).to.equal(blkItemSubtotal);

      done();
    });

    it(`calculates the amount due for a specific currency when nothing is due`, function (done) {

      const itemList = [];
      const paymentList = [];

      const calculator = InvoiceCalculator(itemList);

      // Test

      const amountDue = calculator.amountDueFor('blk', paymentList);

      expect(amountDue).to.equal(0);

      done();
    });

    it(`returns 0 amount due when payments are more than subtotal`, function (done) {

      const itemList = [
        {
          amount: 1,
          quantity: 3,
          currency: 'blk',
        },
      ];
      const paymentList = [
        {
          amount: 4,
          currency: 'blk',
        },
      ];

      const calculator = InvoiceCalculator(itemList);

      // Test

      const amountDue = calculator.amountDueFor('blk', paymentList);

      expect(amountDue).to.equal(0);

      done();
    });

  }); // End amountDueFor

  describe('#amountDue', function () {

    it(`calculates the amount due for each currency`, function (done) {

      const itemList = [
        {
          amount: 10,
          quantity: 3,
          currency: 'usd',
        },
        {
          amount: 1,
          quantity: 3,
          currency: 'blk',
        },
      ];
      const paymentList = [
        {
          amount: 1,
          currency: 'blk',
        },
      ];

      const calculator = InvoiceCalculator(itemList);

      // Test

      const amountDue = calculator.amountDue(paymentList);

      expect(amountDue.usd).to.equal(30);
      expect(amountDue.blk).to.equal(2);

      done();
    });

    it(`calculates the amount due for each currency, resulting in 0 if payments for a specific currency is more than the amount due`, function (done) {

      const itemList = [
        {
          amount: 10,
          quantity: 3,
          currency: 'usd',
        },
        {
          amount: 1,
          quantity: 3,
          currency: 'blk',
        },
      ];
      const paymentList = [
        {
          amount: 4,
          currency: 'blk',
        },
      ];

      const calculator = InvoiceCalculator(itemList);

      // Test

      const amountDue = calculator.amountDue(paymentList);

      expect(amountDue.usd).to.equal(30);
      expect(amountDue.blk).to.equal(0);

      done();
    });

    it(`returns an empty object when there are no items`, function (done) {

      const itemList = [];
      const paymentList = [];

      const calculator = InvoiceCalculator(itemList);

      // Test

      const amountDue = calculator.amountDue(paymentList);

      expect(amountDue).to.be.an.object();
      expect(_.isEmpty(amountDue)).to.be.true();

      done();
    });

    it(`returns the full total when no payments have been made`, function (done) {

      const itemList = [
        {
          amount: 10,
          quantity: 3,
          currency: 'usd',
        },
        {
          amount: 1,
          quantity: 3,
          currency: 'blk',
        },
      ];
      const paymentList = [];

      const calculator = InvoiceCalculator(itemList);

      // Test

      const amountDue = calculator.amountDue(paymentList);

      expect(amountDue.usd).to.equal(30);
      expect(amountDue.blk).to.equal(3);

      done();
    });

  }); // End amountDue

});
