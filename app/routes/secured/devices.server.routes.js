'use strict';

module.exports = function(app) {
	// Root routing
    var devices = require('../../../app/controllers/devices.server.controller');

    app.route('/devices')
        .get(devices.list);

    app.route('/devices/:deviceId')
        .get(devices.getOne)
        .put(devices.updateDevice);

    app.route('/devices/:deviceId/sensors')
        .get(devices.getSensors);

    app.route('/devices/:deviceId/sensors/:sensorId')
        .get(devices.getSensor);

    app.route('/devices/:deviceId/sensors/:sensorId/limits')
        .get(devices.getLimits)
        .put(devices.updateLimits);

    app.route('/devices/:deviceId/settings')
        .get(devices.getSettings)
        .put(devices.updateSettings);

    app.route('/devices/:deviceId/onboard/:clientId')
        .post(devices.onboard);
};
