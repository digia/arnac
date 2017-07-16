import Joi from 'joi';
import * as Serializers from './serializers'; // eslint-disable-line


export const GetRefund = {
  validate: {

    params: {
      id: Joi.string().guid().required(),
    },

  },
  auth: 'token',
  handler() {},
};
