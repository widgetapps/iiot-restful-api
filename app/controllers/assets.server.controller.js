'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    config = require('../../config/config'),
    mqtt = require('mqtt'),
    cbor = require('cbor'),
    Client = require('@terepac/terepac-models').Client,
    Asset = require('@terepac/terepac-models').Asset,
    Device = require('@terepac/terepac-models').Device,
    Tag = require('@terepac/terepac-models').Tag,
    _ = require('lodash'),
    async = require('async'),
    authorize = require('../lib/authorize.server.lib'),
    endpoint = 'asset';

exports.getOne = function(req, res) {
    authorize.validate(endpoint, req, res, 'asset', function() {

        var promise = Asset.findById(req.params.assetId).populate('location').exec();

        promise.then(function(asset) {
            var authorized = false;

            switch (req.user.role) {
                case 'user':
                    if (req.user.client.toString() === asset.client.toString()) {
                        authorized = true;
                    }
                    break;
                case 'admin':
                case 'manager':
                    if (req.user.client.toString() === asset.client.toString() || _.contains(req.user.resellerClients, asset.client)) {
                        authorized = true;
                    }
                    break;
                case 'super':
                    authorized = true;
                    break;
            }

            if (!authorized) {
                res.status(401).send({
                    message: 'You are not authorized to access this resource.'
                });
                return;
            }

            res.json(asset);

        }).catch(function(error) {
            res.status(404).send({
                message: 'Error with the database.'
            });
        });
    });

};

exports.update = function(req, res) {

};

exports.listDevices = function(req, res) {

};

exports.listSettings = function(req, res) {
    authorize.validate(endpoint, req, res, 'asset', function() {

        var promise = Asset.findById(req.params.assetId).exec();

        promise.then(function(asset) {
            var authorized = false;

            switch (req.user.role) {
                case 'user':
                    if (req.user.client.toString() === asset.client.toString()) {
                        authorized = true;
                    }
                    break;
                case 'admin':
                case 'manager':
                    if (req.user.client.toString() === asset.client.toString() || _.contains(req.user.resellerClients, asset.client)) {
                        authorized = true;
                    }
                    break;
                case 'super':
                    authorized = true;
                    break;
            }

            if (!authorized) {
                res.status(401).send({
                    message: 'You are not authorized to access this resource.'
                });
                return;
            }

            res.json(asset.settings);

        }).catch(function(error) {
            res.status(404).send({
                message: 'Error with the database.'
            });
        });
    });
};

exports.resetSettings = function(req, res) {
    if (req.user.role !== 'super') {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    Asset.findOneAndUpdate(
        { '_id': req.params.assetId},
        {
            '$set': {
                settings: [{
                    key: "pressure-interval",
                    name: "pressure-interval",
                    datatype: "int",
                    range: [1, 100],
                    value: 10
                },{
                    key: "battery-interval",
                    name: "battery-interval",
                    datatype: "int",
                    range: [1, 100],
                    value: 10
                },{
                    key: "temperature-interval",
                    name: "temperature-interval",
                    datatype: "int",
                    range: [1, 100],
                    value: 10
                },{
                    key: "connect-interval",
                    name: "connect-interval",
                    datatype: "int",
                    range: [1, 100],
                    value: 10
                },{
                    key: "high-limit",
                    name: "high-limit",
                    datatype: "double",
                    range: [1.0, 500.0],
                    value: 80.0
                },{
                    key: "low-limit",
                    name: "low-limit",
                    datatype: "double",
                    range: [1.0, 500.0],
                    value: 80.0
                },{
                    key: "dead-band",
                    name: "dead-band",
                    datatype: "double",
                    range: [1.0, 500.0],
                    value: 80.0
                },{
                    key: "pre-roll",
                    name: "pre-roll",
                    datatype: "int",
                    range: [1, 100],
                    value: 10
                },{
                    key: "post-roll",
                    name: "post-roll",
                    datatype: "int",
                    range: [1, 100],
                    value: 10
                },{
                    key: "start-time",
                    name: "start-time",
                    datatype: "date",
                    range: "",
                    value: ""
                }]
            }
        },
        function (err, asset) {

            if (!asset || err) {
                res.status(404).send({
                    message: 'Asset not found.'
                });
            }

            res.json({
                message: 'Settings have been reset'
            });
        }
    );
};

exports.getSetting = function(req, res) {
    var promise = Asset.findOne({ _id: req.params.assetId, 'settings.key': req.params.settingKey }, {client: 1, 'settings.$': 1}).exec();

    promise.then(function(asset) {
        var authorized = false;

        switch (req.user.role) {
            case 'user':
                if (req.user.client.toString() === asset.client.toString()) {
                    authorized = true;
                }
                break;
            case 'admin':
            case 'manager':
                if (req.user.client.toString() === asset.client.toString() || _.contains(req.user.resellerClients, asset.client)) {
                    authorized = true;
                }
                break;
            case 'super':
                authorized = true;
                break;
        }

        if (!authorized) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
        }

        if (!asset) {
            res.status(404).send({
                message: 'Asset not found.'
            });
        }

        res.json(asset.settings[0]);

    }).catch(function(error) {
        res.status(404).send({
            message: 'Error with the database. ' + error
        });
    });
};

exports.updateSetting = function(req, res) {
    Asset.findOneAndUpdate(
        { '_id': req.params.assetId, 'settings.key': req.params.settingKey},
        {
            '$set': {
                'settings.$.value': req.body.value
            }
        },
        { new: true },
        function (err, asset) {

            if (!asset || err) {
                res.status(404).send({
                    message: 'Setting not found.'
                });
            }

            sendConfigToDevice(req.app, asset, function() {

                res.json({
                    key: req.params.settingKey,
                    value: req.body.value
                });

            });
        }
    );
};

// Remember to add/update the tag when a device is added to an asset. Think about other things that need updating!
exports.addDevice = function(req, res) {
    authorize.validate(endpoint, req, res, 'manager', function() {
        var assetId  = mongoose.Types.ObjectId(req.params.assetId),
            deviceId = mongoose.Types.ObjectId(req.params.deviceId);

        var assetPromise = Asset.findOne({ _id: assetId }).populate('location').exec();
        assetPromise.then(function (asset) {
            if (!asset) {
                res.status(404).send({
                    message: 'Asset not found'
                });
                return;
            }

             var devicePromise = Device.findOne({ _id: deviceId }).populate('sensors').exec();
             devicePromise.then(function (device) {
                 if (!device) {
                     res.status(404).send({
                         message: 'Device not found'
                     });
                     return;
                 }

                 var clientPromise = Client.findOne({ _id: asset.client}).exec();
                 clientPromise.then(function (client) {
                     if (!client) {
                         res.status(404).send({
                             message: 'Client not found'
                         });
                         return;
                     }

                     device.asset = mongoose.Types.ObjectId(asset._id);
                     device.location = mongoose.Types.ObjectId(asset.location._id);
                     device.save(function (err, deviceSaved) {
                         if (err) {
                             res.status(400).send({
                                 message: 'Error adding the device: ' + err
                             });
                             return;
                         }

                         async.each(device.sensors, function (sensorData, callback) {
                             var fullTag = asset.location.tagCode + '_' + asset.tagCode + '_' + sensorData.tagCode,
                                 query = {'tag.full': fullTag},
                                 options = { upsert: true, new: true, setDefaultsOnInsert: true },
                                 update = {
                                     tag: {
                                         full: fullTag,
                                         clientTagCode: client.tagCode,
                                         locationTagCode: asset.location.tagCode,
                                         assetTagCode: asset.tagCode,
                                         sensorTagCode: sensorData.tagCode
                                     },
                                     description: {
                                         location: asset.location.description,
                                         asset: asset.description,
                                         sensor: sensorData.description
                                     },
                                     unit: sensorData.unit,
                                     active: true,
                                     activeStart: new Date(),
                                     client: client._id,
                                     device: deviceId,
                                     asset: assetId
                                 };
                             console.log('Tag: ' + fullTag);

                             Tag.findOneAndUpdate(query, update, options, function(err, result) {
                                 if (err) {
                                     res.status(400).send({
                                         message: 'Error adding the device: ' + err
                                     });
                                     return;
                                 }

                                 callback();
                             });

                         }, function (err) {
                             if (err) {
                                 res.status(400).send({
                                     message: 'Error adding the device: ' + err
                                 });
                                 return;
                             }

                             res.status(200).send({
                                 message: 'Device ' + device.serialNumber + ' added to asset ' + asset.tagCode
                             });
                         });

                     });
                 }).catch(console.warn);
             }).catch(console.warn);
        }).catch(console.warn);

    });
};

// Remember to add/update the tag when a device is removed from an asset
exports.removeDevice = function(req, res) {
    authorize.validate(endpoint, req, res, 'manager', function() {
        /*
         1) Get the device's tags
         2) Tag: Place the activeStart as the historical start & the current date as the historical end with the deviceId
         3) Tag: Clear the activeStart
         4) Tag: Clear the deviceId
         5) Tag: Set as not active
         6) Get the device
         7) Clear out the asset_id, location_id (make sure the asset_id's match) & alert limits
         8) Save the device
         */
        var assetId  = mongoose.Types.ObjectId(req.params.assetId),
            deviceId = mongoose.Types.ObjectId(req.params.deviceId);

    });
};

function sendConfigToDevice(app, asset, callback) {
    var promise = Device.findOne({asset: asset._id}).populate('asset').exec();

    promise.then(function(device) {

        if (!device) {
            callback();
            return;
        }

        var configSettings = {};

        switch (device.type) {
            case 'hydrant':
                configSettings = device.asset.settings.map(function(setting) {
                    var rObj = {};
                    rObj[setting.key] = setting.value;
                    return rObj;
                });
                break;
            default:
                callback();
                return;
        }

        var client  = mqtt.connect(config.mqtt, config.mqttoptions);

        client.on('error', function (error) {
            console.log('Error connecting to MQTT Server with username ' + config.mqttoptions.username + ' - ' + error);
        });

        client.on('connect', function () {
            console.log('Connected to MQTT server.');
            console.log('Publishing config: ' + JSON.stringify(configSettings));
            client.publish(device.serialNumber + '/v1/configuration', cbor.encode(configSettings), {qos: 2});
            client.end(false, function() {
                console.log('Disconnected from MQTT server.');
                callback();
            });
        });
    });
}