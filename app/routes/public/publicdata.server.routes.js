'use strict';

module.exports = function(app) {
	// Root routing
	var pdata = require('../../../app/controllers/publicdata.server.controller');
	app.route('/').get(pdata.index);

    app.route('/aggregated/datanumbers').get(pdata.dataNumbers);
	app.route('/aggregated/:sensor').get(pdata.aggregated);
	//app.route('/status/devices').get(pdata.deviceStatus);
    app.route('/status/assets').get(pdata.listAssets);
    app.route('/status/asset/:location/:asset').get(pdata.assetStatus);
    app.route('/status/devices').get(pdata.listDevices);
    app.route('/status/devices/:type').get(pdata.listDevices);
};
