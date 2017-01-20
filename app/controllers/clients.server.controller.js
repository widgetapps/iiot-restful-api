'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    errorHandler = require('./errors.server.controller'),
    Client = require('@terepac/terepac-models').Client,
    Tag = require('@terepac/terepac-models').Tag,
    Telemetry = require('@terepac/terepac-models').Telemetry,
    User = require('@terepac/terepac-models').User,
    _ = require('lodash'),
    moment = require('moment'),
    randomstring = require('randomstring'),
    authorize = require('../lib/authorize.server.lib'),
    endpoint = 'client';

exports.list = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {
        // Build the query based on role.
        var query;

        switch (req.user.role) {
            case 'user':
                query = {
                    _id: req.user.client
                };
                break;
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
    });


};

exports.insert = function(req, res) {

    authorize.validate(endpoint, req, res, 'manager', function() {

        // admin & manager roles must be a reseller to add a client
        if (!req.user.reseller && (req.user.role == 'admin' || req.user.role == 'manager')) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });

            return;
        }

        var client = new Client(req.body);
        client.apikey.id = randomstring.generate({
            length: 32,
            charset: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_+;":,.<>/?'
        });

        client.apikey.secret = randomstring.generate({
            length: 30,
            charset: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_+;":,.<>/?'
        });

        if (req.user.reseller) {
            client.resellerParent = mongoose.Types.ObjectId(req.params.id);
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
    });

};

exports.getOne = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {

        var authorized = false;

        // Make sure the user is allowed see the client
        switch (req.user.role) {
            case 'user':
                if (req.user.client == req.params.id) {
                    authorized = true;
                }
                break;
            case 'manager':
            case 'admin':
                if (req.user.client == req.params.id || _.contains(req.user.resellerClients, req.params.id)) {
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
                if (_.contains(req.user.resellerClients, req.params.id)) {
                    authorized = true;
                }
                break;
            case 'admin':
                if (req.user.client == req.params.id || _.contains(req.user.resellerClients, req.params.id)) {
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

        Client.findByIdAndUpdate(
            req.user.client,
            req.body,
            {safe: true, new : true},
            function(err, client) {
                if (!client || err) {
                    res.status(404).send({
                        message: 'Client not found.'
                    });
                    return;
                }

                res.json(client);
            }
        );
    });
};

exports.listTags = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {
        var query;

        switch (req.user.role) {
            case 'user':
                query = {
                    client: req.user.client
                };
                break;
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

        Tag.find( query,
            {
                tag: 1,
                description: 1,
                unit: 1,
                active: 1,
                activeStart: 1,
                historical: 1
            }, function(err, tags) {
                res.json(tags);
            });
    });
};

exports.searchTelemetry = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {
        var authorized = false;

        switch (req.user.role) {
            case 'user':
                if (req.user.client == req.params.id) {
                    authorized = true;
                }
                break;
            case 'manager':
            case 'admin':
                if (req.user.client == req.params.id || _.contains(req.user.resellerClients, req.params.id)) {
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
        if (req.query.asset == '1') {
            fields.asset = 1;
        }
        if (req.query.device == '1') {
            fields.device = 1;
        }
        if (req.query.sensor == '1') {
            fields.sensor = 1;
        }

        Telemetry.find({
            'tag.full': {$in: tags},
            timestamp: {'$gte': moment(req.query.start), '$lte': moment(req.query.end)}
        }, fields)
        .sort('timestamp')
        .exec(function(err, telemetries) {
            if (err) {
                res.status(500).send({
                    message: 'Database error.'
                });
                return;
            } else if (telemetries.length === 0) {
                res.status(200).send({
                    message: 'No data found. Did you include the start, end & tags params?'
                });
                return;
            }

            res.json(telemetries);

        });
    });
};

exports.listLocations = function(req, res) {

};

exports.insertLocation = function(req, res) {

};

exports.listAssets = function(req, res) {

};

exports.insertAsset = function(req, res) {

};

exports.listDevices = function(req, res) {

};

exports.insertDevice = function(req, res) {
    // TODO: Remember that when a new device is added, also insert login creds for MQTT. Hmm, I might be able to do this with a hook.
};

exports.getUsers = function(req, res) {
    if (!_.contains(req.user.roles, 'admin')) {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    var clientId = mongoose.Types.ObjectId(req.params.id);

    User.find( {client: clientId},
        {
            created: 1,
            updated: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            phone: 1,
            roles: 1,
            active: 1
        }, function(err, users) {
            res.json(users);
        });

};

exports.insertUser = function(req, res) {
    if (!_.contains(req.user.roles, 'admin')) {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    var clientId = mongoose.Types.ObjectId(req.params.id);
    var user = new User(req.body);
    user.provider = 'local';
    user.client = clientId;
    user.save(function (err, user) {
        if (err) {
            res.status(400).send({
                message: 'Email already exists.'
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

};
