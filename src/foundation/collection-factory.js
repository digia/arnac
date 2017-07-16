import {
  camelCase as CamelCase,
  merge as Merge,
  reduce as Reduce,
  isArray as IsArray,
} from 'lodash';
import Db from '../database';


export default function CollectionFactory(model, proto = {}, klass = {}) {
  if (!model) {
    throw new Error('A bookshelf model must be supplied as the first argument.');
  }

  /**
   * Helper function for creating a new collection instance
   *
   * options.formatKeys can be passed to skip the key formatting
   */
  function forge(originalModels = [], options = {}) {
    const modelList = IsArray(originalModels) ? originalModels : [originalModels];

    if (options.formatKeys && !options.formatKeys) {
      return new this(modelList, options);
    }

    const formattedModelList = modelList.map((model) => {
      return Reduce(model, (accum, val, key) => {
        accum[CamelCase(key)] = val;
        return accum;
      }, {});
    });

    return new this(formattedModelList, options);
  }

  return Db.Collection.extend({ model, ...proto }, { forge, ...klass });
}
