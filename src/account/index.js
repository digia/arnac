import Package from '../../package.json';
import * as Handlers from './handlers';


function account(plugin, options, next) {
  plugin.route([

    {
      method: 'GET',
      path: '/account/{id}',
      config: Handlers.GetAccount,
    },

    {
      method: ['PATCH', 'POST'],
      path: '/account/{id}',
      config: Handlers.UpdateAccount,
    },

    {
      method: 'GET',
      path: '/account/{accountId}/card/{id}',
      config: Handlers.GetAccountCard,
    },

    {
      method: 'GET',
      path: '/account/{accountId}/card',
      config: Handlers.GetAccountCardCollection,
    },

    {
      method: 'POST',
      path: '/account/{accountId}/card',
      config: Handlers.CreateAccountCard,
    },

    {
      method: 'DELETE',
      path: '/account/{accountId}/card/{id}',
      config: Handlers.DeleteAccountCard,
    },

  ]);

  next();
}

account.attributes = {
  name: 'accountPlugin',
  version: Package.version,
};

export default account;
