import Async from 'async';
import Crypto from 'crypto';
import Bcrypt from 'bcrypt';
import { Promise } from 'bluebird';
import JWT from 'jsonwebtoken';
import Config from 'config';
import { InputError } from '../foundation/errors';


const JWT_KEY = Config.get('auth.token.jwt.key');
const EXPIRES_IN = Config.get('auth.token.expiresIn');


export default function authority({
  jwt = JWT,
  key = JWT_KEY,
  expiresIn = EXPIRES_IN,
  cryptoAlgorithm = 'aes-256-ctr',
} = {}) {
  function generateAuthToken(payload) {
    return new Promise((resolve, reject) => {
      jwt.sign(payload, key, { expiresIn }, (token) => {
        if (!token) {
          reject(false);
          return;
        }

        resolve(token);
      });
    });
  }

  function verifyAuthToken(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, key, (err, decoded) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(decoded);
      });
    });
  }

  function generateRandomToken({ length = 48, encoding = 'base64' } = {}) {
    return new Promise((resolve, reject) => {
      Crypto.randomBytes(length, (ex, buf) => {
        if (ex) {
          reject(ex);
          return;
        }

        resolve(buf.toString(encoding));
      });
    });
  }

  function generateTokens(payload) {
    return new Promise((resolve, reject) => {
      Async.parallel({

        authToken: (cb) => {
          this.generateAuthToken(payload)
          .then((token) => cb(null, token))
          .catch((err) => cb(err));
        },

        refreshToken: (cb) => {
          this.generateRandomToken()
          .then((token) => cb(null, token))
          .catch((err) => cb(err));
        },
      }, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(result);
      });
    });
  }

  function generateHash(value) {
    return new Promise((resolve, reject) => {
      Bcrypt.hash(value, 12, (err, hash) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(hash);
      });
    });
  }

  function compareHash(value, hash) {
    return new Promise((resolve, reject) => {
      Bcrypt.compare(value, hash, (err, matches) => {
        if (err) {
          reject(err);
          return;
        }

        if (!matches) {
          reject(new InputError());
          return;
        }

        resolve(matches);
      });
    });
  }

  function encrypt(value, encryptKey, outputEncoding = 'base64') {
    const cipher = Crypto.createCipher(cryptoAlgorithm, encryptKey);

    return cipher.update(value, 'utf-8', outputEncoding) + cipher.final(outputEncoding);
  }

  function decrypt(crypt, decryptKey, inputEncoding = 'base64') {
    const decipher = Crypto.createDecipher(cryptoAlgorithm, decryptKey);

    return decipher.update(crypt, inputEncoding, 'utf-8') + decipher.final('utf-8');
  }

  return {
    generateAuthToken,
    verifyAuthToken,
    generateRandomToken,
    generateTokens,
    generateHash,
    compareHash,
    encrypt,
    decrypt,
  };
}
