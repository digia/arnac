import Package from '../../package.json';
import * as Handlers from './handlers';


function invoice(plugin, options, next) {
  plugin.route([

    {
      method: 'GET',
      path: '/invoice/{id}',
      config: Handlers.GetInvoice,
    },

    {
      method: 'GET',
      path: '/invoice',
      config: Handlers.GetInvoiceCollection,
    },

    {
      method: 'POST',
      path: '/invoice/{id}/pay',
      config: Handlers.PayInvoice,
    },

    {
      method: 'GET',
      path: '/invoice-item/{id}',
      config: Handlers.GetInvoiceItem,
    },

    {
      method: 'GET',
      path: '/invoice-item',
      config: Handlers.GetInvoiceItemCollection,
    },

  ]);

  next();
}

invoice.attributes = {
  name: 'invoicePlugin',
  version: Package.version,
};

export default invoice;
