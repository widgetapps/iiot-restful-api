'use strict';

var mongoose = require('mongoose'),
    moment = require('moment'),
    Device = require('@terepac/terepac-models').Device,
    Asset = require('@terepac/terepac-models').Asset,
    Tag = require('@terepac/terepac-models').Tag,
    Telemetry = require('@terepac/terepac-models').Telemetry;

exports.index = function(req, res) {
	res.json({message: 'There is not data available from the root.'});
};

exports.dataNumbers = function(req, res) {
    Tag.count({active: true}, function (errTag, tags) {
        if (errTag) {
            tags = 'ERROR';
        }
        Telemetry.count({created: {'$gte': moment().subtract(1, 'm').toDate()}}, function (errAsset, dataper) {
            if (errAsset) {
                dataper = 'ERROR';
            }
            Device.count({}, function (errDevice, devices) {
                if (errDevice) {
                    devices = 'ERROR';
                }
                Telemetry.count({}, function (errTelemetry, telemetries) {
                    if (errTelemetry) {
                        telemetries = 'ERROR';
                    }

                    var data = {
                        tags: tags,
                        dataper: dataper,
                        devices: devices,
                        telemetries: telemetries
                    };

                    res.json(data);
                })
            })
        })
    })
};

exports.aggregated = function(req, res) {
    if (req.params.sensor !== 'TI' && req.params.sensor !== 'VI') {
        res.status(404).send({
            message: 'Sensor type not found.'
        });
        return;
    }

    var min = '$data.values.min';
    var max = '$data.values.max';

    if (req.params.sensor === 'VI') {
        min = '$data.values.average';
        max = '$data.values.average';
    }

    Telemetry.aggregate([
        {'$match': {'timestamp': {'$gte': moment().subtract(1, 'd').toDate()}, 'tag.sensorTagCode': req.params.sensor}},
        {'$group': {
            '_id': {
                'year': { '$year': '$timestamp' },
                'month': { '$month': '$timestamp' },
                'day': { '$dayOfMonth': '$timestamp' },
                'hour': { '$hour': '$timestamp' },
                'minute': {
                    '$subtract': [
                        { '$minute': '$timestamp' },
                        { '$mod': [{ '$minute': '$timestamp' }, 30] }
                    ]
                }
            },
            'count': {'$sum': 1},
            'min': {'$min': min},
            'max': {'$max': max},
            'average': {'$avg': '$data.values.average'}
        }},
        {'$sort': {'_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1, '_id.minute': 1}}
    ], function (err, result) {
        if (err) {
            res.status(500).send({
                message: 'Database error.'
            });
            return;
        }

        res.json(result);
    });
};