import { get as Get } from 'lodash';
import Config from 'config';


const KEY = Config.get('auth.token.jwt.key');
const EXPIRES_IN = Config.get('auth.token.expiresIn');

if (!KEY || !EXPIRES_IN) {
  throw new Error(`.env must have JWT key and expires in set!`);
}

export const tokenOptions = {
  key: KEY,

  // JWT should always have
  // - User id
  // - Account id
  //
  // This "could" cause issues down the road if we setup teams.
  // Specifically if a user is removed from an account and their token is still valid.
  // - Rolls [when/if implemented later on]
  validateFunc(request, decoded, cb) {
    if (!decoded.userId || !decoded.accountId) {
      cb(null, false);
      return;
    }

    cb(null, true, decoded);
  },
  verifyOptions: {
    maxAge: EXPIRES_IN,
  },
};

export const tokenQueryAccountOptions = {
  key: KEY,

  validateFunc(request, decoded, cb) {
    const accountId = Get(request, 'query.filter.accountId', undefined);

    if (!decoded.userId || !decoded.accountId || accountId !== decoded.accountId) {
      cb(null, false);
      return;
    }

    cb(null, true, decoded);
  },
  verifyOptions: {
    maxAge: EXPIRES_IN,
  },
};

export const tokenQueryUserOptions = {
  key: KEY,

  validateFunc(request, decoded, cb) {
    const userId = Get(request, 'query.filter.userId', undefined);

    if (!decoded.userId || !decoded.accountId || userId !== decoded.userId) {
      cb(null, false);
      return;
    }

    cb(null, true, decoded);
  },
  verifyOptions: {
    maxAge: EXPIRES_IN,
  },
};
