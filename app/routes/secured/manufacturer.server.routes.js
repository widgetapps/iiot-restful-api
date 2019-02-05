'use strict';

module.exports = function(app) {
	// Root routing
    var manufacturer = require('../../../app/controllers/manufacturer.server.controller');

    app.route('/manufacturer/devices/:topicId')
        .delete(manufacturer.remove);

    app.route('/manufacturer/devices/:topicId/password')
        .put(manufacturer.changePassword);

    app.route('/manufacturer/devices/:type')
        .post(manufacturer.insert);
};
