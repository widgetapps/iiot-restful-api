'use strict';

module.exports = function(app) {
	// Root routing
    var api = require('../../../app/controllers/api.server.controller');
    var devices = require('../../../app/controllers/devices.server.controller');

    app.route('/hello')
        .get(api.hello);

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