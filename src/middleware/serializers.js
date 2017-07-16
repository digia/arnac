import {
  isArray as IsArray,
  isNumber as IsNumber,
  isObject as IsObject,
  isPlainObject as IsPlainObject,
  isDate as IsDate,
} from 'lodash';
import { UUIDHasher } from '../foundation/hashing';


const ID_REGEX = new RegExp(/^id$/); // id
const ID_SUFFIX_REGEX = new RegExp(/Id$/); // *Id

const hashCache = []; // In memory cache for id to hash relationship

function isHashableKey(key) {
  return Boolean(key.match(ID_REGEX) || key.match(ID_SUFFIX_REGEX));
}

// NOTE(digia): Not tested since switching to eslint
// NOTE(digia): serialize and normalize could probably be optimized.
export function PayloadSerializer(hasher = UUIDHasher()) {
  function serialize(data) {
    if (IsArray(data)) {
      return data.map(serialize);
    }

    if (IsPlainObject(data)) {
      return serializeObject(data); // eslint-disable-line
    }

    return data;
  }

  function normalize(data) {
    if (IsArray(data)) {
      return data.map(normalize);
    }

    if (IsObject(data) && !IsDate(data)) {
      return normalizeObject(data); // eslint-disable-line
    }

    return data;
  }

  function serializeObject(data) {
    const keyList = Object.keys(data);
    const results = {};

    function hash(value) {
      if (!hashCache[value]) {
        hashCache[value] = hasher.encode(value);
      }

      return hashCache[value];
    }

    for (let i = 0, il = keyList.length; i < il; ++i) {
      const key = keyList[i];
      let value = data[key];

      if (isHashableKey(key)) {
        if (IsNumber(value)) {
          value = hash(value);
        }

        if (IsArray(value)) {
          value = value.map(hash);
        }
      }

      results[key] = serialize(value);
    }

    return results;
  }

  function normalizeObject(data) {
    const keyList = Object.keys(data);
    const results = {};

    function dehash(value) {
      if (hashCache.indexOf(value) === -1) {
        hashCache[hasher.decode(value)] = value;
      }

      return hashCache.indexOf(value);
    }

    for (let i = 0, il = keyList.length; i < il; ++i) {
      const key = keyList[i];
      let value = data[key];

      if (isHashableKey(key) && hasher.isHash(value) || IsArray(value)) {
        value = IsArray(value) ? value.map(dehash) : dehash(value);
      }

      results[key] = normalize(value);
    }

    return results;
  }

  return { serialize, normalize };
}

// NOTE(digia): Not tested since switching to eslint
export function ParamsSerializer(hasher = UUIDHasher(), config = {}) {
  const allowNumbers = config.allowNumbers || false;

  function normalize(data) {
    if (IsArray(data)) {
      return data.map(normalize);
    }

    if (IsPlainObject(data)) {
      return normalizeObject(data); // eslint-disable-line
    }

    return data;
  }

  function normalizeObject(data) {
    const keyList = Object.keys(data);
    const results = {};

    function dehash(value) {
      if (hashCache.indexOf(value) === -1) {
        hashCache[hasher.decode(value)] = value;
      }

      return hashCache.indexOf(value);
    }

    for (let i = 0, il = keyList.length; i < il; ++i) {
      const key = keyList[i];
      let value = data[key];

      if (isHashableKey(key) && isValidHash(value) || IsArray(value)) { // eslint-disable-line
        value = IsArray(value) ? value.map(dehash) : dehash(value);
      }

      results[key] = normalize(value);
    }

    return results;
  }

  function isValidHash(value) {
    if (hasher.isNumber(value)) {
      if (!allowNumbers) {
        throw new TypeError;
      }

      return false;
    }

    return hasher.isHash(value);
  }

  return { normalize };
}
