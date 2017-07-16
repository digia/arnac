import {
  merge as Merge,
  omit as Omit,
  pick as Pick,
  isUndefined as IsUndefined,
  isEmpty as IsEmpty,
} from 'lodash';
import Joi from 'joi';
import { AuthenticationError, InputError } from '../foundation/errors';
import { Address } from '../address/models';
import { AddressCollection } from '../address/collections';
import { Account, Card } from './models';
import * as Serializers from './serializers';


export const GetAccount = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },
    query: {
      include: Joi.array().items(Joi.string().valid('user')),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const opts = {
      require: true,
      softDelete: false,
      withRelated: ['address'],
    };
    const account = Account.forge({ id });
    const included = {};

    if (req.hasInclude()) {
      opts.withRelated = [];
    }

    if (req.include('user')) {
      opts.withRelated.push('users');
    }

    account.fetch(opts)
    .then(() => {
      const users = account.related('users');
      const address = account.related('address');
      const data = IsUndefined(address)
      ? account.toJSON()
      : Merge(
          account.toJSON(),
          address.toJSON({
            nullify: true,
            exclude: ['id', 'organization', 'createdAt', 'updatedAt'],
          })
        );

      // Authorized user does not have access to this account
      if (credentials.accountId !== id) {
        res.unauthorized();
        return;
      }

      if (req.hasInclude()) {
        if (req.include('user')) {
          included.user = users.toJSON();
        }
      }

      res.serializer(Serializers.Account)
      .ok(data, included);
    })
    .catch(() => {
      res.notFound();
    });
  },
};


export const UpdateAccount = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },
    payload: {
      data: Joi.object({
        type: Joi.string().required().allow('account'),
        id: Joi.string().guid(),
        attributes: Joi.object({
          organization: Joi.string(),
          phone: Joi.string().allow(null),
          street: Joi.string().allow(null),
          street2: Joi.string().allow(null),
          city: Joi.string().allow(null),
          state: Joi.string().allow(null),
          zipcode: Joi.string().allow(null),
          country: Joi.string().allow(null).min(2).max(2),
        }).required().or([
          'organization', 'phone', 'street', 'street2', 'city', 'state',
          'zipcode', 'country',
        ]),
      }).required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const attributes = req.getAttributes();
    const opts = {
      require: true,
      withRelated: ['address'],
    };
    const account = Account.forge({ id });

    account.fetch(opts)
      .then(() => {
        if (credentials.accountId !== id) {
          throw new AuthenticationError;
        }

        // Update the account
        const attrs = Pick(attributes, Object.keys(account.rules));

        return IsEmpty(attrs) ? account : account.update(attrs);
      })
      .then(() => {
        const address = account.related('address');
        const propertyList = Object.keys(Address.forge().rules);
        const attrs = Pick({ ...account.toJSON(), ...attributes }, propertyList);
        const requiredAttrs = Omit(attrs, ['organization', 'phone']);

        // Don't create an address if there isn't one already and none of the
        // required attributes are being changes. Required attributes being
        // anything other than organization.
        return (address.isNew() && IsEmpty(requiredAttrs))
          ? address
          : AddressCollection.forge().updateOrCreate(address, attrs);
      })
      .then((address) => {
        // Update the account after the address has been handled
        const prevAddress = account.related('address');

        if (IsUndefined(address)) {
          return undefined;
        }

        if (prevAddress && address.get('id') === prevAddress.get('id')) {
          return undefined;
        }

        return account.update({ addressId: address.get('id') }, opts);
      })
      .then(() => {
        // Respond
        const address = account.related('address');
        const data = !address
          ? account.toJSON()
          : Merge(
              address.toJSON({
                nullify: true,
                exclude: ['id', 'phone', 'createdAt', 'updatedAt'],
              }),
              account.toJSON()
            );

        res.serializer(Serializers.Account)
          .ok(data);
      })
      .catch((err) => {
        if (err.message === 'EmptyResponse') {
          res.notFound();
          return;
        }

        console.log(err); // eslint-disable-line

        if (err instanceof AuthenticationError) {
          res.unauthorized();
          return;
        }

        if (err instanceof InputError) {
          res.badRequest();
          return;
        }

        res.error();
      });
  },
};

export const CreateAccountCard = {
  validate: {

    params: {
      accountId: Joi.string().guid().required(),
    },

    payload: {
      data: Joi.object({
        type: Joi.string().required().allow('account-card'),
        id: Joi.string().guid(),
        attributes: Joi.object({
          token: Joi.string().required(),
        }).required()
      }).required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { accountId } = req.params;
    const opts = { require: true };
    const account = Account.forge({ id: accountId });

    account.fetch(opts)
    .then(() => {
      if (credentials.accountId !== accountId) {
        throw new AuthenticationError;
      }

      return;
    })
    .then(() => {
      // Create the card
      const { token } = req.getAttributes();
      const customerId = account.get('stripeId');
      const accountId = account.get('id');

      // FIXME(digia): Catch and properly handle Stripe errors
      return Card.forge().create({ token, customerId, accountId });
    })
    .then((card) => {
      res.serializer(Serializers.AccountCard)
      .created(card.toJSON());
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

      console.log(err); // eslint-disable-line
      res.error();
    });
  },
};

export const GetAccountCard = {
  validate: {

    params: {
      accountId: Joi.string().guid().required(),
      id: Joi.string().guid().required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { accountId, id } = req.params;
    const opts = { require: true };
    const account = Account.forge({ id: accountId });

    account.fetch(opts)
    .then(() => {
      if (credentials.accountId !== accountId) {
        throw new AuthenticationError;
      }

      return Card.forge({ id }).fetch(opts);
    })
    .then((card) => {
      const toInclude = {};

      if (req.include('account')) {
        toInclude.account = account.toJSON();
      }

      res.serializer(Serializers.AccountCard)
      .ok(card.toJSON(), toInclude);
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

      console.log(err) // eslint-disable-line
      res.error();
    });
  },
};

export const GetAccountCardCollection = {
  validate: {

    params: {
      accountId: Joi.string().guid().required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { accountId, id } = req.params;
    const opts = { require: true };
    const account = Account.forge({ id: accountId });

    account.fetch(opts)
    .then(() => {
      if (credentials.accountId !== accountId) {
        throw new AuthenticationError;
      }

      const card = Card.forge();
      const query = { account_id: accountId };


      return card.where(query)
      .orderBy('createdAt')
      .fetchAll();
    })
    .then((cardCollection) => {
      const toInclude = {};

      if (req.include('account')) {
        toInclude.account = account.toJSON();
      }

      res.serializer(Serializers.AccountCard)
      .ok(cardCollection.toJSON(), toInclude);
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

      console.log(err) // eslint-disable-line
      res.error();
    });
  },
};

export const DeleteAccountCard = {
  validate: {

    params: {
      accountId: Joi.string().guid().required(),
      id: Joi.string().guid().required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { accountId, id } = req.params;
    const opts = { require: true };
    const account = Account.forge({ id: accountId });

    account.fetch(opts)
    .then(() => {
      if (credentials.accountId !== accountId) {
        throw new AuthenticationError;
      }

      return Card.forge({ id }).fetch(opts);
    })
    .then((card) => {
      card.relations.account = account;

      return card.destroy();
    })
    .then(() => {
      res.deleted();
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

      console.log(err) // eslint-disable-line
      res.error();
    });
  },
};
