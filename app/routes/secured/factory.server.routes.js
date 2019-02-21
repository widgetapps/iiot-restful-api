'use strict';

module.exports = function(app) {
	// Root routing
    var factory = require('../../../app/controllers/factory.server.controller');

    app.route('/factory/devices/:serialNumber')
        .delete(factory.remove);

    app.route('/factory/devices/:username/password')
        .put(factory.changePassword);

    app.route('/factory/devices/:type')
        .post(factory.insert);
};
