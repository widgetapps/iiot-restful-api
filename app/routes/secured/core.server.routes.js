'use strict';


// Create a route for health test
// Need a route that will run tests on the hydrant/hub
module.exports = function(app) {
	// Root routing
    var api = require('../../../app/controllers/api.server.controller');
    app.route('/hello').get(api.hello);
};