'use strict';

module.exports = function(app) {
    var auth = require('../../../app/controllers/auth.server.controller');
    app.route('/authenticate').get(auth.authenticate);
};