import Package from '../../package.json';
// import * as Handlers from './handlers'; // eslint-disable-line


function subscription(plugin, options, next) {
  // plugin.route([

  //   {
  //     method: 'GET',
  //     path: '/refund/{id}',
  //     config: Handlers.GetPayment,
  //   },

  //   {
  //     method: 'GET',
  //     path: '/payment',
  //     config: Handlers.GetPaymentCollection,
  //   },

  // ]);
  //
  // Create
  // Cancel
  // Upgrade ?
  // Downgrade ?

  next();
}

subscription.attributes = {
  name: 'subscriptionPlugin',
  version: Package.version,
};

export default subscription;

