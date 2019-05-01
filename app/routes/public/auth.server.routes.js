'use strict';

module.exports = function(app) {
    let auth = require('../../../app/controllers/auth.server.controller');
    app.route('/authenticate').post(auth.authenticate);
    app.route('/login').post(auth.login);
    app.route('/logout').get(auth.logout);
};
