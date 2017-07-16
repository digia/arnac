import {
  merge as Merge,
  isUndefined as IsUndefined,
} from 'lodash';
import Joi from 'joi';
import Async from 'async';
import { NotFoundError, InputError, AuthenticationError } from '../foundation/errors';
import * as Serializers from './serializers';
import { User } from '../user/models';


export const GetUser = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },

    query: {
      include: Joi.string(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const opts = {
      require: true,
      softDelete: false,
      withRelated: ['account', 'account.address'],
    };
    const user = User.forge({ id });
    const toInclude = {};

    user.fetch(opts)
      .then(() => {
        if (credentials.userId !== id) {
          res.unauthorized();
          return;
        }

        if (req.include('account')) {
          const account = user.related('account');
          const address = account.related('address');

          toInclude.account = user.related('account').toJSON();

          toInclude.account = IsUndefined(address)
            ? account.toJSON()
            : Merge(
                address.toJSON({
                  nullify: true,
                  exclude: ['id', 'createdAt', 'updatedAt'],
                }),
                account.toJSON()
              );
        }

        res.serializer(Serializers.User)
          .ok(user.toJSON(), toInclude);
      })
      .catch((err) => {
        if (err.message === 'EmptyResponse') {
          res.notFound();
          return;
        }

        console.error(err); // eslint-disable-line
        res.error();
      });
  },
};

export const UpdateUser = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },

    payload: {
      data: Joi.object({
        type: Joi.string().required().allow('user'),
        id: Joi.string().guid(),
        attributes: Joi.object({
          email: Joi.string().email(),
          fname: Joi.string().allow(null),
          lname: Joi.string().allow(null),
        }).required().or(['email', 'fname', 'lname']),
      }).required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const attributes = req.getAttributes();
    const opts = { require: true };
    const user = User.forge({ id });

    function fetchUser(next) {
      user.fetch(opts)
      .then(() => {
        if (credentials.userId !== id) {
          next(new AuthenticationError);
          return;
        }

        next(null);
      })
      .catch(() => {
        next(new NotFoundError);
      });
    }

    function checkEmail(next) {
      const { email } = attributes;

      if (!email || user.get('email') === email) {
        next(null);
        return;
      }

      User.forge().where({ email }).fetch(opts)
      .then(() => {
        // Failure, duplicate email exists
        next(new InputError);
      })
      .catch(() => {
        // Success, no duplicate exist
        next(null);
      });
    }

    function updateUser(next) {
      user.save(attributes, { patch: true })
      .then(() => {
        next(null);
      })
      .catch((err) => {
        next(err);
      });
    }

    Async.series([
      fetchUser,
      checkEmail,
      updateUser,
    ], (err) => {
      if (err instanceof NotFoundError) {
        res.notFound();
        return;
      }

      if (err instanceof AuthenticationError) {
        res.unauthorized();
        return;
      }

      if (err instanceof InputError) {
        res.badData();
        return;
      }

      if (err) {
        res.error();
        console.error(err); // eslint-disable-line
        return;
      }

      res.serializer(Serializers.User).ok(user.toJSON());
    });
  },
};

export const UpdateUserPassword = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },

    payload: {
      data: Joi.object({
        type: Joi.string().required().allow('user'),
        id: Joi.string().guid(),
        attributes: Joi.object({
          currentPassword: Joi.string().min(6).required(),
          newPassword: Joi.string().min(6).required(),
        }).required(),
      }).required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const { currentPassword, newPassword } = req.getAttributes();
    const opts = { require: true };
    const user = User.forge({ id });

    user.fetch(opts)
    .then(() => {
      if (credentials.userId !== id) {
        throw new AuthenticationError();
      }

      return user.comparePassword(currentPassword)
        .catch(() => {
          throw new InputError();
        });
    })
    .then(() => {
      return user.update({ password: newPassword });
    })
    .then(() => {
      res.serializer(Serializers.User)
      .ok(user.toJSON());
    })
    .catch((err) => {
      if (err.message === 'EmptyResponse') {
        res.notFound();
        return;
      }

      if (err instanceof AuthenticationError) {
        res.unauthorized();
        return;
      }

      if (err instanceof InputError) {
        res.badData();
        return;
      }

      console.log(err); // eslint-disable-line
      res.error();
    });
  },
};

// TODO(digia): Come back after user deletion is figured out
export const SoftDeleteUser = {
  auth: 'token',
  handler(req, res) {
    res.notFound();
    return;
  },
};
