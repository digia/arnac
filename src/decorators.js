import _, {
  get as Get,
  includes as Includes,
} from 'lodash';
import Boom from 'boom';
import Package from '../package.json';


function decorators(plugin, options, next) {
  /**
   * Reply decorators
   *
   * @example
   * Customer(req.payload).save().then(function (customer) {
   *  res.created(customer.toJSON());
   * });
   *
   */

  function serializer(ser) {
    this._serializer = ser;

    return this;
  }

  function ok(data, included, meta) {
    if (this._serializer) {
      const jsonapi = this._serializer.serialize({ data, included, meta });

      this.response(jsonapi);
      return;
    }

    const json = {
      data: (!data) ? null : data,
    };

    this.response(json);
  }

  function created(data, included, meta) {
    if (!this._serializer) {
      this.response(data).code(201);
      return;
    }

    const jsonapi = this._serializer.serialize({ data, included, meta });

    this.response(jsonapi).code(201);
  }

  function noContent() {
    this.response(null).code(204);
  }

  function deleted() {
    this.noContent();
  }

  function unauthorized() {
    this.response(null).code(401);
  }

  function notFound() {
    this.response({}).code(404);
  }

  function conflict(message) {
    const json = {};

    if (message) {
      json.data = message;
    }

    this.response(json).code(409);
  }

  function badData(message) {
    return this.response(Boom.badData(message));
  }

  function badRequest(message) {
    return this.response(Boom.badRequest(message));
  }

  function error(message) {
    const json = {};

    if (message) {
      json.data = message;
    }

    this.response(json).code(500);
  }

  function hasInclude() {
    const inc = Get(this, 'query.include');

    if (!inc) {
      return false;
    }

    return true;
  }

  function include(toInclude) {
    if (!this.hasInclude()) {
      return false;
    }

    return Includes(Get(this, 'query.include'), toInclude);
  }

  function getInclude() {
    if (!this.hasInclude()) {
      return [];
    }

    return Get(this, 'query.include').split(',');
  }

  function withDeleted() {
    if (!this.query) {
      return false;
    }

    if (_.isUndefined(this.query.withDeleted)) {
      return false;
    }

    return Boolean(this.query.withDeleted);
  }

  function hasFilter(key) {
    if (!this.query) {
      return false;
    }

    if (_.isUndefined(this.query[key])) {
      return false;
    }

    return true;
  }

  function filter(key) {
    if (!this.query) {
      return false;
    }

    if (_.isUndefined(this.query[key])) {
      return undefined;
    }

    return this.query[key];
  }

  function getDataTopLevel() {
    const { type, id } = this.payload.data;
    const topLevel = { type };

    if (id) {
      topLevel.id = id;
    }

    return topLevel;
  }

  function getType() {
    return Get(this, 'payload.data.type', void 0);
  }

  function getId() {
    return Get(this, 'payload.data.id', void 0);
  }

  function getAttributes() {
    return Get(this, 'payload.data.attributes', void 0);
  }

  function getRelationship(name) {
    return Get(this, `payload.data.relationships.${name}.data`, void 0);
  }

  plugin.decorate('reply', 'serializer', serializer);
  plugin.decorate('reply', 'ok', ok);
  plugin.decorate('reply', 'created', created);
  plugin.decorate('reply', 'noContent', noContent);
  plugin.decorate('reply', 'deleted', deleted);
  plugin.decorate('reply', 'unauthorized', unauthorized);
  plugin.decorate('reply', 'notFound', notFound);
  plugin.decorate('reply', 'conflict', conflict);
  plugin.decorate('reply', 'badData', badData);
  plugin.decorate('reply', 'badRequest', badRequest);
  plugin.decorate('reply', 'error', error);

  plugin.decorate('request', 'hasInclude', hasInclude);
  plugin.decorate('request', 'include', include);
  plugin.decorate('request', 'getInclude', getInclude);
  plugin.decorate('request', 'withDeleted', withDeleted);
  plugin.decorate('request', 'hasFilter', hasFilter);
  plugin.decorate('request', 'filter', filter);
  plugin.decorate('request', 'getDataTopLevel', getDataTopLevel);
  plugin.decorate('request', 'getType', getType);
  plugin.decorate('request', 'getId', getId);
  plugin.decorate('request', 'getAttributes', getAttributes);
  plugin.decorate('request', 'getRelationship', getRelationship);

  next();
}

decorators.attributes = {
  name: 'decoratorsPlugin',
  version: Package.version,
};

export default decorators;
