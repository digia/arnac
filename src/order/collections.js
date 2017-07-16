import CollectionFactory from '../foundation/collection-factory';
import { Order } from './models.js';
import { LineItem } from '../product/models.js';


export const OrderCollection = CollectionFactory(Order, {

  makeOrderItem(data) {
    const {
      amount, currency, quantity, description, orderId, skuId, id,
    } = data;

    if (!orderId) {
      throw new TypeError(`orderId is required to create a order item`);
    }

    const attributes = {
      lineableType: 'order',
      lineableId: orderId,
      amount,
      currency,
      quantity,
      description,
    };

    if (id) {
      attributes.id = id;
    }

    if (skuId) {
      attributes.skuId = skuId;
    }

    return LineItem.forge(attributes);
  },
});
