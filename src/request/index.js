import Package from '../../package.json';
import * as Handlers from './handlers';


function request(plugin, options, next) {
  plugin.route([

    // Request
    // NOTE(digia): Redacted...

    // Request Comments
    {
      method: 'POST',
      path: '/request-comment',
      config: Handlers.CreateRequestComment,
    },

    {
      method: 'GET',
      path: '/request-comment',
      config: Handlers.GetRequestCommentCollection,
    },

    {
      method: 'GET',
      path: '/request-comment/{id}',
      config: Handlers.GetRequestComment,
    },

    {
      method: ['PATCH', 'POST'],
      path: '/request-comment/{id}',
      config: Handlers.UpdateRequestComment,
    },

    {
      method: 'DELETE',
      path: '/request-comment/{id}',
      config: Handlers.SoftDeleteRequestComment,
    },

    {
      method: 'POST',
      path: '/request-comment/{id}/restore',
      config: Handlers.RestoreRequestComment,
    },

  ]);

  next();
}

request.attributes = {
  name: 'requestPlugin',
  version: Package.version,
};

export default request;
