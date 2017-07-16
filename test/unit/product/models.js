import { Order, OrderItem } from '../../../src/order/models';
import { Product, Sku, LineItem } from '../../../src/product/models';


describe('LineItem Model', function () {

  it(`instantiates`, function (done) {

    const lineItem = LineItem.forge();

    expect(lineItem).to.exist();

    done();
  });

  it(`can belong to a sku`, function (done) {

    const lineItem = LineItem.forge();

    expect(lineItem.sku().relatedData.type).to.equal('belongsTo');

    done();
  });

  it(`can duplicate itself and replace the poly attributes`, function (done) {

    const lineItem = LineItem.forge({ lineableId: 2, lineableType: 'invoice' });

    const duplicated = lineItem.duplicate(1, 'order');

    expect(duplicated.get('lineableId')).to.equal(1);
    expect(duplicated.get('lineableType')).to.equal('order');
    expect(duplicated.isNew()).to.be.true();

    done();
  });

  it(`can calculate it's total`, function (done) {

    const attrs = {
      amount: 30 * 100,
      quantity: 3,
    };
    const lineItem = LineItem.forge(attrs);

    expect(lineItem.get('total')).to.equal(attrs.quantity * attrs.amount);

    const attrsHalfQuantity = {
      amount: 30 * 100,
      quantity: 0.5,
    };
    const lineItemHalfQuantity = LineItem.forge(attrsHalfQuantity);

    expect(lineItemHalfQuantity.get('total')).to.equal(
      attrsHalfQuantity.quantity * attrsHalfQuantity.amount
    );

    done();
  });

});


describe('Product Model', function () {

  it(`instantiates`, function (done) {

    const product = Product.forge();

    expect(product).to.exist();

    done();
  });

  it(`has skus`, function (done) {

    const product = Product.forge();

    expect(product.skus().relatedData.type).to.equal('hasMany');

    done();
  });

});


describe('Sku Model', function () {

  it(`instantiates`, function (done) {

    const sku = Sku.forge();

    expect(sku).to.exist();

    done();
  });

  it(`belongs to a product`, function (done) {

    const sku = Sku.forge();

    expect(sku.product().relatedData.type).to.equal('belongsTo');

    done();
  });

  it(`has many line items`, function (done) {

    const sku = Sku.forge();

    expect(sku.lineItems().relatedData.type).to.equal('morphMany');

    done();
  });

});

