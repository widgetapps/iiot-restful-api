'use strict';

module.exports = function(app) {
	// Root routing
	var pdata = require('../../../app/controllers/publicdata.server.controller');
	app.route('/').get(pdata.index);

	app.route('/aggregatedtemperature').get(pdata.aggregatedTemperature);
};