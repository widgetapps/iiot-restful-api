'use strict';

module.exports = function(app) {
	// Root routing
    var clients = require('../../../app/controllers/clients.server.controller'),
        alerts = require('../../../app/controllers/alerts.server.controller'),
        alertGroups = require('../../../app/controllers/alertgroups.server.controller');

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

    app.route('/clients/:id/telemetries/latest/:tag')
        .get(clients.getLatestTelemetry);

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

    app.route('/clients/:id/alerts')
        .get(alerts.list)
        .post(alerts.insert);

    app.route('/clients/:id/alerts/:alertId')
        .get(alerts.get)
        .put(alerts.update)
        .delete(alerts.remove);

    app.route('/clients/:id/alertgroups')
        .get(alertGroups.list)
        .post(alertGroups.insert);

    app.route('/clients/:id/alertgroups/:code')
        .get(alertGroups.get)
        .put(alertGroups.update)
        .delete(alertGroups.remove);
};
