'use strict';


// Create a route for health test
// Need a route that will run tests on the hydrant/hub
module.exports = function(app) {
	// Root routing
	var core = require('../../../app/controllers/core.server.controller');
	app.route('/').get(core.index);
	app.route('/addUser').get(core.addUser);
	//app.route('/addata').get(core.addData);
};