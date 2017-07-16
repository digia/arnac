import Serializer, {
  Registry,
  Relationships,
} from 'jaysonapi';


export const Property = Serializer('property', {
  attributes: [
    'name', 'url', 'createdAt', 'updatedAt', 'deletedAt',
  ],
  relationships: {
    account: {
      serializer: 'Account',
      relationshipType: Relationships.belongsTo('accountId'),
    },
    request: {
      serializer: 'Request',
      relationshipType: Relationships.hasMany('propertyId'),
    },
    propertyCredential: {
      serializer: 'PropertyCredential',
      relationship: Relationships.hasMany('propertyId'),
    },
  },
});

export const PropertyCredential = Serializer('property-credential', {
  attributes: [
    'type', 'identity', 'authentication',
    'createdAt', 'updatedAt',
  ],
  relationships: {
    property: {
      serializer: 'Property',
      relationshipType: Relationships.belongsTo('propertyId'),
    },
  },
});

Registry.register('Property', Property);
Registry.register('PropertyCredential', PropertyCredential);
