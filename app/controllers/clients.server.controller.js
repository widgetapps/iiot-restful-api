'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Client = require('@terepac/terepac-models').Client,
    Tag = require('@terepac/terepac-models').Tag,
    Telemetry = require('@terepac/terepac-models').Telemetry,
    User = require('@terepac/terepac-models').User,
    Device = require('@terepac/terepac-models').Device,
    Location = require('@terepac/terepac-models').Location,
    Asset = require('@terepac/terepac-models').Asset,
    Event = require('@terepac/terepac-models').Event,
    Mqtt = require('@terepac/terepac-models').Mqtt,
    _ = require('lodash'),
    moment = require('moment'),
    crypto = require('crypto'),
    util = require('../lib/util'),
    randomstring = require('randomstring'),
    authorize = require('../lib/authorize.server.lib'),
    endpoint = 'client',
    JSONStream = require('JSONStream'),
    jsonQuery = require('json-query');

exports.list = function(req, res) {
    var query;

    switch (req.user.role) {
        case 'user':
            query = {
                _id: req.user.client
            };
            break;
        case 'manufacturer':
        case 'manager':
        case 'admin':
            query = {
                $or: [{_id: req.user.client}, {resellerClients: req.user.client}]
            };
            break;
        case 'super':
            query = {};
            break;
        default:
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
    }

    Client.find( query,
        {
            created: 1,
            updated: 1,
            'apikey.id': 1,
            companyName: 1,
            address: 1,
            contact: 1,
            reseller: 1
        }, function(err, clients) {
            res.json(clients);
        });


};

exports.insert = function(req, res) {
    let authorized = false;

    switch (req.user.role) {
        case 'admin':
        case 'manager':
            // admin & manager roles must be a reseller to add a client
            if (req.user.reseller) {
                authorized = true;
            }
            break;
        case 'super':
            authorized = true;
            break;
    }

    if (!authorized) {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    let client = new Client(req.body);
    client.apikey.id = randomstring.generate({
        length: 32,
        charset: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890$-_+!*().,'
    });

    client.apikey.secret = randomstring.generate({
        length: 30,
        charset: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890$-_+!*().,'
    });

    if (req.user.reseller) {
        client.resellerParent = mongoose.Types.ObjectId(req.user.client);
    }

    client.save(function (err, client) {
        if (err) {
            res.status(400).send({
                message: 'Error inserting the client: ' + err
            });
        } else {
            if (req.user.reseller) {
                // Update the resellerClients array
                Client.findByIdAndUpdate(
                    req.user.client,
                    {$push: {'resellerClients': mongoose.Types.ObjectId(client._id)}},
                    {safe: true, upsert: true, new : true},
                    function(err, me) {
                        res.status(200).send({
                            _id: client._id
                        });
                    }
                );
            } else {
                res.status(200).send({
                    _id: client._id
                });
            }
        }
    });

};

exports.getOne = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {

        var authorized = false;

        // Make sure the user is allowed see the client
        switch (req.user.role) {
            case 'user':
                if (req.user.client === req.params.id) {
                    authorized = true;
                }
                break;
            case 'manufacturer':
            case 'manager':
            case 'admin':
                if (req.user.client === req.params.id || _.includes(req.user.resellerClients, req.params.id)) {
                    authorized = true;
                }
                break;
            case 'super':
                authorized = true;
                break;
        }

        if (!authorized) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
        }

        var clientId = mongoose.Types.ObjectId(req.params.id);

        Client.findOne(
            { _id: clientId }, {
                created: 1,
                updated: 1,
                'apikey.id': 1,
                companyName: 1,
                address: 1,
                contact: 1,
                reseller: 1
            }, function(err, client) {
                if (!client || err) {
                    res.status(404).send({
                        message: 'Client not found.'
                    });
                    return;
                }

                res.json(client);
            });
    });

};

exports.update = function(req, res) {
    authorize.validate(endpoint, req, res, 'manager', function() {

        var authorized = false;

        switch (req.user.role) {
            case 'manager':
                if (_.includes(req.user.resellerClients, req.params.id)) {
                    authorized = true;
                }
                break;
            case 'manufacturer':
            case 'admin':
                if (req.user.client === req.params.id || _.includes(req.user.resellerClients, req.params.id)) {
                    authorized = true;
                }
                break;
            case 'super':
                authorized = true;
                break;
        }

        if (!authorized) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
        }

        // Check to see if read-only fields are in the payload
        if (req.body._id || req.body.created || req.body.updated || req.body.alertGroups || req.body.reseller || req.body.resellerParent || req.body.locations || req.body.assets || req.body.devices || req.body.users || req.body.apiKey) {
            res.status(400).send({
                message: 'Cannot update read-only field.'
            });

            return;
        }

        Client.findById(
            req.params.id,
            function (err, client) {

                if (!client || err) {
                    res.status(404).send({
                        message: 'Client not found.'
                    });
                    return;
                }

                client = _.assignIn(client, req.body);

                client.save(function(err, newClient) {
                    if (err){
                        res.status(400).send({
                            message: 'Error saving client.'
                        });
                    }

                    res.json(newClient);
                });

            }
        );
    });
};

exports.listTags = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {

        let authorized = false;

        // Make sure the user is allowed see the client
        switch (req.user.role) {
            case 'user':
                if (req.user.client === req.params.id) {
                    authorized = true;
                }
                break;
            case 'manufacturer':
            case 'manager':
            case 'admin':
                if (req.user.client === req.params.id || _.includes(req.user.resellerClients, req.params.id)) {
                    authorized = true;
                }
                break;
            case 'super':
                authorized = true;
                break;
        }

        if (!authorized) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
        }

        let clientId = mongoose.Types.ObjectId(req.params.id);

        Tag.find( {client: clientId}, {
            tag: 1,
            description: 1,
            unit: 1,
            device: 1,
            active: 1,
            activeStart: 1,
            historical: 1
        })
            .populate('device', {serialNumber: 1, description: 1})
            .exec(function(err, tags) {
                if (err) {
                    res.status(500).send({
                        message: 'Database error.'
                    });
                    return;
                }

                res.json(tags);
            });
    });
};

exports.listTagsGrouped = function(req, res) {
    let authorized = false;

    // Make sure the user is allowed see the client
    switch (req.user.role) {
        case 'user':
            if (req.user.client === req.params.id) {
                authorized = true;
            }
            break;
        case 'manufacturer':
        case 'manager':
        case 'admin':
            if (req.user.client === req.params.id || _.includes(req.user.resellerClients, req.params.id)) {
                authorized = true;
            }
            break;
        case 'super':
            authorized = true;
            break;
    }

    if (!authorized) {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    let clientId = mongoose.Types.ObjectId(req.params.id);

    Tag.aggregate([
        { $match: {client: clientId, active: true} },
        { $group : {
                _id : '$tag.assetTagCode',
                location: {'$first': '$tag.locationTagCode'},
                sensors: {'$push': '$tag.sensorTagCode'},
                description: {'$first': '$description.asset'},
                device: {'$first': '$device'},
                asset: {'$first': '$asset'}
            } },
        { $sort: {_id: 1} }
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

exports.searchTelemetry = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {
        var authorized = false;

        switch (req.user.role) {
            case 'user':
                if (req.user.client === req.params.id) {
                    authorized = true;
                }
                break;
            case 'manufacturer':
            case 'manager':
            case 'admin':
                if (req.user.client === req.params.id || _.includes(req.user.resellerClients, req.params.id)) {
                    authorized = true;
                }
                break;
            case 'super':
                authorized = true;
                break;
        }

        if (!authorized) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
        }

        var tags = req.query.tags.split(',');

        var fields = {
            tag: 1,
            timestamp: 1,
            data: 1
        };
        if (req.query.asset === '1') {
            fields.asset = 1;
        }
        if (req.query.device === '1') {
            fields.device = 1;
        }
        if (req.query.sensor === '1') {
            fields.sensor = 1;
        }

        res.set({
            'Content-Type': 'application/json',
            'X-Accel-Buffering': 'no',
            'Cache-Control': 'no-cache'
        });

        //TODO: Validate the start and end dates as ISO.

        Telemetry.find({
            'tag.full': {$in: tags},
            timestamp: {'$gte': moment(req.query.start), '$lte': moment(req.query.end)}
        }, fields)
        .sort({timestamp: 1})
        .cursor()
        .pipe(JSONStream.stringify())
        .pipe(res);
    });
};

exports.getAggregatedTelemetry = function(req, res) {
    let authorized = false;

    switch (req.user.role) {
        case 'user':
            if (req.user.client === req.params.id) {
                authorized = true;
            }
            break;
        case 'manufacturer':
        case 'manager':
        case 'admin':
            if (req.user.client === req.params.id || _.includes(req.user.resellerClients, req.params.id)) {
                authorized = true;
            }
            break;
        case 'super':
            authorized = true;
            break;
    }

    if (!authorized) {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    let now = moment.utc();
    let start = moment.utc(req.query.start);
    let end = moment.utc(req.query.end);

    if (!start.isValid() || !end.isValid()) {
        res.status(400).send({
            message: 'Start and/or end date are invalid.'
        });
        return;
    }

    if (start.isAfter(now)) {
        res.status(400).send({
            message: 'The start date must be in the past.'
        });
        return;
    }

    if (start.isAfter(end)) {
        res.status(400).send({
            message: 'The start date must be before the end date.'
        });
        return;
    }

    if (end.diff(start, 'hours') < 1) {
        res.status(400).send({
            message: 'There must be at least 1 hour between the start and end dates.',
            hours: end.diff(start, 'hours')
        });
        return;
    }

    if (end.diff(start, 'days') > 30) {
        res.status(400).send({
            message: 'There cannot be more than 30 days between the start and end dates.',
            days: end.diff(start, 'days')
        });
        return;
    }

    res.set({
        'Content-Type': 'application/json',
        'X-Accel-Buffering': 'no',
        'Cache-Control': 'no-cache'
    });

    let group = getTelemetryGroupStatement(start, end);
    let sort = {'_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1, '_id.minute': 1, '_id.second': 1};

    /*
    let addFields = {
        'data.unit': {'$first': '$data.unit'},
        'data.count': {'$num': 1},
        'data.values.min': {'$min': '$data.values.min'},
        'data.values.max': {'$max': '$data.values.max'},
        'data.values.avg': {'$avg': '$data.values.average'},
        'data.values.point': {'$avg': '$data.values.point'}
    };
     */

    group.unit= {'$first': '$data.unit'};
    group.count = {'$sum': 1};
    group.min = {'$min': '$data.values.min'};
    group.max = {'$max': '$data.values.max'};
    group.average = {'$avg': '$data.values.average'};
    group.point = {'$avg': '$data.values.point'};

    if (req.query.asset === '1') {
        group.asset = {'$first': '$asset'};
    }
    if (req.query.device === '1') {
        group.device = {'$first': '$device'};
    }
    if (req.query.sensor === '1') {
        group.sensor = {'$first': '$sensor'};
    }

    if (!req.query.tags || req.query.tags === '') {
        res.status(400).send({
            message: 'No tags where provided.'
        });
        return;
    }

    let tags = req.query.tags.split(',');

    Telemetry.aggregate([
        {'$match': {
                'tag.full': {$in: tags},
                timestamp: {'$gte': moment(req.query.start).toDate(), '$lte': moment(req.query.end).toDate()}
            }},
        {'$group': group},
        //{'$addFields': addFields},
        {'$sort': sort}
    ]).cursor().exec().pipe(JSONStream.stringify()).pipe(res);
};

exports.getLatestTelemetry = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {
        var authorized = false;

        switch (req.user.role) {
            case 'user':
                if (req.user.client === req.params.id) {
                    authorized = true;
                }
                break;
            case 'manufacturer':
            case 'manager':
            case 'admin':
                if (req.user.client === req.params.id || _.includes(req.user.resellerClients, req.params.id)) {
                    authorized = true;
                }
                break;
            case 'super':
                authorized = true;
                break;
        }

        if (!authorized) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
        }

        var fields = {
            tag: 1,
            timestamp: 1,
            data: 1
        };
        if (req.query.asset === '1') {
            fields.asset = 1;
        }
        if (req.query.device === '1') {
            fields.device = 1;
        }
        if (req.query.sensor === '1') {
            fields.sensor = 1;
        }

        Telemetry.findOne({ 'tag.full': req.params.tag }, fields)
            .sort({timestamp: -1})
            .exec(function (err, telemetry) {
                if (err) {
                    res.status(400).send({
                        message: 'Database error.'
                    });
                    return;
                }

                res.json(telemetry);
            });
    });
};

exports.listLocations = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {
        var query;

        switch (req.user.role) {
            case 'user':
                query = {
                    client: req.user.client
                };
                break;
            case 'manufacturer':
            case 'manager':
            case 'admin':
                query = {
                    $or: [{client: req.user.client}, {resellerClients: req.user.client}]
                };
                break;
            case 'super':
                query = {};
                break;
            default:
                res.status(401).send({
                    message: 'You are not authorized to access this resource.'
                });
                return;
        }

        Location.find( query, {
                tagCode: 1,
                description: 1,
                geolocation: 1,
                address: 1,
                assets: 1
            })
            .populate('assets')
            .exec(function(err, locations) {
                if (err) {
                    res.status(500).send({
                        message: 'Database error.'
                    });
                    return;
                }

                res.json(locations);
            });
    });
};

exports.insertLocation = function(req, res) {
    authorize.validate(endpoint, req, res, 'manager', function() {

        let clientId = mongoose.Types.ObjectId(req.params.id);
        req.body.geolocation = {
            type: 'Point',
            coordinates: req.body.geolocation
        };
        let location = new Location(req.body);
        location.client = clientId;

        location.save(function (err, loc) {
            if (err) {
                res.status(400).send({
                    message: 'Error saving location: ' + err + ' ' + location.geolocation
                });
                return;
            } else {
                Client.findByIdAndUpdate(
                    req.params.id,
                    {$push: {'locations': mongoose.Types.ObjectId(loc._id)}},
                    {safe: true, upsert: true, new : true},
                    function(err, client) {
                        res.status(200).send({
                            _id: loc._id
                        });
                    }
                );
            }
        });
    });
};

exports.listAssets = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {

        let authorized = false;

        // Make sure the user is allowed see the client
        switch (req.user.role) {
            case 'user':
                if (req.user.client === req.params.id) {
                    authorized = true;
                }
                break;
            case 'manufacturer':
            case 'manager':
            case 'admin':
                if (req.user.client === req.params.id || _.includes(req.user.resellerClients, req.params.id)) {
                    authorized = true;
                }
                break;
            case 'super':
                authorized = true;
                break;
        }

        if (!authorized) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
        }

        let clientId = mongoose.Types.ObjectId(req.params.id);

        Asset.find( {client: clientId}, {
            created: 1,
            updated: 1,
            tagCode: 1,
            name: 1,
            description: 1,
            settings: 1,
            location: 1
        })
            .populate('location', {
                'tagCode': 1,
                'description': 1,
                'address': 1,
                'geolocation.coordinates': 1
            })
            .exec(function(err, assets) {
                if (err) {
                    res.status(500).send({
                        message: 'Database error.'
                    });
                    return;
                }

                res.json(assets);
            });
    });
};

exports.insertAsset = function(req, res) {
    authorize.validate(endpoint, req, res, 'manager', function() {

        let clientId = mongoose.Types.ObjectId(req.params.id);

        let asset = new Asset(req.body);
        asset.client = clientId;
        asset.location = mongoose.Types.ObjectId(req.body.location);

        asset.settings = [];

        asset.save(function (err, ass) {
            if (err) {
                res.status(400).send({
                    message: 'Error saving asset: ' + err
                });
                return;
            } else {
                Client.findByIdAndUpdate(
                    req.params.id,
                    {$push: {'assets': mongoose.Types.ObjectId(ass._id)}},
                    {safe: true, upsert: true, new : true},
                    function(err, client) {
                        Location.findByIdAndUpdate(
                            req.body.location,
                            {$push: {'assets': mongoose.Types.ObjectId(ass._id)}},
                            {safe: true, upsert: true, new: true},
                            function(err, location) {
                                res.status(200).send({
                                    _id: ass._id
                                });
                            }
                        );
                    }
                );
            }
        });
    });
};

exports.listDevices = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {
        let authorized = false;

        // Make sure the user is allowed see the client
        switch (req.user.role) {
            case 'user':
                if (req.user.client === req.params.id) {
                    authorized = true;
                }
                break;
            case 'manufacturer':
            case 'manager':
            case 'admin':
                if (req.user.client === req.params.id || _.includes(req.user.resellerClients, req.params.id)) {
                    authorized = true;
                }
                break;
            case 'super':
                authorized = true;
                break;
        }

        if (!authorized) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
        }

        let clientId = mongoose.Types.ObjectId(req.params.id);

        Device.find( {client: clientId}, {
            created: 1,
            updated: 1,
            serialNumber: 1,
            topicId: 1,
            type: 1,
            description: 1,
            geolocation: 1,
            sensors: 1,
            location: 1,
            asset: 1,
            client: 1
        })
            .populate('sensors')
            .exec(function(err, devices) {
                if (err) {
                    res.status(500).send({
                        message: 'Database error.'
                    });
                    return;
                }

                res.json(devices);
            });
    });

};

exports.insertDevice = function(req, res) {
    authorize.validate(endpoint, req, res, 'admin', function() {

        var device = {
            serialNumber: req.body.serialNumber,
            topicId: req.body.topicId,
            type: req.body.type,
            description: req.body.description,
            client: mongoose.Types.ObjectId(req.params.id)
        };

        var deviceSensors = [];

        for (var i = 0; i < req.body.sensors.length; i++) {
            deviceSensors.push(mongoose.Types.ObjectId(req.body.sensors[i]));
        }

        device.sensors = deviceSensors;
        var newDevice = new Device(device);

        newDevice.save(function (err, d) {
            if (err) {
                res.status(400).send({
                    message: 'Error inserting the device: ' + err
                });
            } else {

                var username = crypto.createHash('md5').update(Buffer.from(device.serialNumber)).digest('hex');
                var password = util.createHash(username);

                var mqtt = new Mqtt({
                    username: username,
                    password: crypto.createHash('sha256').update(password).digest('hex'),
                    is_superuser: false,
                    publish: ['telemetry', '$client/' + device.serialNumber],
                    subscribe: ['system', 'time', 'er/response', '$client/' + device.serialNumber, device.serialNumber + '/response']
                });

                mqtt.save(function (err, mu) {
                    res.status(200).send({
                        _id: d._id
                    });
                });
            }
        });

    });
};

exports.listEvents = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {
        var query;

        switch (req.user.role) {
            case 'user':
                query = {
                    client: req.user.client
                };
                break;
            case 'manufacturer':
            case 'manager':
            case 'admin':
                query = {
                    $or: [{client: req.user.client}, {resellerClients: req.user.client}]
                };
                break;
            case 'super':
                query = {};
                break;
            default:
                res.status(401).send({
                    message: 'You are not authorized to access this resource.'
                });
                return;
        }

        Event.find( query, {
            _id: 1,
            tag: 1,
            type: 1,
            description: 1,
            start: 1,
            end: 1,
            count: 1
        })
            .exec(function(err, events) {
                if (err) {
                    res.status(500).send({
                        message: 'Database error.'
                    });
                    return;
                }

                res.json(events);
            });
    });

};

exports.getUsers = function(req, res) {
    authorize.validate(endpoint, req, res, 'admin', function() {
        var clientId = mongoose.Types.ObjectId(req.params.id);

        User.find( {client: clientId},
            {
                created: 1,
                updated: 1,
                firstName: 1,
                lastName: 1,
                email: 1,
                phone: 1,
                role: 1,
                active: 1
            }, function(err, users) {
                res.json(users);
        });
    });
};

exports.insertUser = function(req, res) {
    authorize.validate(endpoint, req, res, 'admin', function() {

        var clientId = mongoose.Types.ObjectId(req.params.id);
        var user = new User(req.body);
        user.provider = 'local';
        user.client = clientId;
        user.save(function (err, user) {
            if (err) {
                res.status(400).send({
                    message: 'Error saving user: ' + err
                });
                return;
            } else {
                Client.findByIdAndUpdate(
                    req.params.id,
                    {$push: {'users': mongoose.Types.ObjectId(user._id)}},
                    {safe: true, upsert: true, new : true},
                    function(err, client) {
                        res.status(200).send({
                            _id: user._id
                        });
                    }
                );
            }
        });
    });
};

function getTelemetryGroupStatement(start, end) {

    let group, diff, interval;

    diff = end.diff(start, 'hours');
    if (diff < 24) { // Handle 1h to 24hrs, 10s interval
        interval = diff * 10; // seconds
        group = {
            '_id': {
                'tag': '$tag.full',
                'year': { '$year': '$timestamp' },
                'month': { '$month': '$timestamp' },
                'day': { '$dayOfMonth': '$timestamp' },
                'hour': { '$hour': '$timestamp' },
                'minute': { '$minute': '$timestamp' },
                'second': {
                    '$subtract': [
                        { '$second': '$timestamp' },
                        { '$mod': [{ '$second': '$timestamp'}, interval]}
                    ]
                }
            }
        };

        return group;
    }

    diff = end.diff(start, 'days');
    if (diff >= 1 && diff < 7) { // Handle 1d to 7d, 5m interval
        interval = diff * 5; // minutes
        group = {
            '_id': {
                'tag': '$tag.full',
                'year': { '$year': '$timestamp' },
                'month': { '$month': '$timestamp' },
                'day': { '$dayOfMonth': '$timestamp' },
                'hour': { '$hour': '$timestamp' },
                'minute': {
                    '$subtract': [
                        { '$minute': '$timestamp' },
                        { '$mod': [{ '$minute': '$timestamp'}, interval]}
                    ]
                }
            }
        };

        return group;
    }

    diff = end.diff(start, 'weeks');
    if (diff >= 1 && diff < 4) { // Handle 1w to 4w, 30m interval
        interval = diff * 30; // minutes
        group = {
            '_id': {
                'tag': '$tag.full',
                'year': { '$year': '$timestamp' },
                'month': { '$month': '$timestamp' },
                'day': { '$dayOfMonth': '$timestamp' },
                'hour': { '$hour': '$timestamp' },
                'minute': {
                    '$subtract': [
                        { '$minute': '$timestamp' },
                        { '$mod': [{ '$minute': '$timestamp'}, interval]}
                    ]
                }
            }
        };

        return group;
    }

    diff = end.diff(start, 'weeks');
    if (diff >= 4) { // Handle > 4w, 2h interval
        interval = 2; // hours
        group = {
            '_id': {
                'tag': '$tag.full',
                'year': { '$year': '$timestamp' },
                'month': { '$month': '$timestamp' },
                'day': { '$dayOfMonth': '$timestamp' },
                'hour': {
                    '$subtract': [
                        { '$hour': '$timestamp' },
                        { '$mod': [{ '$hour': '$timestamp'}, interval]}
                    ]
                }
            }
        };

        return group;
    }

    return null;
}
