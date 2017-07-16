import Serializer, {
  Registry,
} from 'jaysonapi';


export const Registration = Serializer('registration', {
  attributes: [
    'organization', 'phone', 'email', 'fname', 'lname', 'street', 'street2',
    'city', 'state', 'zipcode', 'country',
    'createdAt', 'updatedAt', 'deletedAt',
  ],
});


Registry.register('Registration', Registration);
