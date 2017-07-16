import Package from '../../package.json';
import * as Handlers from './handlers';


function user(plugin, options, next) {
  plugin.route([

    {
      method: 'GET',
      path: '/user/{id}',
      config: Handlers.GetUser,
    },

    {
      method: ['PATCH', 'POST'],
      path: '/user/{id}',
      config: Handlers.UpdateUser,
    },

    {
      method: ['PATCH', 'POST'],
      path: '/user/{id}/password',
      config: Handlers.UpdateUserPassword,
    },

    {
      method: 'DELETE',
      path: '/user/{id}',
      config: Handlers.SoftDeleteUser,
    },

  ]);

  next();
}

user.attributes = {
  name: 'userPlugin',
  version: Package.version,
};

export default user;
