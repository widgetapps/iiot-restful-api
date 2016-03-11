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

    app.route('/clients/:id/users')
        .get(clients.getUsers)
        .post(clients.insertUser);
};