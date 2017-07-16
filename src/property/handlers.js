import {
  merge as Merge,
  isNull as IsNull,
} from 'lodash';
import Async from 'async';
import Joi from 'joi';
import {
  NotFoundError,
  AuthenticationError,
  SoftDeleteError,
  DatabaseUniquenessError,
  StateError,
} from '../foundation/errors';
import { Property, PropertyCredential } from './models';
import * as Serializers from './serializers';


export const CreateProperty = {
  validate: {

    payload: {
      data: Joi.object({
        type: Joi.string().required().allow('property'),
        id: Joi.string().guid(),
        attributes: Joi.object({
          name: Joi.string().required(),
          url: Joi.string().required(),
        }).required(),

        relationships: Joi.object({
          account: Joi.object({
            data: Joi.object({
              type: Joi.string().required().allow('account'),
              id: Joi.string().guid().required(),
            }).required(),
          }).required(),
        }).required(),
      }).required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.getDataTopLevel();
    const accountId = req.getRelationship('account').id;
    const attributes = Merge(req.getAttributes(), { accountId }, { id });
    const property = Property.forge(attributes);

    if (credentials.accountId !== accountId) {
      res.unauthorized();
      return;
    }

    property.create()
    .then(() => {
      res.serializer(Serializers.Property)
      .created(property.toJSON());
    })
    .catch(() => {
      res.error();
    });
  },
};

export const GetProperty = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const opts = {
      require: true,
      softDelete: false,
      withRelated: ['account'],
    };
    const property = Property.forge({ id });

    property.fetch(opts)
    .then(() => {
      const account = property.related('account');

      if (credentials.accountId !== account.get('id')) {
        res.unauthorized();
        return;
      }

      res.serializer(Serializers.Property)
      .ok(property.toJSON());
    })
    .catch(() => {
      res.notFound();
    });
  },
};

export const GetPropertyCollection = {
  validate: {

    query: {
      filter: Joi.object({
        accountId: Joi.string().guid().required(),
        deleted: Joi.boolean().default(false, `Include deleted properties`),
      }).required(),
    },

  },
  auth: 'token-query-account',
  handler(req, res) {
    const { accountId, deleted } = req.query.filter;
    const opts = { softDelete: !deleted };
    const property = Property.forge();
    const query = { account_id: accountId };

    property.where(query)
    .orderBy('name')
    .fetchAll(opts)
    .then((collection) => {
      res.serializer(Serializers.Property)
      .ok(collection.toJSON());
    })
    .catch(() => {
      res.error();
    });
  },
};

export const UpdateProperty = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },
    payload: {
      data: Joi.object({
        type: Joi.string().required().allow('property'),
        id: Joi.string().guid(),
        attributes: Joi.object({
          name: Joi.string(),
          url: Joi.string(),
        }).required().or(['name', 'url']),

        relationships: Joi.object({
          request: Joi.object({
            data: Joi.object({
              type: Joi.string().required().allow('request'),
              id: Joi.string().guid().required(),
            }).required(),
          }),
        }),
      }),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const attributes = req.getAttributes();
    const property = Property.forge({ id });
    const opts = {
      require: true,
      withRelated: ['account'],
    };

    function fetchProperty(next) {
      property.fetch(opts)
      .then(() => {
        const account = property.related('account');

        if (credentials.accountId !== account.get('id')) {
          next(new AuthenticationError);
          return;
        }

        next(null);
      })
      .catch(() => {
        next(new NotFoundError);
      });
    }

    function updateProperty(next) {
      property.save(attributes, { patch: true })
      .then(() => {
        next(null);
      })
      .catch((err) => {
        next(err);
      });
    }

    Async.series([
      fetchProperty,
      updateProperty,
    ], (err) => {
      if (err instanceof NotFoundError) {
        res.notFound();
        return;
      }

      if (err instanceof AuthenticationError) {
        res.unauthorized();
        return;
      }

      if (err) {
        console.log(err); // eslint-disable-line
        res.error();
        return;
      }

      res.serializer(Serializers.Property)
      .ok(property.toJSON());
    });
  },
};

export const SoftDeleteProperty = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const property = Property.forge({ id });

    function fetchProperty(next) {
      const opts = {
        require: true,
        softDelete: false,
        withRelated: ['account', 'requests'],
      };

      property.fetch(opts)
      .then(() => {
        const account = property.related('account');

        if (credentials.accountId !== account.get('id')) {
          next(new AuthenticationError);
          return;
        }

        if (!IsNull(property.get('deletedAt'))) {
          next(new SoftDeleteError);
          return;
        }

        next(null);
      })
      .catch(() => {
        next(new NotFoundError);
      });
    }

    function deleteProperty(next) {
      const opts = {
        softDelete: Boolean(property.related('requests').length),
      };

      property.destroy(opts)
      .then(() => {
        next(null);
      })
      .catch((err) => {
        next(err);
      });
    }

    // TODO(digia): Delete any login credentials
    Async.series([
      fetchProperty,
      deleteProperty,
    ], (err) => {
      if (err instanceof NotFoundError) {
        res.notFound();
        return;
      }

      if (err instanceof AuthenticationError) {
        res.unauthorized();
        return;
      }

      if (err instanceof SoftDeleteError) {
        res.conflict();
        return;
      }

      if (err) {
        console.log(err); // eslint-disable-line
        res.error();
        return;
      }

      res.deleted();
    });
  },
};

export const RestoreProperty = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { id } = req.params;
    const opts = {
      require: true,
      softDelete: false,
      withRelated: ['account'],
    };
    const property = Property.forge({ id });

    function fetchProperty(next) {
      property.fetch(opts)
      .then(() => {
        const account = property.related('account');

        if (credentials.accountId !== account.get('id')) {
          next(new AuthenticationError);
          return;
        }

        if (IsNull(property.get('deletedAt'))) {
          next(new SoftDeleteError);
          return;
        }

        next(null);
      })
      .catch(() => {
        next(new NotFoundError);
      });
    }

    function restoreProperty(next) {
      property.restore()
      .then(() => {
        next(null);
      })
      .catch((err) => {
        next(err);
      });
    }

    Async.series([
      fetchProperty,
      restoreProperty,
    ], (err) => {
      if (err instanceof NotFoundError) {
        res.notFound();
        return;
      }

      if (err instanceof AuthenticationError) {
        res.unauthorized();
        return;
      }

      if (err instanceof SoftDeleteError) {
        res.badRequest();
        return;
      }

      if (err) {
        res.error();
        return;
      }

      res.serializer(Serializers.Property)
      .ok(property.toJSON());
    });
  },
};

export const GetPropertyCredentialCollection = {
  validate: {

    params: {
      propertyId: Joi.string().guid().required(),
    },

    query: {
      include: Joi.string().allow('property'),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { propertyId } = req.params;
    const opts = {
      require: true,
      withRelated: ['account'],
    };
    const property = Property.forge({ id: propertyId });

    property.fetch(opts)
    .then(() => {
      const account = property.related('account');

      if (credentials.accountId !== account.get('id')) {
        throw new AuthenticationError();
      }

      const credential = PropertyCredential().forge({}, { property });

      return credential.fetchAll();
    })
    .then((credentialList) => {
      const credentialJSON = credentialList.map(c => c.toJSON());
      const toInclude = {};

      if (req.include('property')) {
        toInclude.property = property.toJSON();
      }

      res.serializer(Serializers.PropertyCredential)
      .ok(credentialJSON, toInclude);
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

export const CreatePropertyCredential = {
  validate: {

    params: {
      propertyId: Joi.string().guid().required(),
    },

    query: {
      include: Joi.string().allow('property'),
    },

    payload: {
      data: Joi.object({
        type: Joi.string().required().allow('property-credential'),
        id: Joi.string().guid(),
        attributes: Joi.object({
          type: Joi.string().required(),
          identity: Joi.string(),
          authentication: Joi.string().required(),
        }).required()
        .with('identity', 'authentication'),
      }).required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { propertyId } = req.params;
    const { id } = req.getDataTopLevel();
    const attributes = Merge(req.getAttributes(), { propertyId }, { id });
    const opts = {
      require: true,
      withRelated: ['account'],
    };
    const property = Property.forge({ id: propertyId });

    property.fetch(opts)
    .then(() => {
      const account = property.related('account');

      if (credentials.accountId !== account.get('id')) {
        throw new AuthenticationError();
      }

      const credential = PropertyCredential().forge(attributes, { property });

      return credential.create();
    })
    .then((credential) => {
      const toInclude = {};

      if (req.include('property')) {
        toInclude.property = property.toJSON();
      }

      res.serializer(Serializers.PropertyCredential)
      .created(credential.toJSON(), toInclude);
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

      // Reasons in order of exception
      // - Attributes match a preexisting credential on enigma
      // - Property doesn't have a credentialKey
      if (err instanceof DatabaseUniquenessError ||
          err instanceof StateError) {
        res.conflict();
        return;
      }

      console.log(err) // eslint-disable-line
      res.error();
    });
  },
};

export const GetPropertyCredential = {
  validate: {

    params: {
      propertyId: Joi.string().guid().required(),
      id: Joi.string().guid().required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { propertyId, id } = req.params;
    const opts = {
      require: true,
      withRelated: ['account'],
    };
    const property = Property.forge({ id: propertyId });

    property.fetch(opts)
    .then(() => {
      const account = property.related('account');

      if (credentials.accountId !== account.get('id')) {
        throw new AuthenticationError();
      }

      const credential = PropertyCredential().forge({ id }, { property });

      return credential.fetch();
    })
    .then((credential) => {
      const toInclude = {};

      if (req.include('property')) {
        toInclude.property = property.toJSON();
      }

      res.serializer(Serializers.PropertyCredential)
      .ok(credential.toJSON(), toInclude);
    })
    .catch((err) => {
      // Reasons in order of exception
      // - Property wasn't found
      // - Credential not found on enigma
      if (err.message === 'EmptyResponse' ||
          err instanceof NotFoundError) {
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

export const UpdatePropertyCredential = {
  validate: {

    params: {
      propertyId: Joi.string().guid().required(),
      id: Joi.string().guid().required(),
    },

    query: {
      include: Joi.string().allow('property'),
    },

    payload: {
      data: Joi.object({
        type: Joi.string().required().allow('property-credential'),
        attributes: Joi.object({
          type: Joi.string(),
          identity: Joi.string(),
          authentication: Joi.string(),
        }).required().or(['type', 'identity', 'authentication']),
      }).required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { propertyId, id } = req.params;
    const attributes = req.getAttributes();
    const opts = {
      require: true,
      withRelated: ['account'],
    };
    const property = Property.forge({ id: propertyId });

    property.fetch(opts)
    .then(() => {
      const account = property.related('account');

      if (credentials.accountId !== account.get('id')) {
        throw new AuthenticationError();
      }

      const credential = PropertyCredential().forge({ id }, { property });

      return credential.update(attributes);
    })
    .then((credential) => {
      const toInclude = {};

      if (req.include('property')) {
        toInclude.property = property.toJSON();
      }

      res.serializer(Serializers.PropertyCredential)
      .ok(credential.toJSON(), toInclude);
    })
    .catch((err) => {
      // Reasons in order of exception
      // - Property wasn't found
      // - Credential not found on enigma
      if (err.message === 'EmptyResponse' ||
          err instanceof NotFoundError) {
        res.notFound();
        return;
      }

      if (err instanceof AuthenticationError) {
        res.unauthorized();
        return;
      }

      // Update attributes match a preexisting credential on enigma
      if (err instanceof DatabaseUniquenessError) {
        res.conflict();
        return;
      }

      console.log(err) // eslint-disable-line
      res.error();
    });
  },
};

export const DeletePropertyCredential = {
  validate: {

    params: {
      propertyId: Joi.string().guid().required(),
      id: Joi.string().guid().required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { propertyId, id } = req.params;
    const opts = {
      require: true,
      withRelated: ['account'],
    };
    const property = Property.forge({ id: propertyId });

    property.fetch(opts)
    .then(() => {
      const account = property.related('account');

      if (credentials.accountId !== account.get('id')) {
        throw new AuthenticationError();
      }

      const credential = PropertyCredential().forge({ id }, { property });

      return credential.destroy();
    })
    .then(() => {
      res.deleted();
    })
    .catch((err) => {
      // Reasons in order of exception
      // - Property wasn't found
      // - Credential not found on enigma
      if (err.message === 'EmptyResponse' ||
          err instanceof NotFoundError) {
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
