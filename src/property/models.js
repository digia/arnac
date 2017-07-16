/* eslint-disable func-names */
import {
  merge as Merge,
  omit as Omit,
  clone as Clone,
  get as Get,
  set as Sett,
  chain as Chain,
  isNull as IsNull,
} from 'lodash';
import Joi from 'joi';
import Crypto from 'crypto';
import ModelFactory from '../foundation/model-factory';
import Db from '../database';
import Authority from '../auth/authority';
import {
  StatusCodeNotFoundError,
  StatusCodeConflictError,
  NotFoundError,
  DatabaseUniquenessError,
  StateError,
} from '../foundation/errors';
import Enigma from './enigma';


export const Property = ModelFactory('property', {

  hasTimestamps: ['createdAt', 'updatedAt'],
  soft: true,

  rules: {
    name: Joi.string().required(),
    url: Joi.string().required(),
    accountId: Joi.number().required(),
  },

  hidden: ['credentialKey'],

  initialize() {
    this.on('creating', this.handleCredentialKey);
  },

  account() {
    return this.belongsTo('Account');
  },

  requests() {
    return this.belongsToMany(
      'Request',
      'property_request',
      'property_id',
      'request_id'
    );
  },

  makeCredentialKey() {
    return new Promise((resolve, reject) => {
      Crypto.randomBytes(48, (err, buf) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(buf.toString('base64'));
      });
    });
  },

  handleCredentialKey(model) {
    if (model.has('credentialKey')) {
      return Promise.resolve();
    }

    return this.makeCredentialKey()
    .then((key) => {
      model.set('credentialKey', key);
    });
  },

});

export function PropertyCredential({ enigma = Enigma(), authority = Authority() } = {}) {
  const basePath = 'credential';
  const type = 'credential';
  const model = {
    attributes: {},
    relationships: {},
  };

  function structurePayloadRelationship(relationshipType, relationshipId) {
    return { [relationshipType]: { data: { type, id: relationshipId } } };
  }

  function encryptAttributes(attributes, key) {
    const toEncrypt = ['identity', 'authentication'];
    const encrypted = Chain(attributes)
    .pick(toEncrypt)
    .omitBy(IsNull)
    .omitBy(v => v === '') // EmptyString
    .mapValues(a => authority.encrypt(a, key))
    .value();

    return Merge({}, attributes, encrypted);
  }

  function decryptAttributes(attributes, key) {
    const toDecrypt = ['identity', 'authentication'];
    const values = Chain(attributes)
    .pick(toDecrypt)
    .omitBy(IsNull, v => v === '') // IsNull or EmptyString
    .mapValues(a => authority.decrypt(a, key))
    .value();

    return Merge({}, attributes, values);
  }

  // Serialze the payload in the JSON API resource object format
  function serializePayload(attrs, property, includeRelationships = true) {
    const { id } = attrs;
    const propertyId = property.get('id');
    const credentialKey = property.get('credentialKey');

    if (IsNull(credentialKey)) {
      const msg = `credentialKey must be set on the property to create credentials.`;
      throw new StateError(msg);
    }

    // Encrypt the attributes
    const encryptedAttributes = encryptAttributes(attrs, credentialKey);

    // Build the JSON API payload
    const attributes = Omit(encryptedAttributes, ['id', 'propertyId']);
    const data = Merge({ type, attributes }, { id });

    if (includeRelationships) {
      data.relationships = structurePayloadRelationship('property', propertyId);
    }

    return { data };
  }

  // Normalize from the JSON API resource object format
  function normalizePayload(data, property) {
    const { id, attributes } = data;
    const propertyId = property.get('id');
    const credentialKey = property.get('credentialKey');

    if (IsNull(credentialKey)) {
      const msg = `credentialKey must be set on the property to create credentials.`;
      throw new StateError(msg);
    }

    return decryptAttributes(Merge(attributes, { id, propertyId }), credentialKey);
  }

  function handleErrors(err) {
    if (err instanceof StatusCodeNotFoundError) {
      throw new NotFoundError();
    }

    if (err instanceof StatusCodeConflictError) {
      throw new DatabaseUniquenessError();
    }

    throw err;
  }

  model.get = function (name) {
    return Get(this.attributes, name);
  };

  model.set = function (name, value) {
    this.attributes = Sett(this.attribute, name, value);

    return this;
  };

  model.related = function (relation) {
    return Get(this.relationships, relation, null);
  };

  model.toJSON = function (options = {}) {
    if (options.exclude) {
      return Omit(this.attributes, options.exclude);
    }

    return this.attributes;
  };

  model.fetch = function () {
    const id = this.attributes.id;
    const path = `${basePath}/${id}`;

    return enigma.get(path)
    .then((response) => {
      this.attributes = normalizePayload(response.data, this.related('property'));

      return this;
    })
    .catch(handleErrors);
  };

  model.fetchAll = function (opts = {}) {
    // NOTE(digia): Doing this can get nasty quick. Just noting for later...
    const property = this.related('property');
    const propertyId = property.get('id');
    let path = `${basePath}?filter[propertyId]=${propertyId}`;

    if (opts.exclude) {
      const toExclude = opts.exclude.join(',');
      path += `&exclude=${toExclude}`;
    }

    return enigma.get(path)
    .then((response) => {
      // NOTE(digia): Response has a meta.count, we'll need to proxy that through
      // somehow in the future. Maybe create a collection?
      const data = response.data;
      const factory = PropertyCredential();

      return data.map(c => factory.forge(normalizePayload(c, property)));
    })
    .catch(handleErrors);
  };

  model.create = function () {
    const payload = serializePayload(this.attributes, this.related('property'));

    return enigma.post(basePath, payload)
    .then((response) => {
      this.attributes = normalizePayload(response.data, this.related('property'));

      return this;
    })
    .catch(handleErrors);
  };

  model.update = function (data) {
    const id = this.attributes.id;
    const path = `${basePath}/${id}`;
    const attributes = Omit(data, ['id']);
    const payload = serializePayload(attributes, this.related('property'), false);

    return enigma.post(path, payload)
    .then((response) => {
      this.attributes = normalizePayload(response.data, this.related('property'));

      return this;
    })
    .catch(handleErrors);
  };

  model.destroy = function () {
    const id = this.attributes.id;
    const path = `${basePath}/${id}`;

    return enigma.del(path)
    .catch(handleErrors);
  };

  function forge(attributes = {}, relationships = {}) {
    const m = Clone(model);

    m.attributes = attributes;
    m.relationships = relationships;

    return m;
  }

  return { forge };
}

Db.model('Property', Property);
