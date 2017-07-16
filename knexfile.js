'use strict';

var dotenv = require('dotenv').load(),
    config = require('config').database;


module.exports = {
  development: config,
  staging: config,
  production: config,
  test: config,
};
