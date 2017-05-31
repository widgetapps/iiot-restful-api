'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    errorHandler = require('./errors.server.controller'),
    Client = require('@terepac/terepac-models').Client,
    User = require('@terepac/terepac-models').User,
    _ = require('lodash'),
    moment = require('moment'),
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
