import Joi from 'joi';
import ModelFactory from '../foundation/model-factory';
import Db from '../database';
import { Request } from '../request/models';


export const Comment = ModelFactory('comment', {

  hasTimestamps: ['createdAt', 'updatedAt'],
  soft: true,

  rules: {
    message: Joi.string().required(),
    userId: Joi.number().required(),
  },

  commentable() {
    return this.morphTo('commentable', Request);
  },

  user() {
    return this.belongsTo('User');
  },

});

Db.model('Comment', Comment);
