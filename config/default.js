'use strict';

// NOTE(digia): Hack? It works right now, but not sure if this is best.
require('dotenv').load();


module.exports = {
  server: {
    connections: {
      api: {
        port: 8000,
        labels: ['api'],
        // routes: {
        //   cors: true,
        // },
      },
    },
  },
  auth: {
    token: {
      jwt: {
        key: process.env.TOKEN_JWT_KEY,
      },
      expiresIn: '10h',
    },
  },
  database: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    },
    migrations: {
      directory: __dirname+'/database/migration'
    },
    seeds: {
      directory: __dirname+'/database/seed'
    },
  },
  hashids: {
    salt: process.env.HASHIDS_SALT,
    minLength: 5,
    alphabet: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_-'
  },
  blocks: {
    daysAlive: 365,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
  },
  enigma: {
    host: 'http://localhost:9000',
    authToken: process.env.ENIGMA_AUTH_TOKEN,
  },
};
