'use strict';

// Create a route for health test
// Need a route that will run tests on the hydrant/hub
module.exports = function(app) {
	// Root routing
	var core = require('../../../app/controllers/core.server.controller');
	app.route('/').get(core.index);

	app.route('/dbcheck').get(core.dbCheck);
	// app.route('/createhash/:serialNumber').get(core.getHashes);

	//app.route('/5a5b46ab7ba759d09ee3100bb8627ce0971e2dbb2d51594c9861d0ea760ba6e2').get(core.migrateMqttLogins);
};
