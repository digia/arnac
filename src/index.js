import Package from '../package.json';
import Decorators from './decorators';
import Auth from './auth';
import Account from './account';
import User from './user';
import Property from './property';
import Request from './request';
import Order from './order';
import Invoice from './invoice';
import Payment from './payment';
import Refund from './refund';
import Subscription from './subscription';

// Import to register the models within the DB
import { Address } from './address/models'; // eslint-disable-line
import { Comment } from './comment/models'; // eslint-disable-line
import { LineItem, Product, Sku } from './product/models'; // eslint-disable-line
import { Sku as SkuSerializer} from './product/serializers'; // eslint-disable-line

function digiaAPI(plugin, options, next) {
 plugin.route([
    {
      method: 'GET',
      path: '/',
      handler(req, res) {
        res({
          name: Package.name,
          description: Package.description,
          version: Package.version,
        });
      },
    },
  ]);

  plugin.register([
    Decorators,
    Auth,
    Account,
    User,
    Property,
    Request,
    Order,
    Invoice,
    Payment,
    Refund,
    Subscription,
  ], (err) => {
    if (err) {
      throw err;
    }
  });

  next();
}

digiaAPI.attributes = {
  pkg: Package,
};


export default digiaAPI;
