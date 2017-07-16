import _ from 'lodash';
import LineItemCalculator from '../../../src/product/line-item-calculator';


const makeItem = function (currency='usd')
{
  return {
    amount: _.random(1, 99),
    quantity: _.random(1, 99),
    currency,
  };
}

describe('LineItemCalculator', function () {

  it(`instantiates`, function (done) {

    const calculator = LineItemCalculator();

    expect(calculator).to.exist();

    done();
  });

  describe('#subtotalFor', function () {

    it(`calculates returns 0 when the currency doesn't exist`, function (done) {

      const itemList = [ makeItem(), makeItem() ];

      const calculator = LineItemCalculator(itemList);

      // Test

      const subtotal = calculator.subtotalFor('blk');

      expect(subtotal).to.equal(0);

      done();
    });

    it(`calculates the subtotal for a specific currency`, function (done) {

      const itemList = [ makeItem(), makeItem(), makeItem('blk'), ];
      const usdItemList = itemList.slice(0, 2);
      const usdItemSubtotal = _.reduce(usdItemList, (total, item) => total + (item.amount * item.quantity), 0);

      const calculator = LineItemCalculator(itemList);

      // Test

      const subtotal = calculator.subtotalFor('usd');

      expect(subtotal).to.equal(usdItemSubtotal);

      done();
    });

  }); // End subtotalFor

  describe('#subtotal', function () {

    it(`returns an empty object when subtotal is empty`, function (done) {

      const calculator = LineItemCalculator([]);

      // Test

      const subtotal = calculator.subtotal();

      expect(subtotal).to.be.an.object();
      expect(_.isEmpty(subtotal)).to.be.true();

      done();
    });


    it(`calculates the subtotal for each currency`, function (done) {

      const itemList = [ makeItem(), makeItem(), makeItem('blk'), ];
      const usdItemList = itemList.slice(0, 2);
      const usdItemSubtotal = _.reduce(usdItemList, (total, item) => total + (item.amount * item.quantity), 0);
      const blkItemSubtotal = itemList[2].amount * itemList[2].quantity;

      const calculator = LineItemCalculator(itemList);

      // Test

      const subtotal = calculator.subtotal();

      expect(subtotal.usd).to.equal(usdItemSubtotal);
      expect(subtotal.blk).to.equal(blkItemSubtotal);

      done();
    });

  }); // End subtotal

});
