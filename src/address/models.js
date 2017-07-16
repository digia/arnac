import Joi from 'joi';
import ModelFactory from '../foundation/model-factory';
import Db from '../database';
import Country from './country';
import { InputError } from '../foundation/errors';


/**
 * Notes:
 * The idea behind having addresses as their own table is mainly for record
 * keeping. If an account updates their address which is not attached
 * to any invoices, etc. then we'll simply update the current address. However
 * if an account updates their address and that address is attached to an
 * invoice, etc. a new address should be made. Leaving the previous address
 * for records.
 *
 * - organization and phone properties are essentially a snap shot of the
 *   account's properties at the time of creation.
 *
 */

export const Address = ModelFactory('address', {

  hasTimestamps: ['createdAt', 'updatedAt'],

  rules: {
    // Snap shot of the organization name set on the account
    organization: Joi.string().required(), // Snapshot
    phone: Joi.string(), // Snapshot
    street: Joi.string().required(),
    street2: Joi.string(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipcode: Joi.string().required(),
    country: Joi.string().required(), // ISO2 format
  },

  initialize() {
    this.on('saving', this.handleSavingCountryAndState, this);
  },

  toJSON(options = {}) {
    const opts = options;
    const country = Country();
    const json = Db.Model.prototype.toJSON.call(this, opts);
    const cn = json.country;
    const st = json.state;

    if (cn && cn.length === 2) {
      const countryName = country.name(cn);

      if (countryName) {
        json.country = countryName;
      }
    }

    if (st && cn && cn.length === 2 && cn.length === 2) {
      const stateName = country.stateName(cn, st);

      if (stateName) {
        json.state = stateName;
      }
    }

    return json;
  },

  accounts() {
    return this.hasMany('Account');
  },

  invoices() {
    return this.hasMany('Invoice');
  },

  handleSavingCountryISO(model) {
    const prop = model.get('country');

    // Force country being set
    if (!prop) {
      return Promise.reject(new InputError('Country is required.'));
    }

    return new Promise((resolve, reject) => {
      const pl = prop.length;
      const country = Country();

      // Assume it's ISO3 for the country
      if (pl === 3) {
        try {
          const name = country.name(prop, 'ISO3');
          model.set('country', country.isoCode(name));
        } catch (e) {
          reject(e);
          return;
        }
      }

      // Assume it's the countrys name
      if (pl > 3) {
        try {
          model.set('country', country.isoCode(prop));
        } catch (e) {
          reject(e);
          return;
        }
      }

      resolve(true);
    });
  },

  // NOTE(digia): Only attempt to set the state Iso if Country returns a state
  // name. Because states are typically "typed", where country is typically
  // a "dropdown" we'll allow - for backend time sake - a misspelled state
  // name.
  handleSavingStateISO(model) {
    const cntry = model.get('country');
    const prop = model.get('state');

    // Force country being set
    if (!cntry) {
      return Promise.reject(new InputError('Country is required for state iso.'));
    }

    // Initate the chain if country is set, but longer than 2 characters
    if (cntry.length > 2) {
      return model.handleSavingCountryISO(model)
      .then(() => {
        return model.handleSavingStateISO(model);
      });
    }

    return new Promise((resolve, reject) => {
      // Force state being set
      if (!prop) {
        reject(new InputError('State is required.'));
        return;
      }

      // Enforce a all caps ISO
      if (prop.length === 2) {
        model.set('state', prop.toUpperCase());
      }

      // Assume it's the states name
      if (prop.length > 2) {
        const iso = Country().stateISO(cntry, prop);

        if (iso) {
          model.set('state', iso);
        }
      }

      resolve(true);
    });
  },

  handleSavingCountryAndState(model) {
    return model.handleSavingCountryISO(model)
    .then(() => {
      return model.handleSavingStateISO(model);
    });
  },
});

Db.model('Address', Address);
