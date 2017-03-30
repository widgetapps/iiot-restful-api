'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    errorHandler = require('./errors.server.controller'),
    Measurement = mongoose.model('Measurement'),
    Device = mongoose.model('Device'),
    _ = require('lodash'),
    moment = require('moment'),
    JSONStream = require('JSONStream');

exports.list = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);

    Device.find({$or: [{client: clientId}, {acl: clientId}]},
        {
            created: 1,
            updated: 1,
            serialNumber: 1,
            type: 1,
            sensors: 1,
            code: 1,
            descriptor: 1
    }, function(err, devices) {
            if (devices.length === 0 || err) {
                res.status(404).send({
                    message: 'No devices found.'
                });
                return;
            }

            res.json(devices);
    });
};

exports.getOne = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);
    var serialNumber = req.params.serialNumber;

    Device.findOne(
        { serialNumber: serialNumber, $or: [{client: clientId}, {acl: clientId}] }, {
            created: 1,
            updated: 1,
            serialNumber: 1,
            type: 1,
            sensors: 1,
            code: 1,
            descriptor: 1
        },function(err, device) {
            if (!device || err) {
                res.status(404).send({
                    message: 'No device found.'
                });
                return;
            }

            res.json(device);
    });
};

exports.updateDevice = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);
    var serialNumber = req.params.serialNumber;

    Device.update(
        { serialNumber: serialNumber, $or: [{client: clientId}, {acl: clientId}] },
        {
            $set: {
                code: req.body.code,
                descriptor: req.body.descriptor
            }
        }, function(err, device) {
            if (!device || err) {
                res.status(404).send({
                    message: 'No device found.'
                });
                return;
            }

            res.json({
                message: 'Device saved.'
            });
        }
    );
};

exports.getSettings = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);
    var serialNumber = req.params.serialNumber;

    Device.findOne(
        { serialNumber: serialNumber, $or: [{client: clientId}, {acl: clientId}] }, {
            serialNumber: 1,
            code: 1,
            settings: 1
        },function(err, device) {
            if (!device || err) {
                res.status(404).send({
                    message: 'No device found.'
                });
                return;
            }

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

exports.updateSettings = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);
    var serialNumber = req.params.serialNumber;

    Device.update(
        { serialNumber: serialNumber, $or: [{client: clientId}, {acl: clientId}] },
        {
            $set: {
                'settings.normalrate': req.body.normalrate,
                'settings.highlimit': req.body.highlimit,
                'settings.lowlimit': req.body.lowlimit,
                'settings.deadband': req.body.deadband,
                'settings.bufferallduration': req.body.bufferallduration,
                'settings.preroll': req.body.preroll,
                'settings.postroll': req.body.postroll,
                'settings.starttime': new Date(req.body.starttime),
                'settings.stoptime': new Date(req.body.stoptime)
            }
        }, function(err, device) {
            if (!device || err) {
                res.status(404).send({
                    message: 'No device found.'
                });
                return;
            }

            res.json({
                message: 'Settings have been saved'
            });
        }
    );
};

exports.getMeasurements = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);
    var serialNumber = req.params.serialNumber;

    if (!req.query.sensors) {
        res.status(404).send({
            message: 'No sensors were provided.'
        });
        return;
    }

    if (!req.query.start || !moment(req.query.start).isValid()) {
        res.status(404).send({
            message: 'Valid start date was not provided.'
        });
        return;
    }

    if (!req.query.end || !moment(req.query.end).isValid()) {
        res.status(404).send({
            message: 'Valid end date was not provided.'
        });
        return;
    }

    Device.findOne({ serialNumber: serialNumber, $or: [{client: clientId}, {acl: clientId}] }, function(err, device) {
        if (!device || err) {
            res.status(404).send({
                message: 'No device found.'
            });
            return;
        }

        var sensors;

        if (req.query.sensors instanceof Array){
            sensors = req.query.sensors;
        } else {
            sensors = [req.query.sensors];
        }

        res.set({
            'Content-Type': 'application/json',
            'X-Accel-Buffering': 'no',
            'Cache-Control': 'no-cache'
        });

        Measurement.find({
            device: mongoose.Types.ObjectId(device._id),
            created: {'$gte': moment(req.query.start), '$lte': moment(req.query.end)},
            sensor: {$in: sensors}
        },{
            created: 1,
            sensor: 1,
            data: 1
        })
            .cursor()
            .pipe(JSONStream.stringify())
            .pipe(res);

    });
};