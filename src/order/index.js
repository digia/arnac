import Package from '../../package.json';
import * as Handlers from './handlers';


function order(plugin, options, next) {
  plugin.route([

    {
      method: 'GET',
      path: '/order/{id}',
      config: Handlers.GetOrder,
    },

    {
      method: 'GET',
      path: '/order',
      config: Handlers.GetOrderCollection,
    },

    {
      method: 'POST',
      path: '/order/{id}/approve',
      config: Handlers.ApproveOrder,
    },

    {
      method: 'POST',
      path: '/order/{id}/reject',
      config: Handlers.RejectOrder,
    },

    {
      method: 'POST',
      path: '/order/{id}/invoice',
      config: Handlers.InvoiceOrder,
    },

    {
      method: 'GET',
      path: '/order-item/{id}',
      config: Handlers.GetOrderItem,
    },

    {
      method: 'GET',
      path: '/order-item',
      config: Handlers.GetOrderItemCollection,
    },

  ]);

  next();
}

order.attributes = {
  name: 'orderPlugin',
  version: Package.version,
};

export default order;
