import Package from '../../package.json';
import * as Handlers from './handlers';


function property(plugin, options, next) {
  plugin.route([

    {
      method: 'POST',
      path: '/property',
      config: Handlers.CreateProperty,
    },

    {
      method: 'GET',
      path: '/property',
      config: Handlers.GetPropertyCollection,
    },

    {
      method: 'GET',
      path: '/property/{id}',
      config: Handlers.GetProperty,
    },

    {
      method: ['PATCH', 'POST'],
      path: '/property/{id}',
      config: Handlers.UpdateProperty,
    },

    {
      method: 'DELETE',
      path: '/property/{id}',
      config: Handlers.SoftDeleteProperty,
    },

    {
      method: 'POST',
      path: '/property/{id}/restore',
      config: Handlers.RestoreProperty,
    },

    {
      method: 'GET',
      path: '/property/{propertyId}/credential',
      config: Handlers.GetPropertyCredentialCollection,
    },

    {
      method: 'POST',
      path: '/property/{propertyId}/credential',
      config: Handlers.CreatePropertyCredential,
    },

    {
      method: 'GET',
      path: '/property/{propertyId}/credential/{id}',
      config: Handlers.GetPropertyCredential,
    },

    {
      method: ['PATCH', 'POST'],
      path: '/property/{propertyId}/credential/{id}',
      config: Handlers.UpdatePropertyCredential,
    },

    {
      method: 'DELETE',
      path: '/property/{propertyId}/credential/{id}',
      config: Handlers.DeletePropertyCredential,
    },

  ]);

  next();
}

property.attributes = {
  name: 'propertyPlugin',
  version: Package.version,
};

export default property;
