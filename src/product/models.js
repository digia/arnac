import Joi from 'joi';
import Uuid from 'node-uuid';
import ModelFactory from '../foundation/model-factory';
import Db from '../database';
import { Order } from '../order/models';
import { Invoice } from '../invoice/models';
import LineItemCalculator from '../product/line-item-calculator';


const intervalList = [
  'Day',
  'Week',
  'Month',
  'Year',
];

export const Plan = ModelFactory('plan', {

  hasTimestamps: ['createdAt', 'updatedAt'],
  soft: true,

  rules: {
    name: Joi.string().required(),
    interval: Joi.number().min(0).max(intervalList.length - 1).required(),
    intervalCount: Joi.number().required(),
  },

  virtuals: {
    frequency: {
      get() {
        let interval = this.get('interval');

        if (!interval) interval = 0;

        return intervalList[interval];
      },
      set(value) {
        const idx = intervalList.indexOf(Capitalize(value));
        let message;

        if (idx === -1) {
          message = `${value} frequency does not map to a interval.`;
          throw Error(message);
        }

        this.set('interval', idx);

        return this;
      },
    },

    total() {
      const items = this.related('planItems');

      return LineItemCalculator(items.toJSON()).subtotal();
    },
  },

  planItems() {
    return this.morphMany(LineItem, 'lineable');
  },

}, {

  intervals: intervalList,
});


export const LineItem = ModelFactory('line_item', {

  soft: false,

  defaults: {
    quantity: 0,
  },

  rules: {
    amount: Joi.number().required(),
    currency: Joi.string().required(),
    quantity: Joi.number().required(),
    description: Joi.string(),
  },

  initialize() {
    this.on('saving', this.handleCurrencyFormat, this);
  },

  virtuals: {

    total() {
      return this.get('quantity') * this.get('amount');
    },
  },

  sku() {
    return this.belongsTo('Sku');
  },

  lineable() {
    return this.morphTo('lineable', Order, Invoice, Plan);
  },

  /**
   * Duplicate is the same as clone except that duplicate clears any
   * _previousAttributes and reset the changed flag.
   *
   * Additionally it allows the passing in of different lineable id and type.
   *
   */
  duplicate(
    lineableId = this.get('lineableId'),
    lineableType = this.get('lineableType'),
    makeId = false
  ) {
    const cloned = Db.Model.prototype.clone.apply(this);

    // Delete the id attribute in order for the defaultTo to apply
    // cloned.set('id', null) won't work here, it'll throw `NOT NULL` error
    delete cloned.attributes.id;

    cloned.set('lineableId', lineableId);
    cloned.set('lineableType', lineableType);

    if (makeId) {
      cloned.set('id', Uuid.v4());
    }

    cloned._reset(); // NOTE(digia): Sorry, reaching into private...

    return cloned;
  },

  handleCurrencyFormat(model) {
    const currency = model.get('currency');

    return new Promise((resolve, reject) => {
      if (currency) {
        model.set('currency', currency.toUpperCase());
      }

      resolve(true);
    });
  },
});


export const Product = ModelFactory('product', {

  hasTimestamps: ['createdAt', 'updatedAt'],
  soft: true,

  rules: {
    name: Joi.string().required(),
    description: Joi.string(),
  },

  skus() {
    return this.hasMany('Sku');
  },

});


export const Sku = ModelFactory('sku', {

  rules: {
    sku: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string(),
    price: Joi.number().required(),
    currency: Joi.string().required(),
  },

  product() {
    return this.belongsTo('Product');
  },

  lineItems() {
    return this.morphMany(LineItem, 'lineable');
  },

});


Db.model('LineItem', LineItem);
Db.model('Product', Product);
Db.model('Sku', Sku);
Db.model('Plan', Plan);
