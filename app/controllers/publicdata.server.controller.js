'use strict';

var mongoose = require('mongoose'),
    moment = require('moment'),
    _ = require('lodash'),
    Asset = require('@terepac/terepac-models').Asset,
    Client = require('@terepac/terepac-models').Client,
    Device = require('@terepac/terepac-models').Device,
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

exports.deviceStatus = function (req, res) {
    var promise =  Asset.find(
        {},
        {
            created: 1,
            updated: 1,
            name: 1,
            tagCode: 1,
            client: 1,
            location: 1
        }
    ).populate('client', {companyName: 1}).populate('location', {description: 1, tagCode: 1}).exec();

    promise.then(function(assets) {
        var jobQueries = [];

        _.each(assets, function(asset) {

            // needs to query telemetry by locationTagCode & assetTagCode, this will get me device & tag info.

            jobQueries.push(Telemetry.find({'tag.locationTagCode': asset.location.tagCode, 'tag.assetTagCode': asset.tagCode}).populate('device').exec());
        });

        return Promise.all(jobQueries);

    }).then(function(listOfJobs) {
        var status = [];

        // Loop through listOfJobs (results of telemetry queries) to get deviceSerialNumber, lastTransmission & tag
        status.push({
            client: "",
            asset: "",
            location: "",
            deviceSerialNumber: "",
            lastTransmission: "",
            tag: ""
        });

        res.json({message: "hello"});

    }).catch(console.warn);

};
