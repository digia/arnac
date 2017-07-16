import {
  defaults as Defaults,
  pick as Pick,
} from 'lodash';
import { DatabaseRelationError, InputError } from '../foundation/errors';
import CollectionFactory from '../foundation/collection-factory';
import { Address } from './models';


export const AddressCollection = CollectionFactory(Address, {

  updateOrCreate(address, attributes, options = {}) {
    const withRelated = ['accounts', 'invoices'];
    const opts = Defaults({ withRelated }, options);

    if (!address || !address.get('id')) {
      return this.create(attributes);
    }

    return address.refresh(opts)
    .then(() => {
      const accounts = address.related('accounts');
      const invoices = address.related('invoices');

      address.set(attributes);

      if (!address.hasChanged()) {
        return address;
      }

      // Exclude the 1 account it should be attached to
      if (accounts.length > 1 || invoices.length) {
        // Create a new address instead
        return this.create(address.omit(['id', 'createdAt', 'updatedAt']), opts);
      }

      return address.update(attributes, opts);
    });
  },

  create(attrs, options) {
    const opts = options;
    const requiredAttrs = ['organization', 'street', 'city', 'state', 'zipcode', 'country'];

    if (requiredAttrs.length !== Object.keys(Pick(attrs, requiredAttrs)).length) {
      const msg = requiredAttrs.join(', ') + ' are required to create an address.';
      return Promise.reject(new InputError(msg));
    }

    return Address.forge().create(attrs, opts);
  },

  delete(address, options = {}) {
    const withRelated = ['accounts', 'invoices'];
    const opts = Defaults({ require: true, withRelated }, options);

    return address.fetch(opts)
    .then(() => {
      const accounts = address.related('accounts');
      const invoices = address.related('invoices');

      // Exclude the 1 account it should be attached to
      if (accounts.length > 1 || invoices.length) {
        // Attached to another resource, do not delete.
        throw new DatabaseRelationError;
      }

      return address.destroy(opts);
    });
  },
});
