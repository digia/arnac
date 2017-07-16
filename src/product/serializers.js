import Serializer, {
  Registry,
  Relationships,
} from 'jaysonapi';


export const Plan = Serializer('plan', {
  attributes: [
    'name', 'interval', 'intervalAcount', 'frequency', 'total',
    'createdAt', 'updatedAt', 'deletedAt',
  ],
  relationships: {
    subscription: {
      serializer: 'Subscription',
      relationshipType: Relationships.hasMany('planId'),
    },
    planItem: {
      serializer: 'PlanItem',
      relationshipType: Relationships.hasMany('lineableId'),
    },
  },
});

export const PlanItem = Serializer('plan-item', {
  attributes: [
    'amount', 'currency', 'quantity', 'description',
    'createdAt', 'updatedAt',
  ],
  relationships: {
    plan: {
      serializer: 'Plan',
      relationshipType: Relationships.belongsTo('lineableId'),
    },
  },
});

export const Sku = Serializer('sku', {
  attributes: [
    'sku', 'name', 'description', 'price', 'currency',
    'createdAt', 'updatedAt', 'deletedAt'
  ],
  relationships: {
    orderItem: {
      serializer: 'OrderItem',
      relationshipType: Relationships.hasMany('skuId'),
    },
  },
});

Registry.register('Plan', Plan);
Registry.register('PlanItem', PlanItem);
Registry.register('Sku', Sku);
