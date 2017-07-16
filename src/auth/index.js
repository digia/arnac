import HapiAuthJWT from 'hapi-auth-jwt';
import Package from '../../package.json';
import * as Handlers from './handlers';
import * as Strategies from './strategies';


function authentication(plugin, options, next) {
  // Register hapi-auth-jwt
  plugin.register(HapiAuthJWT, (err) => {
    if (err) {
      console.error('HapiAuthJWT plugin registration: ', err); // eslint-disable-line
    }
  });

  plugin.auth.strategy('token', 'jwt', Strategies.tokenOptions);
  plugin.auth.strategy('token-query-account', 'jwt', Strategies.tokenQueryAccountOptions);
  plugin.auth.strategy('token-query-user', 'jwt', Strategies.tokenQueryUserOptions);


  // Auth Routes

  plugin.route([
    {
      method: 'POST',
      path: '/auth/register',
      config: Handlers.register,
    },

    {
      method: 'POST',
      path: '/auth/authenticate',
      config: Handlers.authenticate,
    },

    {
      method: 'GET',
      path: '/auth/is-authenticated',
      config: Handlers.isAuthenticated,
    },

    {
      method: 'POST',
      path: '/auth/refresh',
      config: Handlers.refresh,
    },

    {
      method: 'POST',
      path: '/auth/password-reset',
      config: Handlers.initializePasswordReset,
    },

    {
      method: 'POST',
      path: '/auth/password-reset/{email}/{token}',
      config: Handlers.passwordReset,
    },
  ]);

  next();
}

authentication.attributes = {
  name: 'authenticationPlugin',
  version: Package.version,
};

export default authentication;
