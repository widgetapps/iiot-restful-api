'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    jsonQuery = require('json-query'),
    errorHandler = require('./errors.server.controller'),
    Device = require('@terepac/terepac-models').Device,
    Sensor = require('@terepac/terepac-models').Sensor,
    _ = require('lodash'),
    moment = require('moment'),
    authorize = require('../lib/authorize.server.lib'),
    endpoint = 'device';

exports.list = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);

    Device.find({$or: [{client: clientId}, {'acl.client': clientId}]},
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
    // TODO: Secure this!
    var clientId = mongoose.Types.ObjectId(req.user.client);
    var deviceId = mongoose.Types.ObjectId(req.params.deviceId);

    Device.findOne(
        { _id: deviceId, $or: [{client: clientId}, {'acl.client': clientId}] }, {
            created: 1,
            updated: 1,
            serialNumber: 1,
            type: 1,
            description: 1,
            sensors: 1,
            location: 1,
            asset: 1
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
    var deviceId = mongoose.Types.ObjectId(req.params.deviceId);

    Device.update(
        { _id: deviceId, $or: [{client: clientId}, {'acl.client': clientId}] },
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

exports.getSensors = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);
    var deviceId = mongoose.Types.ObjectId(req.params.deviceId);

    Device.findOne(
        { _id: deviceId, $or: [{client: clientId}, {'acl.client': clientId}] }, {
            sensors: 1
        })
        .populate('sensors.sensor')
        .exec(function (err, device) {
            if (err) {
                res.status(500).send({
                    message: 'Database error.'
                });
                return;
            }

            var sensors = [];

            _.each(device.sensors, function(sensor){
                var data = {
                    _id: sensor.sensor._id,
                    type: sensor.sensor.type,
                    typeString: sensor.sensor.typeString,
                    tagCode: sensor.sensor.tagCode,
                    description: sensor.sensor.description,
                    unit: sensor.sensor.unit,
                    limits: sensor.limits
                };

                sensors.push(data);
            });

            res.json(sensors);
        });

};

exports.getSensor = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);
    var deviceId = mongoose.Types.ObjectId(req.params.deviceId);
    var sensorId = mongoose.Types.ObjectId(req.params.sensorId);

    Device.findOne(
        { _id: deviceId, $or: [{client: clientId}, {'acl.client': clientId}] }, {
            sensors: 1
        })
        .populate('sensors.sensor')
        .exec(function (err, device) {
            if (err) {
                res.status(500).send({
                    message: 'Database error.'
                });
                return;
            }

            var data = jsonQuery('sensors[sensor._id=' + sensorId + ']', {data: device}).value;

            var sensor = {
                _id: data.sensor._id,
                type: data.sensor.type,
                typeString: data.sensor.typeString,
                tagCode: data.sensor.tagCode,
                description: data.sensor.description,
                unit: data.sensor.unit,
                limits: data.limits
            };

            res.json(sensor);
        });
};

exports.getLimits = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);
    var deviceId = mongoose.Types.ObjectId(req.params.deviceId);
    var sensorId = mongoose.Types.ObjectId(req.params.sensorId);

    Device.findOne(
        { _id: deviceId, $or: [{client: clientId}, {'acl.client': clientId}] }, {
            sensors: 1
        })
        .populate('sensors.sensor')
        .exec(function (err, device) {
            if (err) {
                res.status(500).send({
                    message: 'Database error.'
                });
                return;
            }

            var limits = jsonQuery('sensors[sensor=' + sensorId + '].limits', {data: device}).value;

            res.json(limits);
        });
};

exports.updateLimits = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);
    var deviceId = mongoose.Types.ObjectId(req.params.deviceId);

    Device.update(
        { _id: deviceId, $or: [{client: clientId}, {'acl.client': clientId}] },
        {
            $set: {
                limits: req.body
            }
        }, function(err, device) {
            if (!device || err) {
                res.status(404).send({
                    message: 'No device found.'
                });
                return;
            }

            res.json({
                message: 'Limits have been saved'
            });
        }
    );
};

exports.getSettings = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);
    var deviceId = mongoose.Types.ObjectId(req.params.deviceId);

    Device.findOne(
        { _id: deviceId, $or: [{client: clientId}, {'acl.client': clientId}] }, {
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

            res.json(
                device.settings
            );
    });
};

exports.updateSettings = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);
    var deviceId = mongoose.Types.ObjectId(req.params.deviceId);

    Device.update(
        { _id: deviceId, $or: [{client: clientId}, {'acl.client': clientId}] },
        {
            $set: {
                settings: req.body
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
