'use strict';

var mongoose = require('mongoose'),
    moment = require('moment'),
    Telemetry = require('@terepac/terepac-models').Telemetry;

exports.index = function(req, res) {
	res.json({message: 'There is not data available from the root.'});
};

exports.aggregatedTemperature = function(req, res) {
    Telemetry.aggregate([
        {'$match': {'timestamp': {'$gte': moment().subtract(1, 'days')}, 'tag.sensorTagCode': 'TI'}},
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
            'min': {'$min': '$data.values.min'},
            'max': {'$max': '$data.values.max'},
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