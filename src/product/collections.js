import CollectionFactory from '../foundation/collection-factory';
import { Product, Sku } from './models.js';


export const ProductCollection = CollectionFactory(Product);
export const SkuCollection = CollectionFactory(Sku);
