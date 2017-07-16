/* eslint-disable no-shadow */
/* eslint-disable no-param-reassign */
/* eslint-disable func-names */
import {
  reduce as Reduce,
  isNull as IsNull,
  snakeCase as SnakeCase,
  camelCase as CamelCase,
} from 'lodash';
import Moment from 'moment';
import Joi from 'joi';
import Knex from 'knex';
import Config from 'config';
import Bookshelf from 'bookshelf';
import BookshelfScopes from 'bookshelf-scopes';


// Boot the database
const bookshelf = Bookshelf(Knex(Config.get('database')));

// Parse & Formatting

function camelCase(bookshelf) {
  bookshelf.Model = bookshelf.Model.extend({

    format(attrs) {
      return Reduce(attrs, (memo, val, key) => {
        memo[SnakeCase(key)] = val;
        return memo;
      }, {});
    },

    parse(attrs) {
      return Reduce(attrs, (memo, val, key) => {
        memo[CamelCase(key)] = val;
        return memo;
      }, {});
    },
  });
}


// Add a orderBy convince method on the model

function orderBy(bookshelf) {
  bookshelf.Model = bookshelf.Model.extend({

    orderBy(column, order = 'ASC') {
      return this.query(function (qb) {
        qb.orderBy(SnakeCase(column), order);
      });
    },
  });
}


// Soft delete
// https://github.com/lanetix/node-bookshelf-soft-delete

function softDelete(bookshelf) {
  const softField = 'deleted_at';
  const mProto = bookshelf.Model.prototype;
  const cProto = bookshelf.Collection.prototype;

  function shouldDisable(opts) {
    return opts && opts.hasOwnProperty('softDelete') && !opts.softDelete;
  }

  function addDeletionCheck(syncable) {
    // Why can this syncable use where, and expiration has to use query?!?
    syncable.where(softField, null);

    // syncable.query(function (qb) {
    //   qb.whereNull(softField);
    // });
  }

  bookshelf.Model = bookshelf.Model.extend({

    soft: false,

    fetch(opts) {
      if (this.soft && !shouldDisable(opts)) {
        addDeletionCheck(this);
      }

      return mProto.fetch.apply(this, arguments);
    },

    fetchAll(opts) {
      if (this.soft && !shouldDisable(opts)) {
        addDeletionCheck(this);
      }

      return mProto.fetchAll.apply(this, arguments);
    },

    restore() {
      if (this.soft) {
        const fieldName = CamelCase(softField);

        if (this.get(fieldName)) {
          this.set(fieldName, null);

          return this.save();
        }
      } else {
        throw new TypeError(`restore cannont be used if the model does not have
        soft delete enabled`);
      }
    },

    destroy(opts) {
      if (this.soft && !shouldDisable(opts)) {
        this.set(softField, new Date());

        return this.save()
        .tap((model) => model.triggerThen('destroying', model, opts))
        .then((model) => model.triggerThen('destroyed', model, undefined, opts));
      }

      return mProto.destroy.apply(this, arguments);
    },

    isDeleted() {
      if (!this.soft) {
        throw Error('Model does not soft delete.');
      }

      return !IsNull(this.get('deletedAt'));
    },
  });

  bookshelf.Collection = bookshelf.Collection.extend({

    fetch(opts) {
      const isSoft = (new this.model()).soft;

      if (isSoft && !shouldDisable(opts)) {
        addDeletionCheck(this);
      }

      return cProto.fetch.apply(this, arguments);
    },

    count(field, opts) {
      opts = opts || field;
      const isSoft = (new this.model()).soft;

      if (isSoft && !shouldDisable(opts)) {
        addDeletionCheck(this);
      }

      return cProto.count.apply(this, arguments);
    },
  });
}


// Expiration
//
// NOTE(digia): This doesn't allow for customization. Refactor later if that is
// needed. Only used for blocks at this time.
function expirations(bookshelf) {
  const expirationField = 'created_at';
  const expirationLimit = Config.get('blocks.daysAlive');
  const mProto = bookshelf.Model.prototype;
  const cProto = bookshelf.Collection.prototype;

  function excludeExpiration(opts) {
    return opts && opts.hasOwnProperty('expiration') && !opts.expiration;
  }

  function addExpirationCheck(syncable) {
    const expirationDateLimit = Moment().subtract(expirationLimit, 'days');

    syncable.where(expirationField, '>', expirationDateLimit);
    // Why does this syncable have to use query, where delete can use where?!
    // syncable.query(function (qb) {
    //   qb.where(expirationField, '>', expirationDateLimit);
    // });
  }

  bookshelf.Model = bookshelf.Model.extend({

    expires: false,

    fetch(opts) {
      if (this.expires && !excludeExpiration(opts)) {
        addExpirationCheck(this);
      }

      return mProto.fetch.apply(this, arguments);
    },

    fetchAll(opts) {
      if (this.expires && !excludeExpiration(opts)) {
        addExpirationCheck(this);
      }

      return mProto.fetchAll.apply(this, arguments);
    },
  });

  bookshelf.Collection = bookshelf.Collection.extend({
    fetch(opts) {
      const doesExpire = (new this.model()).expires;

      if (doesExpire && !excludeExpiration(opts)) {
        addExpirationCheck(this);
      }

      return cProto.fetch.apply(this, arguments);
    },
  });
}


// Validation

function validation(bookshelf) { // eslint-disable-line
  const mProto = bookshelf.Model.prototype;

  const protoConfig = {

    // Use Joi syntax for rules
    rules: {},

    // Joi validation error when set
    error: null,

    constructor() {
      mProto.constructor.apply(this, arguments);

      this.on('creating', () => {
        if (!this.validate(true)) throw self.error;
      });

      this.on('updating', () => {
        if (!this.validate()) throw self.error;
      });
    },

    // Required = true for insert, false for update
    validate(required) {
      const options = {
        abortEarly: false,
        allowUnknown: true,
        skipRequired: required ? true : false,
      };

      const result = Joi.validate(
        this.attributes,
        this.rules,
        options
      );

      this.error = result.error;

      return IsNull(result.error) ? true : false;
    },

    fill(attributes) {
      const safeAttributes = Reduce(attributes, (result, value, key) => {
        if (this.rules.hasOwnProperty(key)) {
          result[key] = value;
        }

        return result;
      }, {});

      return this.set(safeAttributes);
    },
  };

  const classConfig = {
    fill(attributes) {
      return this.forge().fill(attributes);
    },
  };

  bookshelf.Model = bookshelf.Model.extend(protoConfig, classConfig);
}

bookshelf.plugin('virtuals');
bookshelf.plugin('visibility');
bookshelf.plugin('registry');
bookshelf.plugin(BookshelfScopes);
bookshelf.plugin(softDelete);
bookshelf.plugin(expirations);
bookshelf.plugin(orderBy);
bookshelf.plugin(camelCase);
// bookshelf.plugin(validation);


export default bookshelf;
