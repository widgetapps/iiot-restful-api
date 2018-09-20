'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    errorHandler = require('./errors.server.controller'),
    Client = require('@terepac/terepac-models').Client,
    Asset = require('@terepac/terepac-models').Asset,
    Device = require('@terepac/terepac-models').Device,
    Tag = require('@terepac/terepac-models').Tag,
    _ = require('lodash'),
    moment = require('moment'),
    async = require('async'),
    randomstring = require('randomstring'),
    authorize = require('../lib/authorize.server.lib'),
    endpoint = 'asset';

exports.getOne = function(req, res) {
    // TODO: Get this v2 ready
    authorize.validate(endpoint, req, res, 'asset', function() {

        var promise = Asset.findById(req.params.assetId).exec();

        promise.then(function(asset) {
            var authorized = false;

            switch (req.user.role) {
                case 'user':
                    if (req.user.client === asset.client) {
                        authorized = true;
                    }
                    break;
                case 'manager':
                case 'admin':
                    if (req.user.client === asset.client || _.contains(req.user.resellerClients, asset.client)) {
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
    // TODO: Get this v2 ready
    authorize.validate(endpoint, req, res, 'asset', function() {

        var promise = Asset.findById(req.params.assetId).exec();

        promise.then(function(asset) {
            var authorized = false;

            switch (req.user.role) {
                case 'user':
                    if (req.user.client === asset.client) {
                        authorized = true;
                    }
                    break;
                case 'manager':
                case 'admin':
                    if (req.user.client === asset.client || _.contains(req.user.resellerClients, asset.client)) {
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
    // TODO: Get this v2 ready
    var promise = Asset.findOne({ _id: req.params.assetId, 'settings.key': req.params.settingKey }, {client: 1, 'settings.$': 1}).exec();

    promise.then(function(asset) {
        var authorized = false;

        switch (req.user.role) {
            case 'user':
                if (req.user.client === asset.client) {
                    authorized = true;
                }
                break;
            case 'manager':
            case 'admin':
                if (req.user.client === asset.client || _.contains(req.user.resellerClients, asset.client)) {
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

        res.json(asset.settings[0]);

    }).catch(function(error) {
        res.status(404).send({
            message: 'Error with the database. ' + error
        });
    });
};

exports.updateSetting = function(req, res) {
    // TODO: Get this v2 ready
    Asset.findOneAndUpdate(
        { '_id': req.params.assetId, 'settings.key': req.params.settingKey},
        {
            '$set': {
                'settings.$.value': req.body.value
            }
        },
        function (err, asset) {

            if (!asset || err) {
                res.status(404).send({
                    message: 'Setting not found.'
                });
            }

            res.json({
                key: asset.settings[0].key,
                value: asset.settings[0].value
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

             var devicePromise = Device.findOne({ _id: deviceId }).populate('sensors.sensor').exec();
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
                     /* TODO: Copy the alert limits from the Asset to the Device. The models need to be updated to do this. */
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
                                         sensor: sensorData.sensor.description
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
