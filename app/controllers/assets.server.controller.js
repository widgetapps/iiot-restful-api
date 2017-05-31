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

};

exports.update = function(req, res) {

};

exports.listDevices = function(req, res) {

};

// Remember to add/update the tag when a device is added to an asset. Think about other things that need updating!
exports.addDevice = function(req, res) {
    authorize.validate(endpoint, req, res, 'manager', function() {
        /*
        1) Get the asset, populate the location
        2) Get the device, populate the sensors
        3) Save the device with the new asset_id & location_id
        4) Build the tags from the device sensors (Get the tag if it exists)
            - The tag JSON
            - The description JSON
            - The current date for activeStart
            - Set the tag as active
        5) Insert/update tags into the collection
         */
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

                                 res.status(200).send({
                                     message: 'Device added to asset'
                                 });
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
         1) Get the device
         2) Clear out the asset_id & location_id (make sure the asset_id's match)
         3) Save the device
         4) Get the device's tags
         5) Tag: Place the activeStart as the historical start & the current date as the historical end with the deviceId
         6) Tag: Clear the activeStart
         7) Tag: Clear the deviceId
         8) Tag: Set as not active
         */
        var assetId  = mongoose.Types.ObjectId(req.params.assetId),
            deviceId = mongoose.Types.ObjectId(req.params.deviceId);

    });
};
