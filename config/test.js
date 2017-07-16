'use strict';

module.exports = {
  database: {
    // debug: true,
    connection: {
      database: process.env.DB_DATABASE+'_test',
    },
  },
  enigma: {
    host: 'http://localhost:9000',
  },
}

