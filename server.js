'use strict';

// require('events').EventEmitter.prototype._maxListeners = 0;

/**
 * Module dependencies.
 */
var init = require('./config/init')(),
	config = require('./config/config'),
	mongoose = require('mongoose'),
	chalk = require('chalk');

mongoose.Promise = global.Promise;

/**
 * Main application entry file.
 * Please note that the order of loading is important.
 */

// Bootstrap db connection
var db = mongoose.connect(config.db, function(err) {
	if (err) {
		console.error(chalk.red('Could not connect to MongoDB!'));
		console.log(chalk.red(err));
	}
});

// Init the express application
var app = require('./config/express')(db);

// Start the app by listening on <port>
app.listen(config.port, config.ip);

// Expose app
var exports = module.exports = app;

// Logging initialization
console.log('Terepac ONE API started on port ' + config.port + ' with IP ' + config.ip);