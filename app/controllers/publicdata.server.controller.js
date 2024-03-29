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
	res.json({message: 'There is no data available from the root.'});
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
    if (req.params.sensor !== 'TI' && req.params.sensor !== 'VI' && req.params.sensor !== 'PI') {
        res.status(404).send({
            message: 'Sensor type not found.'
        });
        return;
    }

    var min = '$data.values.min';
    var max = '$data.values.max';
    var average = '$data.values.average';

    if (req.params.sensor === 'VI' || req.params.sensor === 'TI') {
        min = '$data.values.point';
        max = '$data.values.point';
        average = '$data.values.point';
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
            'average': {'$avg': average}
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

exports.listDevices = function (req, res) {
    var query = {};

    if (req.params.type && (req.params.type === 'hydrant' || req.params.type === 'machine')) {
        query = {type: req.params.type};
    }

    var promise = Device.find(query,
        {
            created: 1,
            updated: 1,
            serialNumber: 1,
            type: 1,
            sensors: 1,
            description: 1,
            lastTransmission: 1,
            asset: 1
        })
        .populate('sensors', {tagCode: 1, type: 1, typeString: 1, unit: 1})
        .populate({
            path: 'asset',
            select: 'tagCode name location -_id',
            populate: {
                path: 'location',
                model: 'Location',
                select: 'tagCode description -_id'
            }
        })
        .exec();

    promise.then(function (devices) {
        res.json(devices);
    }).catch(function (error) {
        res.status(400).send({message: 'Error getting devices: ' + error});
    });

};

exports.listAssets = function (req, res) {
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
    ).populate('client', {companyName: 1}).populate('asset', {description: 1, tagCode: 1}).exec();
    promise.then(function (assets) {
        res.json(assets);
    }).catch(function(error) {
        res.status(400).send({message: 'Error getting assets: ' + error});
    });
};

exports.assetStatus = function (req, res) {
    var promise = Telemetry.find(
        {
            'tag.locationTagCode': req.params.location,
            'tag.assetTagCode': req.params.asset,
            created: { $gte : moment().subtract(1, 'M').toDate() }
        },
        {
            created: 1,
            'asset.name': 1,
            'device.serialNumber': 1,
            'device.description': 1,
            'tag.full': 1
        }).sort({created: -1}).limit(1).exec();
    promise.then(function(telemetries) {
        if (telemetries.length === 0) {
            res.json({
                _id: 'na',
                asset: {
                    name: 'na'
                },
                device: {
                    serialNumber: 'na',
                    description: 'na'
                },
                tag: {
                    full: 'na'
                },
                created: 'na'
            });
        } else {
            res.json(telemetries[0]);
        }
    }).catch(function(error) {
        res.status(500).send({message: 'Error getting asset info: ' + error});
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

            jobQueries.push(Telemetry.find({'tag.locationTagCode': asset.location.tagCode, 'tag.assetTagCode': asset.tagCode, created: { $gte : moment().subtract(1, 'M').toDate() }}).sort({created: -1}).populate('device').limit(1).exec());
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

        res.json({message: listOfJobs});

    }).catch(function(error) {
        res.status(500).send({message: 'one of the queries failed: ' + error});
    });

};
