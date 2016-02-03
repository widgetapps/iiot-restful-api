'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    errorHandler = require('./errors.server.controller'),
    Measurement = mongoose.model('Measurement'),
    Device = mongoose.model('Device'),
    _ = require('lodash'),
    moment = require('moment');

exports.list = function(req, res) {
    var clientId = req.user.client;

    Device.find({client: clientId},
        {
            created: 1,
            updated: 1,
            serialNumber: 1,
            type: 1,
            code: 1,
            descriptor: 1
    }, function(err, devices) {
            res.json(devices);
    });
};

exports.getOne = function(req, res) {
    var clientId = req.user.client;
    var serialNumber = req.params.serialNumber;

    Device.findOne(
        { serialNumber: serialNumber, client: clientId }, {
            created: 1,
            updated: 1,
            serialNumber: 1,
            type: 1,
            code: 1,
            descriptor: 1
        },function(err, device) {
            res.json(device);
    });
};

exports.getSettings = function(req, res) {
    var clientId = req.user.client;
    var serialNumber = req.params.serialNumber;

    Device.findOne(
        { serialNumber: serialNumber, client: clientId }, {
            serialNumber: 1,
            code: 1,
            settings: 1
        },function(err, device) {
            res.json({
                serialNumber: device.serialNumber,
                code: device.code,
                normalrate: device.normalrate,
                highlimit: device.highlimit,
                lowlimit: device.lowlimit,
                deadband: device.deadband,
                bufferallduration: device.bufferallduration,
                preroll: device.preroll,
                postroll: device.postroll,
                starttime: device.starttime,
                stoptime: device.stoptime
            });
    });
};

exports.getMeasurements = function(req, res) {
    var clientId = req.user.client;
    var serialNumber = req.params.serialNumber;

    Device.findOne({ serialNumber: serialNumber }, function(err, device) {
        Measurement.find({
                device: device._id,
                created: {'$gte': moment().subtract(1, 'minute'), '$lte': moment()}
            })
            .sort('created')
            .exec(function (err, measurements) {

            });
    });
};