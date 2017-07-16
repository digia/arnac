import {
  isDate as IsDate,
  get as Get,
  defaults as Defaults,
  isUndefined as IsUndefined,
  omit as Omit,
  pick as Pick,
  mapValues as MapValues,
  isEmpty as IsEmpty,
} from 'lodash';
import Moment from 'moment';
import Db from '../database';


// NOTE(digia): Should we check the rules and only "save" attributes which are
// set on the rules? Initial issues will be polymorphic properties.
export function saveAndRefresh(model, data = null, options = {}) {
  const refresh = Get(options, 'refresh', true);

  return model.save(data, options).then(() => {
    if (!refresh) {
      return model;
    }

    // TODO(digia): This may not be working with transactions...
    return model.refresh(options);
  });
}

export function create(data = null, options = {}) {
  const saveOpts = Defaults({ method: 'insert' }, options);

  return saveAndRefresh(this, data, saveOpts);
}

export function update(data, options = {}) {
  // NOTE(digia): Bug with patch? This fails when we use patch
  // const saveOpts = Defaults({ patch: true, method: 'update' }, options);
  const updateOpts = Defaults({ method: 'update' }, options);

  return saveAndRefresh(this, data, updateOpts);
}

export function serialize(options = {}) {
  const opts = Defaults({ shallow: true }, options);
  let serialized = Db.Model.prototype.serialize.call(this, opts);

  if (!IsUndefined(opts.nullify)) {
    if (IsUndefined(this.rules)) {
      throw new Error('rules property must be set to use nullify.');
    }

    const properties = Object.keys(this.rules);

    properties.forEach((prop) => {
      if (IsUndefined(serialized[prop])) {
        serialized[prop] = null;
      }
    });
  }

  if (!IsUndefined(opts.exclude)) {
    serialized = Omit(serialized, opts.exclude);
  }

  // Format the date properly
  return MapValues(serialized, (value) => {
    return IsDate(value) ? Moment(value).format() : value;
  });
}

/**
 * toJSON
 *
 * @depreciated
 * The naming is misleading, toJSON should be a string, though bookshelf didn't
 * do that, i blame bookshelf. Either way use the toObject variant of these going
 * further.
 *
 */
export function toJSON(options = {}) {
  const { exclude = [] } = options;
  const json = Db.Model.prototype.toJSON.call(this, Defaults(options, { shallow: true }));

  if (!IsEmpty(exclude)) {
    return Omit(json, exclude);
  }

  return json;
}

/**
 * thenToJSON
 *
 * @depreciated
 * The naming is misleading, thenToJSON should be a string, though bookshelf didn't
 * do that, i blame bookshelf. Either way use the toObject variant of these going
 * further.
 *
 */
export function thenToJSON(method) {
  const args = Array.prototype.slice.call(arguments);

  args.shift();

  return this[method](args)
  .then((result) => {
    if (!result) {
      return result;
    }

    return result.toObject();
  });
}

export function getProperties(propertyList = []) {
  if (IsEmpty(propertyList)) {
    return this.attributes;
  }

  return Pick(this.attributes, propertyList);
}

export function setProperties(properties) {
  ForEach(properties, (val, key) => this.set(key, val));

  return this;
}

export default function ModelFactory(tableName, proto = {}, klass = {}) {
  /**
   * Required
   * - tableName
   *
   */

  /**
   * Optional
   * - initialize
   * - validateSave
   * - {relationships}
   *
   */

  /**
   * Plugins
   * - visibility
   * - hidden
   * - virtuals
   *
   */

  return Db.Model.extend(
    {
      tableName,
      create,
      update,
      serialize,
      toJSON,
      thenToJSON,
      getProperties,
      setProperties,
    ...proto
    },
    { tableName, ...klass }
  );
}
