'use strict';

// require('events').EventEmitter.prototype._maxListeners = 0;

/**
 * Module dependencies.
 */
var init = require('./config/init')(),
	config = require('./config/config'),
	mongoose = require('mongoose'),
	chalk = require('chalk');

/**
 * Main application entry file.
 * Please note that the order of loading is important.
 */

// Bootstrap db connection

var dbOptions = {
    server: {
        auto_reconnect:true,
        socketOptions: {
            poolSize: 10,
            keepAlive: 1,
            connectTimeoutMS: 30000
        }
    },
    replset: {
        socketOptions: {
            poolSize: 10,
            keepAlive: 1,
            connectTimeoutMS : 30000
        }
    }
};

var conn = mongoose.connection;
conn.on('connecting', function() {
    console.log('connecting');
});
conn.on('error', function(error) {
    console.error('Error in MongoDb connection: ' + error);
    mongoose.disconnect();
});
conn.on('connected', function() {
    console.log('connected!');
});
conn.once('open', function() {
    console.log('connection open');
});
conn.on('reconnected', function () {
    console.log('reconnected');
});
conn.on('disconnected', function() {
    console.log('disconnected');
    console.log('DB URI is: ' + config.db);
    mongoose.connect(config.db, dbOptions);
});

mongoose.Promise = require('bluebird');
//assert.equal(query.exec().constructor, require('bluebird'));

//mongoose.Promise = global.Promise;
//assert.equal(query.exec().constructor, global.Promise);

var db = mongoose.connect(config.db, dbOptions);

// Init the express application
var app = require('./config/express')(db);

// Start the app by listening on <port>
app.listen(config.port, config.ip);

// Expose app
var exports = module.exports = app;

// Logging initialization
console.log('Terepac ONE API started on port ' + config.port + ' with IP ' + config.ip);