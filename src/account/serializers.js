import Serializer, {
  Registry,
  Relationships,
} from 'jaysonapi';


export const Account = Serializer('account', {
  attributes: [
    'organization', 'phone', 'street', 'street2', 'city', 'state',
    'zipcode', 'country', 'createdAt', 'updatedAt', 'deletedAt',
  ],
  relationships: {
    user: {
      serializer: 'User',
      relationshipType: Relationships.hasMany('accountId'),
    },
    property: {
      serializer: 'Property',
      relationshipType: Relationships.hasMany('accountId'),
    },
  },
});


export const AccountCard = Serializer('account-card', {
  attributes: [
    'last4', 'brand', 'expirationMonth', 'expirationYear', 'hasExpired',
    'createdAt',
  ],
  relationships: {
    account: {
      serializer: 'Account',
      relationshipType: Relationships.belongsTo('accountId'),
    },
  },
});

Registry.register('Account', Account);
Registry.register('AccountCard', AccountCard);
