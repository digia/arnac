import Serializer, {
  Registry,
  Relationships,
} from 'jaysonapi';


export const Subscription = Serializer('subscription', {
  attributes: [
    'state', 'status', 'currentPeriodStart', 'currentPeriodEnd',
    'canceledAt', 'endedAt',
    'createdAt', 'updatedAt',
  ],
  relationships: {
    plan: {
      serializer: 'Plan',
      relationshipType: Relationships.belongsTo('planId'),
    },
    invoice: {
      serializer: 'Invoice',
      relationshipType: Relationships.hasMany('subscriptionId'),
    },
  },
});

Registry.register('Subscription', Subscription);
