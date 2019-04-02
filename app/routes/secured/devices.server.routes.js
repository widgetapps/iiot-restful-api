'use strict';

module.exports = function(app) {
	// Root routing
    const devices = require('../../../app/controllers/devices.server.controller');

    app.route('/devices')
        .get(devices.list);

    app.route('/devices/:deviceId')
        .get(devices.getOne)
        .put(devices.updateDevice);

    app.route('/devices/:deviceId/sensors')
        .get(devices.getSensors);

    app.route('/devices/:deviceId/sensors/:sensorId')
        .get(devices.getSensor);

    app.route('/devices/:deviceId/offboard')
        .put(devices.offboard);

    app.route('/devices/:deviceId/onboard/:clientId')
        .post(devices.onboard)
        .put(devices.onboard);
};
