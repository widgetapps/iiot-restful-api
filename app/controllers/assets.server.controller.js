'use strict';

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
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

        let promise = Asset.findById(req.params.assetId).populate('location').exec();

        promise.then(function(asset) {
            let authorized = false;

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

    Asset.findById(
        req.params.assetId,
        function (err, asset) {

            let authorized = false;

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

            if (!asset || err) {
                res.status(404).send({
                    message: 'Asset not found.'
                });
                return;
            }

            asset = _.assignIn(asset, req.body);

            asset.save(function(err, newAsset) {
                if (err){
                    res.status(400).send({
                        message: 'Error saving asset.'
                    });
                }

                newAsset.settings = undefined;
                newAsset.__v = undefined;

                newAsset.populate('location', function() {

                    newAsset.location.created = undefined;
                    newAsset.location.updated = undefined;
                    newAsset.location.client = undefined;
                    newAsset.location.assets = undefined;
                    newAsset.location.__v = undefined;

                    res.json(newAsset);

                });
            });

        }
    );
};

exports.remove = function(req, res) {
    Asset.findById(
        req.params.assetId,
        function (err, asset) {
            let authorized = false;

            switch (req.user.role) {
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

            if (!asset || err) {
                res.status(404).send({
                    message: 'Asset not found.'
                });
                return;
            }

            Device.find(
                {asset: mongoose.Types.ObjectId(asset._id)},
                function (err, devices) {
                    if (err || devices.length > 0) {
                        let word = 'device';
                        if (devices.length > 1) {
                            word = 'devices';
                        }
                        res.status(400).send({
                            message: 'This asset has ' + devices.length + ' ' + word + ' assigned to it. You must un-assign before deleting this asset.'
                        });
                        return;
                    }

                    asset.remove(function(err, removedAsset) {
                        if (err) {
                            res.status(400).send({
                                message: 'Database error.'
                            });
                            return;
                        }

                        res.json({
                            message: 'The Asset has been deleted.'
                        });
                        return;

                    });

                }
            );

        }
    );
};

exports.listDevices = function(req, res) {

};

exports.listSettings = function(req, res) {
    authorize.validate(endpoint, req, res, 'asset', function() {

        let promise = Asset.findById(req.params.assetId).exec();

        promise.then(function(asset) {
            let authorized = false;

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

exports.getSetting = function(req, res) {
    let promise = Asset.findOne({ _id: req.params.assetId, 'settings.key': req.params.settingKey }, {client: 1, 'settings.$': 1}).exec();

    promise.then(function(asset) {
        let authorized = false;

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
    let promise = Asset.findOne({ _id: req.params.assetId}, {client: 1, 'settings': 1}).exec();

    promise.then(function(asset) {
        let authorized = false;

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

        let updatedSettings = [];

        _.forEach(asset.settings, function (setting) {
            let settings = req.body;

            let found = _.find(settings, {key: setting.key});
            if (found && setting.key === found.key) {
                setting.value = found.value;
            }

            updatedSettings.push(setting);
        });

        asset.settings = updatedSettings;

        asset.save(function (err, savedAsset) {
            if (err){
                res.status(400).send({
                    message: 'Error saving settings.'
                });
            }

            sendConfigToDevice(req.app, savedAsset, function() {

                res.json(savedAsset.settings);

            });
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
        let assetId  = mongoose.Types.ObjectId(req.params.assetId),
            deviceId = mongoose.Types.ObjectId(req.params.deviceId);

        let assetPromise = Asset.findOne({ _id: assetId }).populate('location').exec();
        assetPromise.then(function (asset) {
            if (!asset) {
                res.status(404).send({
                    message: 'Asset not found'
                });
                return;
            }

            if (!asset.location || asset.location === null) {
                res.status(400).send({
                    message: 'The asset must be assigned to a location.'
                });
                return;
            }

            let devicePromise = Device.findOne({ _id: deviceId }).populate('sensors').exec();
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

                 let clientPromise = Client.findOne({ _id: asset.client}).exec();
                 clientPromise.then(function (client) {
                     if (!client) {
                         res.status(404).send({
                             message: 'Client not found'
                         });
                         return;
                     }

                     let defaultSettings = require('../lib/default.settings').settings;
                     let settings = [];

                     if (defaultSettings[device.type]) {
                         settings.push(...defaultSettings[device.type].base);
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
                             if(defaultSettings[device.type] && defaultSettings[device.type][sensorData.tagCode]) {
                                 settings.push(...defaultSettings[device.type][sensorData.tagCode]);
                             }

                             let fullTag = asset.location.tagCode + '_' + asset.tagCode + '_' + sensorData.tagCode,
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

                             asset.settings = settings;
                             asset.save(function (err, assetSaved) {
                                 if (err) {
                                     console.log('Error saving settings to the asset: ' + err);
                                 }

                                 sendConfigToDevice(req.app, assetSaved, function() {
                                     res.status(200).send({
                                         message: 'Device ' + device.serialNumber + ' assigned to asset ' + assetSaved.tagCode
                                     });
                                 });
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
        let deviceId = mongoose.Types.ObjectId(req.params.deviceId);

        let tagPromise = Tag.find( { device: deviceId } ).exec();

        tagPromise.then(function (tags) {
            async.each(tags, function (tag, callback) {

                let historical = {
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

                let devicePromise = Device.findOne({ _id: deviceId }).exec();
                devicePromise.then(function(device) {
                    if (!device) {
                        res.status(404).send({
                            message: 'Device not found'
                        });
                        return;
                    }

                    // Save the assetId to get the asset later.
                    let assetId = device.asset;

                    device.asset = null;
                    device.location = null;

                    device.save(function(err, savedDevice) {
                        if (err) {
                            res.status(400).send({
                                message: 'Error removing the device: ' + err
                            });
                            return;
                        }

                        // Find the asset and blank out the settings
                        Asset.findById(assetId, function(err, asset) {
                            if (err) {
                                console.log('Error finding the device asset.');
                            }

                            asset.settings = [];
                            asset.save(function (err, assetSaved) {
                                if (err) {
                                    console.log('Error saving blanked settings for asset.');
                                }

                                sendEmptyConfigToDevice(savedDevice, function() {
                                    res.json({
                                        message: 'Device ' + device.serialNumber + ' removed from asset'
                                    });
                                });
                            });
                        });

                    });
                });
            });
        }).catch(console.warn);

    });
};

function sendEmptyConfigToDevice(device, callback) {

    if (device.type !== 'hydrant') {
        callback();
    }

    let client  = mqtt.connect(config.mqtt, config.mqttoptions);

    client.on('error', function (error) {
        console.log('Error connecting to MQTT Server with username ' + config.mqttoptions.username + ' - ' + error);
    });

    client.on('connect', function () {
        console.log('Connected to MQTT server.');
        console.log('Publishing empty config topic ' + device.topicId + '/v1/configuration');
        try {
            client.publish(device.topicId + '/v1/configuration', '', {qos: 2, retain: true});
            console.log('Empty settings published.');
        } catch (e) {
            console.log('Error publishing empty settings: ' + e.toString());
        }
        client.end(false, function() {
            console.log('Disconnected from MQTT server.');
            callback();
        });
    });
}

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

    let promise = Device.findOne({asset: asset._id}).populate('asset').exec();

    promise.then(function(device) {

        if (!device) {
            callback();
            return;
        }

        let configSettings = {};
        // All hydrants need hydrophone settings, even 2 function. Set them up as zero values.
        configSettings['hydrophone-start'] = 0;
        configSettings['hydrophone-count'] = 0;
        configSettings['hydrophone-interval'] = 0;
        configSettings['hydrophone-on-time'] = 0;

        switch (device.type) {
            case 'hydrant':
                _.forEach(asset.settings, function (setting) {
                    let val = 0;
                    let settingKey = setting.key;

                    // Correct the setting key for pressure settings - hydrants expect a shortened key.
                    switch (setting.key) {
                        case 'pressure-on-time':
                            settingKey = 'p-on';
                            break;
                        case 'pressure-off-time':
                            settingKey = 'p-off';
                            break;
                    }

                    switch (setting.datatype) {
                        case 'int':
                            let multiplier = 1;

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
                            configSettings[settingKey] = val * multiplier;
                            break;
                        case 'double':
                            val = parseFloat(setting.value);
                            if (isNaN(val)) {
                                val = 0;
                            }
                            configSettings[settingKey] = val;
                            break;
                        case 'decimal':
                            val = parseFloat(setting.value);

                            if (isNaN(val)) {
                                val = bignumber(0).dp(2);
                            } else {
                                val = bignumber(val).dp(2);
                            }

                            configSettings[settingKey] = val;
                            break;
                        case 'date':
                            let timestamp = Date.parse(setting.value);

                            if (isNaN(timestamp) === false) {
                                configSettings[settingKey] = new Date(timestamp);
                            } else {
                                configSettings[settingKey] = new Date('1970-01-01T00:00:00');
                            }
                            break;
                    }
                });
                break;
            default:
                callback();
                return;
        }

        let client  = mqtt.connect(config.mqtt, config.mqttoptions);

        client.on('error', function (error) {
            console.log('Error connecting to MQTT Server with username ' + config.mqttoptions.username + ' - ' + error);
        });

        client.on('connect', function () {
            console.log('Connected to MQTT server.');
            console.log('Publishing config topic ' + device.topicId + '/v1/configuration: ' + JSON.stringify(configSettings));
            try {
                client.publish(device.topicId + '/v1/configuration', cbor.encodeOne(configSettings, cborOpts), {qos: 2, retain: true});
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
