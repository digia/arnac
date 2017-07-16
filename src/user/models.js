import {
  isEmpty as IsEmpty,
  isNull as IsNull,
} from 'lodash';
import Joi from 'joi';
import Moment from 'moment';
import ModelFactory from '../foundation/model-factory';
import { InputError } from '../foundation/errors';
import Db from '../database';
import Authority from '../auth/authority';


export const User = ModelFactory('user', {

  hasTimestamps: ['createdAt', 'updatedAt'],
  soft: true,

  rules: {
    email: Joi.string().required(),
    fname: Joi.string(),
    lname: Joi.string(),
    passwordHash: Joi.string().required(),
    passwordResetToken: Joi.string(),
    passwordResetAt: Joi.date(),
    resetToken: Joi.string(),
  },
  hidden: [
    'password', 'passwordHash', 'passwordResetToken', 'passwordResetAt',
    'refreshToken',
  ],

  initialize() {
    this.on('saving', this.handlePasswordHash, this);
  },

  account() {
    return this.belongsTo('Account');
  },

  virtuals: {
    password: {
      get() {
        return this.get('passwordHash');
      },
      set(hash) {
        this.set('passwordHash', hash);

        return this;
      },
    },
  },

  hashPassword(password) {
    return Authority().generateHash(password);
  },

  comparePassword(potentialPassword) {
    return Authority().compareHash(potentialPassword, this.get('password'));
  },

  canResetPassword() {
    const {
      passwordResetToken,
      passwordResetAt
    } = this.getProperties(['passwordResetToken', 'passwordResetAt']);

    if (IsEmpty(passwordResetToken) ||
        Moment(passwordResetAt) < Moment().subtract(24, 'hours')) {
      return false;
    }

    return true;
  },

  initPasswordReset() {
    // Use hex encoding because base64 can contain segment breaking characters
    return Authority().generateRandomToken({ length: 16, encoding: 'hex' })
      .then((passwordResetToken) => {
        return this.update({ passwordResetToken, passwordResetAt: new Date() });
      });
  },

  passwordReset(password) {
    return this.update({
      password,
      passwordResetToken: null,
      passwordResetAt: null,
    });
  },

  handlePasswordHash(model, { password }) {
    if (!password) {
      return Promise.resolve(true);
    }

    return model.hashPassword(password)
      .then((hash) => {
        model.set('password', hash);
      });
  },
});


Db.model('User', User);
