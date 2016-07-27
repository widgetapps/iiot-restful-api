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

exports.devicelist = function(req, res) {
    Device.find({},
        {
            serialNumber: 1,
            type: 1,
            code: 1,
            descriptor: 1
        },{
            sort: {code: 1}
        }, function(err, devices) {
            if (devices.length == 0 || err) {
                res.status(404).send({
                    message: 'No devices found.'
                });
                return;
            }

            res.json(devices);
        });
}

exports.devicedata = function(req, res) {
    // ?startDate=ISODATE|now&period=d&duration=4

    var sensors = ['temp', 'aclx', 'acly', 'aclz', 'shck', 'humi'];
    var tzoffset = '-04:00';
    if (!moment().isDST()) {
        //tzoffset = '-05:00';
    }
    var query = {};

    if (req.query.sensor) {
        switch(req.query.sensor) {
            case 'temp':
                sensors = ['temp'];
                break;
            case 'humi':
                sensors = ['humi'];
                break;
            case 'accl':
                sensors = ['aclx', 'acly', 'aclz', 'shck'];
                break;
        }
    }

    var validPeriods = ['h','d','w','M'];
    if (!_.contains(validPeriods, req.query.period)){
        res.status(400).send({
            message: 'Invalid period'
        });
        return;
    }
    if (!req.query.duration || (req.query.duration && (parseInt(req.query.duration) < 1 || parseInt(req.query.duration) > 12))) {
        res.status(400).send({
            message: 'Duration missing or out of range'
        });
        return;
    }

    if (req.query.startDate == 'now') {
        query.created = {'$gte': moment().subtract(req.query.duration, req.query.period), '$lte': moment()};
    } else {
        if (!req.query.startDate || !moment(req.query.startDate).isValid()) {
            res.status(400).send({
                message: 'Missing or invalid start date'
            });
            return;
        }
        query.created = {'$gte': moment(req.query.startDate), '$lte': moment(req.query.startDate).add(req.query.duration, req.query.period)};
    }

    var serialNumber = req.params.serialNumber;

    Device.findOne({ serialNumber: serialNumber }, function(err, device) {
        if (!device || err) {
            res.status(404).send({
                message: 'Device  not found'
            });
            return;
        }
        query.device = device._id;
        query.sensor = {$in: sensors};
         
        Measurement.find({
                device: device._id,
                sensor: {$in: sensors},
                created: query.created
            })
            .sort('created')
            .exec(function (err, measurements) {
                if (err) {
                    return res.status(400).send({
                        message: 'ERROR: ' + errorHandler.getErrorMessage(err),
                        device: device._id,
                        sensor: {$in: sensors},
                        created: query.created
                    });
                } else {

                    var temperature = [];
                    var humidity    = [];
                    var accel       = [];
                    var accelrow    = [];
                    var accelcurrentcount = 0;

                    _.each(measurements, function(measurement, key) {
                        try {
                            measurements[key] = JSON.parse(measurements[key]);
                        } catch (err) { }

                        switch (measurements[key].sensor) {
                            case 'temp':
                                temperature.push({c: [
                                    {v: moment(measurements[key].created).utcOffset(tzoffset).format('HH:mm:ss')},
                                    {v: measurements[key].data.values.max}
                                ]});
                                break;
                            case 'humi':
                                humidity.push({c: [
                                    {v: moment(measurements[key].created).utcOffset(tzoffset).format('HH:mm:ss')},
                                    {v: measurements[key].data.values.max}
                                ]});
                                break;
                            case 'aclx':
                            case 'acly':
                            case 'aclz':
                            case 'shck':
                                if (accelcurrentcount < 4) {
                                    if (accelcurrentcount === 0)
                                        accelrow[0] = {v: moment(measurements[key].created).utcOffset(tzoffset).format('HH:mm:ss')};

                                    if (measurements[key].sensor === 'aclx')
                                        accelrow[1] = {v: measurements[key].data.values.max};
                                    if (measurements[key].sensor === 'acly')
                                        accelrow[2] = {v: measurements[key].data.values.max};
                                    if (measurements[key].sensor === 'aclz')
                                        accelrow[3] = {v: measurements[key].data.values.max};
                                    if (measurements[key].sensor === 'shck') {
                                        // Multiply by 10 for better viz
                                        accelrow[4] = {v: measurements[key].data.values.average * 10};
                                    }

                                    accelcurrentcount++;
                                }
                                break;
                        }

                        if (accelrow.length === 5) {
                            accel.push({c: accelrow});
                            accelrow = [];
                            accelcurrentcount = 0;
                        }
                    });

                    res.json({
                        response: 'OK',
                        temperature: temperature,
                        humidity: humidity,
                        accel: accel
                    });
                }
            });
    });

}

exports.guelphdata = function(req, res) {
    var sensors = ['temp', 'aclx', 'acly', 'aclz', 'shck'];

    var tzoffset = '-04:00';
    if (!moment().isDST()) {
        //tzoffset = '-05:00';
    }

    var serialNumber = req.params.serialNumber;

    Device.findOne({ serialNumber: serialNumber }, function(err, device) {
        if (!device || err) {
            res.status(404).send({
                message: 'Device  not found'
            });
            return;
        }
        Measurement.find({
                device: device._id,
                sensor: {$in: sensors},
                created: {'$gte': moment().subtract(1, 'hour'), '$lte': moment()}
            })
            .sort('created')
            .exec(function (err, measurements) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {

                    var temperature = [];
                    var accel = [];
                    var accelrow = [];
                    var accelcurrentcount = 0;

                    _.each(measurements, function(measurement, key) {
                        try {
                            measurements[key] = JSON.parse(measurements[key]);
                        } catch (err) {}

                        switch (measurements[key].sensor) {
                            case 'temp':
                                temperature.push({c: [
                                    {v: moment(measurements[key].created).utcOffset(tzoffset).format('HH:mm:ss')},
                                    {v: measurements[key].data.values.max}
                                ]});
                                break;
                            case 'aclx':
                            case 'acly':
                            case 'aclz':
                            case 'shck':
                                if (accelcurrentcount < 4) {
                                    if (accelcurrentcount === 0)
                                        accelrow[0] = {v: moment(measurements[key].created).utcOffset(tzoffset).format('HH:mm:ss')};

                                    if (measurements[key].sensor === 'aclx')
                                        accelrow[1] = {v: measurements[key].data.values.max};
                                    if (measurements[key].sensor === 'acly')
                                        accelrow[2] = {v: measurements[key].data.values.max};
                                    if (measurements[key].sensor === 'aclz')
                                        accelrow[3] = {v: measurements[key].data.values.max};
                                    if (measurements[key].sensor === 'shck') {
                                        // Multiply by 10 for better viz
                                        accelrow[4] = {v: measurements[key].data.values.average * 10};
                                    }

                                    accelcurrentcount++;
                                }
                                break;
                        }

                        if (accelrow.length === 5) {
                            accel.push({c: accelrow});
                            accelrow = [];
                            accelcurrentcount = 0;
                        }
                    });

                    res.json({
                        response: 'OK',
                        temperature: temperature,
                        accel: accel
                    });
                }
            });
    });
};

exports.ciscodata = function(req, res) {
    var tzoffset = '-04:00';
    if (!moment().isDST()) {
        //tzoffset = '-05:00';
    }

    Device.findOne({ serialNumber: '6' }, function(err, device) {
        if (!device || err) {
            res.status(404).send({
                message: 'Device  not found'
            });
            return;
        }
        Measurement.find({
                device: device._id,
                created: {'$gte': moment().subtract(1, 'minute'), '$lte': moment()}
            })
            .sort('created')
            .exec(function (err, measurements) {

                var accel     = [];
                var vibration = [];
                var accelrow = [];
                var accelcurrentcount = 0;

                _.each(measurements, function(measurement, key) {

                    switch(measurements[key].sensor) {
                        case 'shck':
                            vibration.push({c: [
                                {v: moment(measurements[key].created).utcOffset(tzoffset).format('mm:ss')},
                                {v: measurements[key].data.values.average * 10} // Multiply by 10 for better viz
                            ]});
                            break;
                        case 'aclx':
                        case 'acly':
                        case 'aclz':
                            if (accelcurrentcount < 4) {
                                if (accelcurrentcount === 0)
                                    accelrow[0] = {v: moment(measurements[key].created).utcOffset(tzoffset).format('mm:ss')};
                                if (measurements[key].sensor === 'aclx')
                                    accelrow[1] = {v: measurements[key].data.values.max};
                                if (measurements[key].sensor === 'acly')
                                    accelrow[2] = {v: measurements[key].data.values.max};
                                if (measurements[key].sensor === 'aclz')
                                    accelrow[3] = {v: measurements[key].data.values.max};

                                accelcurrentcount++;
                            }
                            break;
                    }

                    if (accelrow.length === 4) {
                        accel.push({c: accelrow});
                        accelrow = [];
                        accelcurrentcount = 0;
                    }
                });

                res.json({
                    response: 'OK',
                    accel: accel,
                    vibration: vibration
                });
            });
    });
};