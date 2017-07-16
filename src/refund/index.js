import Package from '../../package.json';
import * as Handlers from './handlers'; // eslint-disable-line


function refund(plugin, options, next) {
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

  next();
}

refund.attributes = {
  name: 'refundPlugin',
  version: Package.version,
};

export default refund;
