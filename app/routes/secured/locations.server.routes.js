'use strict';

module.exports = function(app) {
    // Root routing
    var locations = require('../../../app/controllers/locations.server.controller');

    app.route('/locations/:locationId')
        .get(locations.getOne)
        .put(locations.update)
        .delete(locations.remove);
};
