'use strict';

require('dotenv').load();

const Uuid = require('node-uuid');
const Authority = require('../../../lib/auth/authority');
const _ = require('lodash');


// NOTE(digia): Products and sku's redacted
const products = {
};

const skuList = [
];


exports.seed = function (knex, Promise) {
  const productList = _.values(products);

  return knex('product').whereIn('name', productList.map(p => p.name))
    .then((dbProductList) => {
      if (dbProductList.length == productList.length) {
        console.warn('Products exist, moving on...');
        return dbProductList;
      }

      const productToAddList = _.differenceBy(productList, dbProductList, 'name');
      const msg = productToAddList.map(p => p.name).join(', ');

      console.log('Products missing, adding the following:', msg);

      // Get all of the products, again, and add their id to the products object
      return knex('product').insert(productToAddList)
        .then(() => knex('product').select())
        .then((dbProductList) => {
          return dbProductList.map(p => products[p.name.toLowerCase()].id = p.id);
        });
    })
    .then((dbProductList) => {
    /**
     * Make sure the static sku's are within the database. Create all of the skus
     * that are missing from the DB.
     */
    return knex('sku').whereIn('sku', skuList.map(s => s.sku))
      .then((dbSkuList) => {
        if (dbSkuList.length == skuList.length) {
          console.warn('Skus exist, moving on...');
          return dbSkuList;
        }

        const skuToAddList = _.differenceBy(skuList, dbSkuList, 'sku');
        const skuMsg = skuToAddList.map(s => s.sku).join(', ');

        console.log('Skus missing, adding the following:', skuMsg);

        return knex('sku').insert(skuToAddList)
          .then(() => knex('sku').select());
      })
    })
    .catch(err => console.error(err));
};
