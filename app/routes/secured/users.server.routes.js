'use strict';

module.exports = function(app) {
	// Root routing
    var users = require('../../../app/controllers/users.server.controller');

    app.route('/users')
        .get(users.list);

    app.route('/users/:id')
        .get(users.getOne)
        .put(users.update);

    app.route('/users/:id/password')
        .put(users.resetPassword);
};