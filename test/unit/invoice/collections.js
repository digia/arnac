import Uuid from 'node-uuid';
import { InvoiceCollection } from '../../../src/invoice/collections';


describe('Invoice Collection', function () {
  it(`instantiates`, function (done) {
    const collection = InvoiceCollection.forge();

    expect(collection).to.exist();

    done();
  });

  describe('#makeInvoiceItem', function () {
    it(`Makes an invoice item model`, function (done) {
      const attrs = {
        amount: 1,
        currency: 'blk',
        quantity: 3,
        invoiceId: Uuid.v4(),
        description: 'this is my invoice item',
        skuId: Uuid.v4(),
      };
      const invoiceItem = InvoiceCollection.forge().makeInvoiceItem(attrs);

      expect(invoiceItem).to.exist();
      expect(invoiceItem.get('id')).to.not.exist();
      expect(invoiceItem.get('lineableType')).to.equal('invoice');
      expect(invoiceItem.get('lineableId')).to.equal(attrs.invoiceId);
      expect(invoiceItem.get('amount')).to.equal(attrs.amount);
      expect(invoiceItem.get('currency')).to.equal(attrs.currency);
      expect(invoiceItem.get('quantity')).to.equal(attrs.quantity);
      expect(invoiceItem.get('description')).to.equal(attrs.description);
      expect(invoiceItem.get('skuId')).to.equal(attrs.skuId);

      done();
    });

    it(`Allows id to be passed in`, function (done) {
      const attrs = {
        id: Uuid.v4(),
        amount: 1,
        currency: 'blk',
        quantity: 3,
        invoiceId: Uuid.v4(),
      };
      const invoiceItem = InvoiceCollection.forge().makeInvoiceItem(attrs);

      expect(invoiceItem).to.exist();
      expect(invoiceItem.get('id')).to.equal(attrs.id);
      expect(invoiceItem.get('lineableType')).to.equal('invoice');
      expect(invoiceItem.get('lineableId')).to.equal(attrs.invoiceId);
      expect(invoiceItem.get('amount')).to.equal(attrs.amount);
      expect(invoiceItem.get('currency')).to.equal(attrs.currency);
      expect(invoiceItem.get('quantity')).to.equal(attrs.quantity);

      done();
    });
  });
});
