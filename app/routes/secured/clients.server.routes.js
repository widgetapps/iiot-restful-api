'use strict';

module.exports = function(app) {
	// Root routing
    var clients = require('../../../app/controllers/clients.server.controller');

    app.route('/devices')
        .get(devices.list);

    app.route('/devices/:serialNumber')
        .get(devices.getOne)
        .put(devices.updateDevice);

    app.route('/devices/:serialNumber/settings')
        .get(devices.getSettings)
        .put(devices.updateSettings);

    app.route('/devices/:serialNumber/measurements')
        .get(devices.getMeasurements);
};