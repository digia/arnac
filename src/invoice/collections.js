import CollectionFactory from '../foundation/collection-factory';
import { Invoice } from './models.js';
import { LineItem } from '../product/models';


export const InvoiceCollection = CollectionFactory(Invoice, {

  makeInvoiceItem(data) {
    const {
      amount, currency, quantity, description, invoiceId, skuId, id,
    } = data;

    if (!invoiceId) {
      throw new TypeError(`invoiceId is required to create a invoice item`);
    }

    const attributes = {
      lineableType: 'invoice',
      lineableId: invoiceId,
      amount,
      currency,
      quantity,
      description,
    };

    if (id) {
      attributes.id = id;
    }

    if (skuId) {
      attributes.skuId = skuId;
    }

    return LineItem.forge(attributes);
  },
});

export const InvoiceItemCollection = CollectionFactory(LineItem);
