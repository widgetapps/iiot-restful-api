'use strict';

module.exports = function(app) {
    // Root routing
    var assets = require('../../../app/controllers/assets.server.controller');

    app.route('/assets/:assetId')
        .get(assets.getOne)
        .put(assets.update);

    app.route('/assets/:assetId/settings')
        .get(assets.listSettings);

    app.route('/assets/:assetId/settings/:settingKey')
        .get(assets.getSetting)
        .put(assets.updateSetting);

    app.route('/assets/:assetId/devices')
        .get(assets.listDevices);

    app.route('/assets/:assetId/devices/:deviceId/add')
        .post(assets.addDevice);

    app.route('/asset/:assetId/devices/:deviceId/remove')
        .delete(assets.removeDevice);
};