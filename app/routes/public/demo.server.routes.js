'use strict';

module.exports = function(app) {
    // Root routing
    var demo = require('../../../app/controllers/demo.server.controller');
    app.route('/demo/guelph/data/:serialNumber').get(demo.guelphdata);
    app.route('/demo/cisco/data').get(demo.ciscodata);
    app.route('/demo/devices').get(demo.devicelist);
    app.route('/demo/devices/:serialNumber/data').get(demo.devicedata);
};