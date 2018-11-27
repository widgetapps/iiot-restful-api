'use strict';

module.exports = function(app) {
    // Root routing
    var events = require('../../../app/controllers/events.server.controller');

    app.route('/events/:eventId')
        .get(events.getOne);

    app.route('/events/:eventId/telemetries')
        .get(events.searchTelemetry);
};
