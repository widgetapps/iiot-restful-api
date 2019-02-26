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
    bignumber = require('bignumber.js'),
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
                case 'manufacturer':
                case 'admin':
                case 'manager':
                    if (req.user.client.toString() === asset.client.toString() || _.includes(req.user.resellerClients, asset.client)) {
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
            res.status(400).send({
                message: 'Error with the database.'
            });
        });
    });

};

exports.update = function(req, res) {

    Asset.findByIdAndUpdate(
        req.params.assetId,
        req.body,
        {new: true},
        (err, asset) => {
            var authorized = false;

            switch (req.user.role) {
                case 'user':
                    if (req.user.client.toString() === asset.client.toString()) {
                        authorized = true;
                    }
                    break;
                case 'manufacturer':
                case 'admin':
                case 'manager':
                    if (req.user.client.toString() === asset.client.toString() || _.includes(req.user.resellerClients, asset.client)) {
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

            if (err) {
                res.status(400).send({
                    message: 'Error with the database.'
                });
            }

            if (!asset) {
                res.status(404).send({
                    message: 'Asset not found.'
                });
            }

            asset.settings = undefined;
            asset.__v = undefined;

            asset.populate('location', function() {

                asset.location.created = undefined;
                asset.location.updated = undefined;
                asset.location.client = undefined;
                asset.location.assets = undefined;
                asset.location.__v = undefined;

                res.json(asset);

            });
        }
    );
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
                case 'manufacturer':
                case 'admin':
                case 'manager':
                    if (req.user.client.toString() === asset.client.toString() || _.includes(req.user.resellerClients, asset.client)) {
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

    // TODO: Need to allow a user manage setting keys for an asset. Maybe use a setting key map by device type? Also add unit for each setting.

    Asset.findOneAndUpdate(
        { '_id': req.params.assetId},
        {
            '$set': {
                updated: new Date(),
                settings: [{
                    key: 'pressure-interval',
                    name: 'pressure-interval',
                    datatype: 'int',
                    range: [1, 1440],
                    unit: 'minutes',
                    value: 5
                },{
                    key: 'battery-interval',
                    name: 'battery-interval',
                    datatype: 'int',
                    range: [1, 1440],
                    unit: 'minutes',
                    value: 60
                },{
                    key: 'temperature-interval',
                    name: 'temperature-interval',
                    datatype: 'int',
                    range: [1, 1440],
                    unit: 'minutes',
                    value: 60
                },{
                    key: 'connect-interval',
                    name: 'connect-interval',
                    datatype: 'int',
                    range: [1, 1440],
                    unit: 'minutes',
                    value: 10
                },{
                    key: 'high-limit',
                    name: 'high-limit',
                    datatype: 'decimal',
                    range: [-101.3, 2397],
                    unit: 'kPa',
                    value: 2379.46
                },{
                    key: 'low-limit',
                    name: 'low-limit',
                    datatype: 'decimal',
                    range: [-101.3, 2397],
                    unit: 'kPa',
                    value: -99.98
                },{
                    key: 'dead-band',
                    name: 'dead-band',
                    datatype: 'decimal',
                    range: [10, 2500],
                    unit: 'kPa',
                    value: 555
                },{
                    key: 'pre-roll',
                    name: 'pre-roll',
                    datatype: 'int',
                    range: [0, 300],
                    unit: 'seconds',
                    value: 0
                },{
                    key: 'post-roll',
                    name: 'post-roll',
                    datatype: 'int',
                    range: [0, 300],
                    unit: 'seconds',
                    value: 0
                },{
                    key: 'start-time',
                    name: 'start-time',
                    datatype: 'date',
                    unit: 'date',
                    range: '',
                    value: ''
                },{
                    key: 'rssi-interval',
                    name: 'rssi-interval',
                    datatype: 'int',
                    range: [1, 1440],
                    unit: 'minutes',
                    value: 10
                },{
                    key: 'hydrophone-start',
                    name: 'hydrophone-start',
                    datatype: 'int',
                    range: [0, 86399],
                    unit: 'seconds',
                    value: 25200
                },{
                    key: 'hydrophone-count',
                    name: 'hydrophone-count',
                    datatype: 'int',
                    range: [0, 3600],
                    unit: 'events per day',
                    value: 5
                },{
                    key: 'hydrophone-interval',
                    name: 'hydrophone-interval',
                    datatype: 'int',
                    range: [0, 86400],
                    unit: 'seconds',
                    value: 1800
                },{
                    key: 'hydrophone-on-time',
                    name: 'hydrophone-on-time',
                    datatype: 'int',
                    range: [0, 86400],
                    unit: 'seconds',
                    value: 300
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
            case 'manufacturer':
            case 'admin':
            case 'manager':
                if (req.user.client.toString() === asset.client.toString() || _.includes(req.user.resellerClients, asset.client)) {
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

exports.updateSettings = function (req, res) {

    // TODO: Update this to update all settings in one call.
    /**
     * Find the asset.
     * Get the settings
     * Loop through each setting and update value
     * Save the document
     */
    var promise = Asset.findOne({ _id: req.params.assetId}, {client: 1, 'settings': 1}).exec();

    promise.then(function(asset) {
        var authorized = false;

        switch (req.user.role) {
            case 'user':
                if (req.user.client.toString() === asset.client.toString()) {
                    authorized = true;
                }
                break;
            case 'manufacturer':
            case 'admin':
            case 'manager':
                if (req.user.client.toString() === asset.client.toString() || _.includes(req.user.resellerClients, asset.client)) {
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

        _.forEach(req.body, function (setting) {

        });

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
                updated: new Date(),
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

            if (!asset.location || asset.location === null) {
                res.status(400).send({
                    message: 'The asset most belong to a location.'
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

                 if (device.asset && device.asset !== null) {
                     res.status(400).send({
                         message: 'This device is already assigned to an asset.'
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
                                 message: 'Device ' + device.serialNumber + ' assigned to asset ' + asset.tagCode
                             });
                         });

                     });
                 }).catch(console.warn);
             }).catch(console.warn);
        }).catch(console.warn);

    });
};

exports.removeDevice = function(req, res) {
    authorize.validate(endpoint, req, res, 'manager', function() {
        var deviceId = mongoose.Types.ObjectId(req.params.deviceId);

        var tagPromise = Tag.find( { device: deviceId } ).exec();

        tagPromise.then(function (tags) {
            async.each(tags, function (tag, callback) {

                var historical = {
                    start: tag.activeStart,
                    end: new Date(),
                    deviceId: deviceId
                };
                tag.historical.push(historical);

                tag.active = false;
                tag.activeStart = null;
                tag.device = null;

                tag.save(function (err, savedTag) {
                    if (err) {
                        res.status(400).send({
                            message: 'Error removing the device: ' + err
                        });
                        return;
                    }

                    callback();

                });
            }, function (err) {
                if (err) {
                    res.status(400).send({
                        message: 'Error removing the device: ' + err
                    });
                    return;
                }

                var devicePromise = Device.findOne({ _id: deviceId }).exec();
                devicePromise.then(function(device) {
                    if (!device) {
                        res.status(404).send({
                            message: 'Device not found'
                        });
                        return;
                    }

                    device.asset = null;
                    device.location = null;

                    device.save(function(err, savedDevice) {
                        if (err) {
                            res.status(400).send({
                                message: 'Error removing the device: ' + err
                            });
                            return;
                        }

                        res.json({
                            message: 'Device ' + device.serialNumber + ' removed from asset'
                        });

                    });
                });
            });
        }).catch(console.warn);

    });
};

function sendConfigToDevice(app, asset, callback) {

    // Set the CBOR options to handle decimals properly.
    const cborOpts = { genTypes: [ bignumber, (gen, obj) => {
        if (obj.isNaN()) {
            return false;
        }
        if (!obj.isFinite()) {
            return false;
        }

        if (!(gen._pushTag(4) &&
            gen._pushInt(2, 4))) {
            return false;
        }

        const dec = obj.decimalPlaces();
        if (dec !== 0) {
            const slide = obj.times(new bignumber(10).pow(dec));
            if (!gen._pushIntNum(-dec)) {
                return false;
            }
            return gen._pushIntNum(slide.toNumber());
        }
        else {
            if (!gen._pushIntNum(0)) {
                return false;
            }
            return gen._pushIntNum(obj.toNumber());
        }
    }]};

    var promise = Device.findOne({asset: asset._id}).populate('asset').exec();

    promise.then(function(device) {

        if (!device) {
            callback();
            return;
        }

        var configSettings = {};

        switch (device.type) {
            case 'hydrant':
                _.forEach(device.asset.settings, function (setting) {
                    var val = 0;
                    switch (setting.datatype) {
                        case 'int':
                            var multiplier = 1;

                            switch (setting.unit) {
                                case 'minutes':
                                    multiplier = 60;
                                    break;
                                case 'hours':
                                    multiplier = 3600;
                                    break;
                            }

                            val = parseInt(setting.value);
                            if (isNaN(val)) {
                                val = 0;
                            }
                            configSettings[setting.key] = val * multiplier;
                            break;
                        case 'double':
                            val = parseFloat(setting.value);
                            if (isNaN(val)) {
                                val = 0;
                            }
                            configSettings[setting.key] = val;
                            break;
                        case 'decimal':
                            val = parseFloat(setting.value);

                            if (isNaN(val)) {
                                val = bignumber(0).dp(2);
                            } else {
                                val = bignumber(val).dp(2);
                            }

                            configSettings[setting.key] = val;
                            break;
                        case 'date':
                            var timestamp = Date.parse(setting.value);

                            if (isNaN(timestamp) === false) {
                                configSettings[setting.key] = new Date(timestamp);
                            } else {
                                configSettings[setting.key] = new Date('1970-01-01T00:00:00');
                            }
                            break;
                    }
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
            console.log('Publishing config topic ' + device.serialNumber + '/v1/configuration: ' + JSON.stringify(configSettings));
            try {
                client.publish(device.serialNumber + '/v1/configuration', cbor.encodeOne(configSettings, cborOpts), {qos: 2, retain: true});
                console.log('Settings published.');
            } catch (e) {
                console.log('Error publishing settings: ' + e.toString());
            }
            client.end(false, function() {
                console.log('Disconnected from MQTT server.');
                callback();
            });
        });
    });
}
