import Serializer, {
  Registry,
  Relationships,
} from 'jaysonapi';


// NOTE(digia): Request properties redacted
export const Request = Serializer('request', {
  attributes: [
    'state', 'subject', 'body',
    'createdAt', 'updatedAt', 'deletedAt',
  ],
  relationships: {
    account: {
      serializer: 'Account',
      relationshipType: Relationships.belongsTo('accountId'),
    },
    property: {
      serializer: 'Property',
      relationshipType: Relationships.hasMany('requestId'),
    },
    order: {
      serializer: 'Order',
      relationshipType: Relationships.hasMany('requestId'),
    },
    invoice: {
      serializer: 'Invoice',
      relationshipType: Relationships.hasMany('requestId'),
    },
    refund: {
      serializer: 'Refund',
      relationshipType: Relationships.hasMany('requestId'),
    },
    'request-comment': {
      serializer: 'RequestComment',
      relationshipType: Relationships.hasMany('commentableId'),
    },
  },
});

export const RequestComment = Serializer('request-comment', {
  attributes: [
    'message',
    'updatedAt', 'createdAt', 'deletedAt',
  ],
  relationships: {
    user: {
      serializer: 'User',
      relationshipType: Relationships.belongsTo('userId'),
    },
    request: {
      serializer: 'Request',
      relationshipType: Relationships.belongsTo('commentableId'),
    },
  },
});

Registry.register('Request', Request);
Registry.register('RequestComment', RequestComment);
