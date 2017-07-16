import Serializer, {
  Registry,
  Relationships,
} from 'jaysonapi';


export const User = Serializer('user', {
  attributes: [
    'email', 'fname', 'lname',
    'createdAt', 'updatedAt', 'deletedAt',
  ],
  relationships: {
    account: {
      serializer: 'Account',
      relationshipType: Relationships.belongsTo('accountId'),
    },
  },
});

Registry.register('User', User);
