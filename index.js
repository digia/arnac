/* eslint-disable func-names */
/* eslint-disable no-console */
'use strict'; // eslint-disable-line

require('dotenv').load();

const isTest = (process.env.NODE_ENV === 'test');

const Good = require('good');
const GoodConsole = require('good-console');
const Blipp = require('blipp');
const Cors = require('hapi-cors');
const Hapi = require('hapi');
const HapiQs = require('hapi-qs');
const Config = require('config');
const digiaAPI = (isTest) ? require('./src') : require('./lib');


// Setup server
const connections = Config.get('server.connections');

const server = new Hapi.Server();

server.connection(connections.api);


// Setup plugins
const goodPlugin = {
  register: Good,
  options: {
    reporters: [{
      reporter: GoodConsole,
      events: {
        request: '*',
        response: '*',
        // log: '*',
        // error: '*',
      },
    }],
  },
};

const blippPlugin = {
  register: Blipp,
  options: {
    showAuth: true,
  },
};

const corsPlugin = {
  register: Cors,
  options: {
    methods: ['POST', 'GET', 'DELETE', 'OPTIONS'],
  },
};

const hapiQsPlugin = {
  register: HapiQs,
  options: {
    queryString: true,
    payload: false,
  },
};

const digiaPlugin = {
  register: digiaAPI,
};

const plugins = [
  // TODO(digia): Fix color issue displaying dynamic properties
  blippPlugin, // Display routes table on startup
  goodPlugin,
  corsPlugin,
  hapiQsPlugin,
  digiaPlugin,
];


// Register plugins
server.register(plugins, function (err) {
  if (err) {
    throw err;
  }
});


// We want to see request-errors
server.on('request-error', function (req, res) {
  console.error('request-error');
  console.dir(res);
});


// Dont boot server if it's being imported
if (!module.parent) {
  server.start(function () {
    console.log('Server running at: ', server.info.uri);
  });
}

module.exports = server;
