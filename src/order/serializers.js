import Serializer, {
  Registry,
  Relationships,
} from 'jaysonapi';


export const Order = Serializer('order', {
  attributes: [
    'state', 'status', 'note', 'total',
    'createdAt', 'updatedAt', 'deletedAt',
  ],
  relationships: {
    account: {
      serializer: 'Account',
      relationshipType: Relationships.belongsTo('accountId'),
    },
    'order-item': {
      serializer: 'OrderItem',
      relationshipType: Relationships.hasMany('lineableId'),
    },
    request: {
      serializer: 'Request',
      relationshipType: Relationships.belongsTo('requestId'),
    },
    invoice: {
      serializer: 'Invoice',
      relationshipType: Relationships.hasMany('orderId'),
    },
  },
});

export const OrderItem = Serializer('order-item', {
  attributes: [
    'amount', 'currency', 'quantity', 'description',
    'createdAt', 'updatedAt',
  ],
  relationships: {
    order: {
      serializer: 'Order',
      relationshipType: Relationships.belongsTo('lineableId'),
    },
    sku: {
      serializer: 'Sku',
      relationshipType: Relationships.belongsTo('skuId'),
    },
  }
});

Registry.register('Order', Order);
Registry.register('OrderItem', OrderItem);
