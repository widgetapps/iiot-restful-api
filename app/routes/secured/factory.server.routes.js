'use strict';

module.exports = function(app) {
	// Root routing
    var factory = require('../../../app/controllers/factory.server.controller');

    app.route('/factory/devices/:topicId')
        .delete(factory.remove);

    app.route('/factory/devices/:topicId/password')
        .put(factory.changePassword);

    app.route('/factory/devices/:type')
        .post(factory.insert);
};
