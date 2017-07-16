import {
  merge as Merge,
  omit as Omit,
  pick as Pick,
  isEmpty as IsEmpty,
  get as Get,
} from 'lodash';
import Uuid from 'node-uuid';
import Async from 'async';
import Joi from 'joi';
import Db from '../database';
import {
  NotFoundError, InputError, GenerationError, DatabaseSaveError, StateError,
} from '../foundation/errors';
import Authority from './authority';
import * as Serializers from './serializers';
import { User } from '../user/models';
import { Account } from '../account/models';
import { Address } from '../address/models';


export const register = {
  validate: {

    payload: Joi.object({
      organization: Joi.string().required(),
      phone: Joi.string(),
      street: Joi.string(),
      street2: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      zipcode: Joi.string(),
      country: Joi.string().min(2).max(2),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      fname: Joi.string().required(),
      lname: Joi.string().required(),
    })
      .and(['street', 'city', 'state', 'zipcode', 'country'])
      .with('street2', ['street', 'city', 'state', 'zipcode', 'country']),

  },
  handler(req, res) {
    const attributes = req.payload;

    User.forge()
      .where({ email: attributes.email })
      .fetch({ require: true })
      .then(() => {

        // NOTE(digia): Require forces a successful return from the database.
        // In which case we'd know we have a duplicate email. Emails must be
        // unique within the database. Registree probably forget they already
        // have an account.

        res.conflict();
      })
      // Email doesn't exist in the system, continue.
      .catch(() => {
        const account = Account.forge();
        const address = Address.forge();
        const user = User.forge();

        Db.transaction((t) => {
          const opts = { transacting: t };

          // NOTE(digia): Only create an address if postal address properties exist.
          // The addresses organization and phone are snapshots of the account.
          const addressPropCheckList = Omit(address.rules, Object.keys(account.rules));
          const addressCheckAttrs = Pick(attributes, Object.keys(addressPropCheckList));

          const initChain = IsEmpty(addressCheckAttrs)
            ? Promise.resolve()
            : address.create(Pick(attributes, Object.keys(address.rules)), opts)

          return initChain
            .then(() => {
              const addressId = address.get('id');
              const accountAttrs = { ...Pick(attributes, Object.keys(account.rules)), addressId }

              return account.create(accountAttrs, opts);
            })
            .then(() => {
              const accountId = account.get('id');
              const userPropList = [ ...Object.keys(user.rules), 'password' ];
              const userAttrs = { ...Pick(attributes, userPropList), accountId };

              return user.create(userAttrs, opts);
            });
        })
        .then(() => {
          // Respond
          const { organization, phone } = account.toJSON();
          const { email, fname, lname } = user.toJSON();
          const addressJSON = address.toJSON();

          // FIXME(digia): Include User and Account
          const data = {
            organization,
            email,
            fname,
            lname,
            phone: phone || null,
            street: Get(addressJSON, 'street', null),
            street2: Get(addressJSON, 'street2', null),
            city: Get(addressJSON, 'city', null),
            state: Get(addressJSON, 'state', null),
            zipcode: Get(addressJSON, 'zipcode', null),
            country: Get(addressJSON, 'country', null),
          };

          res.created(data);
        })
        .catch((err) => {
          console.log(err); // eslint-disable-line
          res.error();
        });
      });
  },
};

export const authenticate = {
  validate: {

    payload: {
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
    },

  },
  handler(req, res) {
    const authority = Authority();
    const { email, password } = req.payload;
    const opts = {
      require: true,
      withRelated: ['account'],
    };
    const user = User.forge();

    user.where({ email })
      .fetch(opts)
      .then(() => {
        // If user doesn't have a password they'll need to reset their password
        // before they can login. Null or empty strings do qualify as empty.
        if (IsEmpty(user.get('password'))) {
          throw new StateError();
        }

        return user.comparePassword(password);
      })
      .then(() => {
        const userId = user.get('id');
        const account = user.related('account');
        const accountId = account.get('id');

        return authority.generateAuthToken({ userId, accountId });
      })
      .then((token) => {
        res({ token });
      })
      .catch((err) => {
        if (err.message === 'EmptyResponse' ||
           err instanceof InputError) {
          res.badData();
          return;
        }

        if (err instanceof StateError) {
          res.conflict();
          return;
        }

        if (err instanceof GenerationError) {
          res.error();
          return;
        }

        console.log(err); // eslint-disable-line
        res.error(err);
      });
  },
};

export const isAuthenticated = {
  auth: 'token',
  handler: (req, res) => res(),
};

export const refresh = {
  validate: {

    payload: {
      token: Joi.string().required(),
    },

  },
  handler(req, res) {
    const authority = Authority();
    const { token } = req.payload;

    authority.verifyAuthToken(token)
    .then((decoded) => {
      const { userId, accountId } = decoded;

      return authority.generateAuthToken({ userId, accountId });
    })
    .catch(() => {
      throw new InputError();
    })
    .then((token) => {
      res({ token });
    })
    .catch((err) => {
      if (err instanceof InputError) {
        res.badData();
        return;
      }

      console.log(err) // eslint-disable-line
      res.error(err);
    });
  },
};

export const initializePasswordReset = {
  validate: {

    payload: {
      email: Joi.string().email().required(),
    },

  },
  handler(req, res) {
    const { email } = req.payload;
    const opts = {
      require: true,
      softDelete: false,
    };
    const user = User.forge({ email });

    user.fetch(opts)
      .then(() => {
        return user.initPasswordReset();
      })
      .then(() => {
        res.ok();
      })
      // .then(() => {
      //   const passwordResetToken = user.get('passwordResetToken');
      //   const messageData = { passwordResetToken, name: user.get('fname'), };
      //   const message = AuthMailer().initPasswordReset(email, messageData);

      //   return message.send();
      // })
      .catch((err) => {
        if (err.message === 'EmptyResponse') {
          res.notFound();
          return;
        }

        console.log(err) // eslint-disable-line
        res.error();
      });
  },
};

export const passwordReset = {
  validate: {

    params: {
      email: Joi.string().required(),
      token: Joi.string().length(32).required(),
    },

    payload: {
      password: Joi.string().min(6).required(),
    }

  },
  handler(req, res) {
    const { email, token } = req.params;
    const { password } = req.payload;
    const opts = {
      require: true,
      softDelete: false,
    };
    const user = User.forge({ email, passwordResetToken: token });

    user.fetch(opts)
      .then(() => {
        // Check the user can reset still
        if (!user.canResetPassword()) {
          throw new StateError();
        }

        return user.passwordReset(password);
      })
      .then(() => {
        res.ok();
      })
      .catch((err) => {
        if (err.message === 'EmptyResponse') {
          res.notFound();
          return;
        }

        // NOTE(digia): Clear the password reset credentials on an expired attempt?
        if (err instanceof StateError) {
          res.conflict();
          return;
        }

        console.log(err) // eslint-disable-line
        res.error();
      });
  },
};
