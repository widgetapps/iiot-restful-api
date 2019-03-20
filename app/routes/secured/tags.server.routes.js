'use strict';

var acl = require('../../lib/acl');

module.exports = function(app) {
    // Root routing
    var tags = require('../../../app/controllers/tags.server.controller');

    app.route('/tags/:tagId/history')
        .get(tags.getHistory);
};
