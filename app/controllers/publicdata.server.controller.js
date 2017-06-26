'use strict';

var mongoose = require('mongoose'),
    moment = require('moment'),
    Telemetry = require('@terepac/terepac-models').Telemetry;

exports.index = function(req, res) {
	res.json({message: 'There is not data available from the root.'});
};

exports.aggregated = function(req, res) {
    if (req.params.sensor !== 'TI' || req.params.sensor !== 'VI') {
        res.status(404).send({
            message: 'Sensor type not found.'
        });
        return;
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