'use strict';

var acl = require('../../lib/acl');

module.exports = function(app) {
    // Root routing
    var assets = require('../../../app/controllers/assets.server.controller');

    app.route('/assets/:assetId')
        .get(assets.getOne)
        .put(assets.update)
        .delete(assets.remove);

    app.route('/assets/:assetId/settings')
        .get(assets.listSettings)
        .put(assets.updateSettings);

    app.route('/assets/:assetId/settings/reset')
        .get(assets.resetSettings);

    app.route('/assets/:assetId/settings/:settingKey')
        .get(assets.getSetting)
        .put(assets.updateSetting);

    app.route('/assets/:assetId/devices')
        .get(assets.listDevices);

    app.route('/assets/:assetId/devices/:deviceId/add')
        .post(assets.addDevice);

    app.route('/assets/:assetId/devices/:deviceId/remove')
        .delete(assets.removeDevice);
};
