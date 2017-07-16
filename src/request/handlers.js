import {
  get as Get,
  set as Sett,
  merge as Merge,
  difference as Difference,
  isArray as IsArray,
  isUndefined as IsUndefined,
  isEmpty as IsEmpty,
  chain as Chain,
  values as Values,
} from 'lodash';
import Joi from 'joi';
import Async from 'async';
import {
  NotFoundError, AuthenticationError, DatabaseRelationError, StateError,
  SoftDeleteError,
} from '../foundation/errors';
import Db from '../database';
import { Comment } from '../comment/models';
import { User } from '../user/models';
import { Request } from './models';
import { RequestCollection, RequestCommentCollection } from './collections';
import * as Serializers from './serializers';


// Request
// NOTE(digia): Request handlers redacted

// Request Comment

export const CreateRequestComment = {
  validate: {

    payload: {
      data: Joi.object({
        type: Joi.string().required().allow('request-comment'),
        id: Joi.string().guid(),
        attributes: Joi.object({
          message: Joi.string().required(),
        }).required(),

        relationships: Joi.object({

          user: Joi.object({
            data: Joi.object({
              type: Joi.string().required().allow('user'),
              id: Joi.string().guid().required(),
            }).required(),
          }).required(),

          request: Joi.object({
            data: Joi.object({
              type: Joi.string().required().allow('request'),
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
    const userId = req.getRelationship('user').id;
    const requestId = req.getRelationship('request').id;
    const opts = { require: true, withRelated: ['account'] };

    Promise.all([
      User.forge({ id: userId }).fetch(opts),
      Request.forge({ id: requestId }).fetch(opts),
    ])
      .then(([user, request]) => {
        const { id } = req.getDataTopLevel();
        const accountId = request.related('account').get('id');
        const attributes = { ...req.getAttributes(), ...{ userId, requestId, id } };

        const comment = RequestCollection.forge().makeRequestComment(attributes);

        // Can't create a comment representing yourself as a different user
        // Can't comment on a request that doesn't belong to your account
        if (credentials.userId !== userId || credentials.accountId !== accountId) {
          throw new AuthenticationError();
        }

        if (request.isDraft()) {
          throw new StateError();
        }

        return comment.create();
      })
      .then((comment) => {
        res.serializer(Serializers.RequestComment)
          .created(comment.toJSON());
      })
      .catch((err) => {
        // BadData because the relationships were passed in via the payload
        if (err.message === 'EmptyResponse') {
          res.badData();
          return;
        }

        if (err instanceof AuthenticationError) {
          res.unauthorized();
          return;
        }

        if (err instanceof StateError) {
          res.conflict();
          return;
        }

        console.log(err); // eslint-disable-line
        res.error();
      });
  },
};

export const GetRequestComment = {
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
      withRelated: ['user', 'user.account']
    };

    const comment = Comment.forge({ id });

    comment.fetch(opts)
      .then(() => {
        const toInclude = {};
        const user = comment.related('user');
        const account = user.related('account');
        const request = comment.related('request');

        if (credentials.accountId !== account.get('id')) {
          throw new AuthenticationError();
        }

        if (req.include('user')) {
          toInclude.user = user.toJSON();
        }

        res.serializer(Serializers.RequestComment)
          .ok(comment.toJSON(), toInclude);
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

export const GetRequestCommentCollection = {
  validate: {

    query: {
      include: Joi.string(),
      filter: Joi.object({
        requestId: Joi.string().guid().required(),
        userId: Joi.string().guid(),
        deleted: Joi.boolean(),
      }),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { requestId } = req.query.filter;
    const userId = Get(req.query, 'filter.userId', null);
    const deleted = Get(req.query, 'filter.deleted', false);
    const opts = {
      require: true,
      withRelated: ['account', 'comments', 'comments.user', {
        comments(qb) {
          if (userId) {
            qb.where('user_id', userId);
          }

          if (!deleted) {
            qb.whereNull('deleted_at');
          }

          qb.orderBy('created_at');
        },
      }],
    };

    const request = Request.forge({ id: requestId });

    request.fetch(opts)
      .then(() => {
        const toInclude = {};
        const account = request.related('account');
        const comments = request.related('comments');

        if (credentials.accountId !== account.get('id')) {
          throw new AuthenticationError();
        }

        if (req.include('user')) {
          toInclude.user = comments.invoke('related', 'user').map(u => u.toJSON());
        }

        if (req.include('request')) {
          toInclude.request = request.toJSON();
        }

        res.serializer(Serializers.RequestComment)
          .ok(comments.invoke('toJSON'), toInclude);
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

export const UpdateRequestComment = {
  validate: {

    params: {
      requestId: Joi.string().guid().required(),
      id: Joi.string().guid().required(),
    },

    payload: {
      data: Joi.object({
        type: Joi.string().required().allow('request.comment'),
        id: Joi.string().guid(),
        attributes: Joi.object({
          message: Joi.string().required(),
        }).required(),
      }).required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { requestId, id } = req.params;
    const attributes = req.getAttributes();
    const opts = {
      require: true,
      withRelated: ['account', 'comments', {
        comments(qb) {
          qb.where('id', id);
        },
      }],
    };
    const request = Request.forge({ id: requestId });

    function fetchRequest(next) {
      request.fetch(opts)
      .then(() => {
        next(null, request.related('comments').pop());
      })
      .catch(() => {
        next(new NotFoundError);
      });
    }

    function checkComment(comment, next) {
      const account = request.related('account');

      if (!comment) {
        next(new NotFoundError);
        return;
      }

      if (comment.isDeleted()) {
        next(new StateError);
        return;
      }

      // Can't update a comment that doesn't belong to you
      if (credentials.userId !== comment.get('userId') ||
          credentials.accountId !== account.get('id')) {
        next(new AuthenticationError);
        return;
      }

      next(null, comment);
    }

    function updateComment(comment, next) {
      comment.save(attributes, { patch: true })
      .then(() => {
        next(null, comment);
      })
      .catch((err) => {
        next(err);
      });
    }

    Async.waterfall([
      fetchRequest,
      checkComment,
      updateComment,
    ], (err, comment) => {
      if (err instanceof NotFoundError) {
        res.notFound();
        return;
      }

      if (err instanceof AuthenticationError) {
        res.unauthorized();
        return;
      }

      if (err instanceof StateError) {
        res.conflict();
        return;
      }

      if (err) {
        console.log(err); // eslint-disable-line
        res.error();
        return;
      }

      res.serializer(Serializers.RequestComment)
      .ok(comment.toJSON());
    });
  },
};

export const RestoreRequestComment = {
  validate: {

    params: {
      requestId: Joi.string().guid().required(),
      id: Joi.string().guid().required(),
    },

  },
  auth: 'token',
  handler(req, res) {
    const { credentials } = req.auth;
    const { requestId, id } = req.params;
    const opts = {
      require: true,
      withRelated: ['account', 'comments', {
        comments(qb) {
          qb.where('id', id);
        },
      }],
    };
    const request = Request.forge({ id: requestId });

    function fetchRequest(next) {
      request.fetch(opts)
      .then(() => {
        next(null, request.related('comments').pop());
      })
      .catch(() => {
        next(new NotFoundError);
      });
    }

    function checkComment(comment, next) {
      const account = request.related('account');

      if (!comment) {
        next(new NotFoundError);
        return;
      }

      if (!comment.isDeleted()) {
        next(new StateError);
        return;
      }

      // Can't restore a comment that doesn't belong to you
      if (credentials.userId !== comment.get('userId') ||
          credentials.accountId !== account.get('id')) {
        next(new AuthenticationError);
        return;
      }

      next(null, comment);
    }

    function restoreComment(comment, next) {
      comment.restore()
      .then(() => {
        next(null, comment);
      })
      .catch((err) => {
        next(err);
      });
    }

    Async.waterfall([
      fetchRequest,
      checkComment,
      restoreComment,
    ], (err, comment) => {
      if (err instanceof NotFoundError) {
        res.notFound();
        return;
      }

      if (err instanceof AuthenticationError) {
        res.unauthorized();
        return;
      }

      if (err instanceof StateError) {
        res.conflict();
        return;
      }

      if (err) {
        console.log(err); // eslint-disable-line
        res.error();
        return;
      }

      res.serializer(Serializers.RequestComment)
      .ok(comment.toJSON());
    });
  },
};

export const SoftDeleteRequestComment = {
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
      withRelated: ['user'],
    };

    const comment = Comment.forge({ id });

    comment.fetch(opts)
      .then(() => {
        const user = comment.related('user');

        if (credentials.userId !== user.get('id')) {
          throw new AuthenticationError();
        }

        if (comment.isDeleted()) {
          throw new StateError();
        }

        return comment.destroy();
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

        if (err instanceof StateError) {
          res.conflict();
          return;
        }

        console.log(err); // eslint-disable-line
        res.error();
      });
  },
};

