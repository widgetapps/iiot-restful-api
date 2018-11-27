'use strict';

module.exports = function(app) {
	// Root routing
    var clients = require('../../../app/controllers/clients.server.controller');

    app.route('/clients')
        .get(clients.list)
        .post(clients.insert);

    app.route('/clients/:id')
        .get(clients.getOne)
        .put(clients.update);

    app.route('/clients/:id/tags')
        .get(clients.listTags);

    app.route('/clients/:id/telemetries/search')
        .get(clients.searchTelemetry);

    app.route('/clients/:id/locations')
        .get(clients.listLocations)
        .post(clients.insertLocation);

    app.route('/clients/:id/assets')
        .get(clients.listAssets)
        .post(clients.insertAsset);

    app.route('/clients/:id/devices')
        .get(clients.listDevices)
        .post(clients.insertDevice);

    app.route('/clients/:id/events')
        .get(clients.listEvents);

    app.route('/clients/:id/users')
        .get(clients.getUsers)
        .post(clients.insertUser);
};
