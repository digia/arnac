import Joi from 'joi';
import { StateError } from '../foundation/errors';
import ModelFactory from '../foundation/model-factory';
import Db from '../database';
import { Comment } from '../comment/models';


// NOTE(digia): Majority of the request functionality has been redacted
export const Request = ModelFactory('request', {

  hasTimestamps: ['createdAt', 'updatedAt'],
  soft: true,

  defaults: {
    state: 0,
  },

  rules: {
    state: Joi.number().min(0).max(6).required(),
    subject: Joi.string().required(),
    body: Joi.string().required(),
  },

  account() {
    return this.belongsTo('Account');
  },

  properties() {
    return this.belongsToMany('Property', 'property_request', 'request_id', 'property_id');
  },

  orders() {
    return this.hasMany('Order');
  },

  comments() {
    return this.morphMany(Comment, 'commentable');
  },

});


Db.model('Request', Request);
