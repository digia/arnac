import _ from 'lodash';
import Uuid from 'node-uuid';
import Async from 'async';
import Faker from 'faker';
import Config from 'config';
import Knex from 'knex';
import Authority from '../../src/auth/authority';
import Db from '../../src/database';
import Server from '../../index';
import { UUIDHasher } from '../../src/foundation/hashing'


const knex = Knex(Config.get('database'));
const hasher = UUIDHasher();

export const db = {
  knex: Db.knex,

  migrations: {

    rollback() {
      return knex.migrate.rollback();
    },

    migrate() {
      return knex.migrate.latest();
    },

    refresh() {
      return this.rollback().then(() => {
        return this.migrate();
      });
    }
  },

  fetch(table, id) {
    return Db.knex(table).where({ id }).first();
  },

  fetchAllIn(table, idList) {
    return Db.knex(table).whereIn('id', idList);
  },

  fetchWhere(table, column, value) {
    return Db.knex(table).where(column, value);
  },

  create(table, data, returning = 'id') {
    // NOTE(digia); Not sure this is the best call chain for this.
    // This works, but look into later.
    return Db.knex(table).returning(returning).insert(data).then((idList) => {
      if (1 == idList.length) {
        return this.fetch(table, idList[0]);
      }

      return this.fetchAllIn(table, idList);
    });
  },

  createList(table, count, data, returning = 'id')
  {
    // NOTE(digia); Not sure this is the best call chain for this.
    // This works, but look into later.
    return Db.knex(table).returning(returning).insert(data).then((idList) => {
      const query = Db.knex(table);

      if (1 == idList.length) {
        return query.where({ id: idList[0] }).first().then((result) => {

          return Promise.resolve(result);
        });
      }

      return query.whereIn('id', idList);
    });
  },

  update(table, id, data)
  {
    return Db.knex(table).where({ id }).update(data);
  },
};

export const config = Config;
export const server = Server;
export const authority = Authority;
export const uuidHasher = UUIDHasher;

const _authority = Authority();


// Helper functions

export const generateAuthHeaders = function (authToken) {
  return {
    Authorization: `Bearer ${authToken}`,
  };
}

export const structurePayload = function (type, attributes, relationships = null) {
  let id;

  if (!_.isString(type)) {
    id = type.id;
    type = type.type;
  }

  const payload = { data: { type, } };

  if (!_.isEmpty(attributes)) {
    payload.data.attributes = attributes;
  }

  if (id) {
    payload.data.id = id;
  }

  if (relationships) {
    payload.data.relationships = relationships;
  }

  return payload;
}

export const structureRelationshipPayload = function (type, idList, singlefy = true) {
  const payload = {};

  if (!_.isArray(idList)) {
    idList = [idList];
  }

  const data = (singlefy && idList.length === 1)
  ? { type, id: idList.pop() }
  : idList.map(id => ({ type, id}));

  payload[type] = { data };

  return payload;
}

export const generateTokens = function (ids, next) {
  const { accountId, userId } = ids;

  Authority().generateTokens({ accountId, userId }).then((tokens) => {
    next(null, tokens)
  })
  .catch(err => next(err));
}

export function generateAuthToken(payload) {
  return _authority.generateAuthToken(payload);
}

export function refreshDatabase() {
  return db.migrations.refresh();
}

export function createAccountAndUser(ids) {
  return createAccount({ id: ids.accountId })
    .then((account) => {
      return createUser({ id: ids.userId, account_id: ids.accountId })
        .then((user) => {
          return { account, user };
        });
    });
}

export const generateTokensAccount2 = function (next) {
  const payload = { accountId: 2, userId: 2 };

  Authority().generateTokens(payload).then((tokens) => next(null, tokens))
  .catch(err => next(err));
}

export const refreshDb = function (next) {
  return db.migrations.refresh()
    .then(() => {
      if (_.isFunction(next)) {
        next(null);
      }
    })
    .catch((err) => {
      if (_.isFunction(next)) {
        next(err)
        return;
      }

      throw err;
    });
}

export const seedDb = function (next) {
  db.knex.seed.run().then(() => next(null))
  .catch(err => next(err));
}


/**
 * Create an account
 *
 * @param data {object}
 * @param [next] {function}
 * @return promise
 */
export function createAccount(data = {}, next) {
  const payload = _.defaults(data, {
    organization: 'Test, LLC',
  });

  return db.create('account', payload)
    .then((account) => {
      if (_.isFunction(next)) {
        next(null, account);
      }

      return account;
    })
    .catch((err) =>  {
      if (_.isFunction(next)) {
        next(err);
      }

      throw err;
    });
}

/**
 * Create a user
 *
 * account_id is required within the data object.
 *
 * @param data {object}
 * @param [next] {function}
 * @return promise
 */
export function createUser(data, next) {
// export function createUser(id = null, accountId, next) {
  return _authority.generateHash('aaaaaa')
    .then((hash) => {
      const payload = _.defaults(data, {
        email: Faker.internet.email(),
        fname: Faker.name.firstName(),
        lname: Faker.name.lastName(),
        password_hash: hash,
      });

      return db.create('user', payload)
        .then((user) => {
          if (_.isFunction(next)) {
            next(null, user);
          }

          return user;
        });
      })
      .catch((err) => {
        if (_.isFunction(next)) {
          next(err);
        }

        throw err;
      });
};

/**
 * Create a request
 *
 * account_id is required within the data object.
 *
 * @param data {object}
 * @param [next] {function}
 * @return promise
 */
export function createRequest(data, next) {
  const attrs = _.defaults(data, {
    state: 0,
    subject: Faker.lorem.words(_.random(2,8)),
    body: Faker.lorem.paragraphs(_.random(1, 3)),
  });

  if (!attrs.previous_state) {
    attrs.previous_state = attrs.state
      ? attrs.state - 1
      : null;
  }

  return db.create('request', attrs)
    .then((request) => {
      if (_.isFunction(next)) {
        next(null, request);
      }

      return request;
    })
    .catch((err) => {
      if (_.isFunction(next)) {
        next(err);
      }

      throw err;
    });
}

/**
 * Create a comment
 *
 * Comments are polymorphic. Creator must provide a commentable_type and
 * commentable_id. Along with a user_id.
 *
 * @param data {object}
 * @return promise
 */
export function createComment(data) {
  const payload = _.defaults(data, {
    message: Faker.lorem.sentences(_.random(1, 5)),
  });

  return db.create('comment', payload);
}

export function createSku(data = {}) {
  const payload = _.defaults(data, {
    sku: Uuid().substr(0, 8).toUpperCase(),
    name: Faker.lorem.word(),
    price: _.random(1, 99),
    currency: ['BLK', 'USD'][_.random(0, 1)],
  });

  return db.create('sku', payload);
}

/**
 * Create a request comment
 *
 * request_id and user_id must be provided to create a RequestComment
 *
 * @param data {object}
 * @return promise
 */
export function createRequestComment(data) {
  const { message, user_id, request_id, deleted_at } = data;

  return createComment({
    commentable_type: 'request',
    commentable_id: request_id,
    user_id,
    message,
    deleted_at,
  });
}

export function createRegistration({ account = {}, user = {} } = {}) {
  return createAccount(account)
    .then((accountModel) => {
      return createUser({ ...user, account_id: accountModel.id })
        .then((userModel) => {
          return { account: accountModel, user: userModel };
        });
    });
}

export const createAccountUserDuo = function (ids, next) {
  createAccount({ id: ids.accountId }, (err, account) => {
    if (err) {
      next(err);
      return;
    }

    createUser({ id: ids.userId, account_id: ids.accountId }, (err, user) => {
      if (err) {
        next(err);
        return;
      }

      next(null, { account, user});
    });
  });
}

export function uuidList(limit = 1) {
  return Array.apply(null, Array(limit)).map(() => Uuid.v4());
}

/**
 * Create a line item
 *
 * @param data
 * @return promise
 */
export function createLineItem(data = {}) {
  return db.create('line_item', data);
}

/**
 * Create a property
 *
 * account_id is required within the data object.
 *
 * @param data {object}
 * @return promise
 */
export function createProperty(data = {}) {
  const payload = _.defaults(data, {
    name: Faker.lorem.words(_.random(1,3)),
    url: Faker.internet.url(),
  });

  return db.create('property', payload);
}


/**
 * Create a property request relationship
 *
 * @param property_id
 * @param request_id
 * @return promise
 */
export function createPropertyRequest(property_id, request_id) {
  return Db.knex('property_request')
    .returning('property_id')
    .insert({ property_id, request_id })
    .then((idList) => {
      return db.fetchWhere('property_request', 'property_id', idList[0]);
    });
}

/**
 * Create a order
 *
 * @param data
 * @return promise
 */
export function createOrder(data = {}) {
  const payload = _.defaults(data, {
    state: 0,
    note: null,
  });

  return db.create('order', payload);
}

/**
 * Create a order item
 *
 * @param data
 * @return promise
 */
export function createOrderItem(data = {}) {
  const order_id = data.order_id;
  const payload = _.defaults(data, {
    lineable_id: order_id,
    lineable_type: 'order',
    amount: _.random(99),
    quantity: _.random(99),
    currency: ['USD', 'BLK'][_.random(0, 1)],
  });

  return db.create('line_item', _.omit(payload, ['order_id']));
}


/**
 * Create an address
 *
 * @param data
 * @return promise
 */
export function createAddress(data = {}) {
  const payload = _.defaults(data, {
    street: Faker.address.streetAddress(),
    city: 'Howell',
    state: 'Michigan',
    zipcode: '48855',
    country: 'US',
  });

  return db.create('address', payload);
}

/**
 * Create a invoice
 *
 * @param data
 * @return promise
 */
export function createInvoice(data = {}) {
  const payload = _.defaults(data, {
    paid: false,
    closed: false,
    attempted: false,
    attempt_count: 0,
    note: null,
  });

  return db.create('invoice', payload);
}


/**
 * Create a invoice item
 *
 * @param data
 * @return promise
 */
export function createInvoiceItem(data = {}) {
  const invoice_id = data.invoice_id;
  const payload = _.defaults(data, {
    lineable_id: invoice_id,
    lineable_type: 'invoice',
    amount: _.random(99),
    quantity: _.random(99),
    currency: ['USD', 'BLK'][_.random(0, 1)],
  });

  return createLineItem(_.omit(payload, ['invoice_id']));
}

/**
 * Create a invoice order relationship
 *
 * @param invoice_id
 * @param order_id
 * @return promise
 */
export function createInvoiceOrder(invoice_id, order_id) {
  return Db.knex('invoice_order')
    .returning('invoice_id')
    .insert({ invoice_id, order_id })
    .then((idList) => {
      return db.fetchWhere('invoice_order', 'invoice_id', idList[0]);
    });
}
