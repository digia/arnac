import Serializer, {
  Registry,
  Relationships,
} from 'jaysonapi';


export const Invoice = Serializer('invoice', {
  attributes: [
    'amountDue', 'total', 'subtotal', 'paid', 'closed',
    'attempted', 'attemptCount', 'note', 'organization', 'phone', 'street',
    'street2', 'city', 'state', 'zipcode', 'country',
    'createdAt', 'updatedAt', 'deletedAt',
  ],
  relationships: {
    'invoice-item': {
      serializer: 'InvoiceItem',
      relationshipType: Relationships.hasMany('lineableId'),
    },
    account: {
      serializer: 'Account',
      relationshipType: Relationships.belongsTo('accountId'),
    },
    payment: {
      serializer: 'Payment',
      relationshipType: Relationships.hasMany('invoiceId'),
    },
  },
});

export const InvoiceItem = Serializer('invoice-item', {
  attributes: [
    'amount', 'currency', 'quantity', 'description',
    'createdAt', 'updatedAt',
  ],
  relationships: {
    invoice: {
      serializer: Invoice,
      relationshipType: Relationships.belongsTo('lineableId'),
    },
    sku: {
      serializer: 'Sku',
      relationshipType: Relationships.belongsTo('skuId'),
    },
  },
});

Registry.register('Invoice', Invoice);
Registry.register('InvoiceItem', InvoiceItem);
