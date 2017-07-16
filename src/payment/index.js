import Package from '../../package.json';
import * as Handlers from './handlers';


function payment(plugin, options, next) {
  plugin.route([

    {
      method: 'GET',
      path: '/payment/{id}',
      config: Handlers.GetPayment,
    },

    {
      method: 'GET',
      path: '/payment',
      config: Handlers.GetPaymentCollection,
    },

  ]);

  next();
}

payment.attributes = {
  name: 'paymentPlugin',
  version: Package.version,
};

export default payment;
