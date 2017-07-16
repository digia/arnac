import {
  defaults as Defaults,
  isNull as IsNull,
  difference as Difference,
} from 'lodash';
import Config from 'config';
import Hashids from 'hashids';


export function UUIDHasher(options = {}) {
  const config = Defaults({}, options, Config.get('hashids'));
  const { salt, minLength, alphabet } = config;

  const hashids = new Hashids(salt, minLength, alphabet);

  function encode(id) {
    // Can't encode null
    if (IsNull(id)) return id;

    const toHash = parseInt(id, 10);

    if (!toHash) {
      throw new TypeError(`ID [${id}] must be a type of number`);
    }

    return hashids.encode(toHash);
  }

  function decode(hash) {
    if (IsNull(hash)) {
      throw new TypeError(`Hash [${hash}] cannot be null`);
    }

    const result = hashids.decode(hash);

    if (!result.length) {
      throw new TypeError(`Hash [${hash}] is invalid`);
    }

    return result.pop();
  }

  /**
   * Oh js...
   * Strings with leading numbers will parse to numbers.
   * We've gotta check if a number will parse, and then if that number
   * is the same as the original string.
   */
  function isNumber(value) {
    const valueAsNumber = parseInt(value, 10);

    return Boolean(valueAsNumber && value === valueAsNumber);
  }

  /**
   * Guess if the passed in value is a hash
   *
   * Simple.
   * - If it can be parsed as an int, it's not a hash.
   * - If it isn't as long as or longer than the minLength it's not a hash.
   *
   * @return boolean
   */
  function isHash(potentialHash) {
    const possibility = isNumber(potentialHash)
    ? String(possibility)
    : potentialHash;

    if (minLength > possibility.length) {
      return false;
    }

    const notAllowed = Difference(possibility.split(''), alphabet.split(''));

    if (notAllowed.length) {
      return false;
    }

    return true;
  }

  return { encode, decode, isHash, isNumber };
}
