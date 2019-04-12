'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    authorize = require('../lib/authorize.server.lib'),
    Client = require('@terepac/terepac-models').Client,
    _ = require('lodash'),
    util = require('../lib/util'),
    endpoint = 'client';

exports.list = function(req, res) {
    getClient(req, res, function(client) {

        res.json(client.alertGroups);

    });
};

exports.insert = function(req, res) {
    // TODO: Need to validate phone numbers with google-libphonenumber
    getClient(req, res, function(client) {
        if (!client.alertGroups) {
            client.alertGroups = [];
        }

        if (!req.body.code || req.body.code === '') {
            res.status(400).send({
                message: 'Alert group code is missing.'
            });
            return;
        }

        if (!req.body.name || req.body.name === '') {
            res.status(400).send({
                message: 'Alert group name is missing.'
            });
            return;
        }

        if (!req.body.contacts || !Array.isArray(req.body.contacts)) {
            res.status(400).send({
                message: 'Alert group contacts is missing or is not an array.'
            });
            return;
        }

        client.alertGroups.push(req.body);
        client.save(function(err, newClient) {
            if (err) {
                res.status(400).send({
                    message: 'Error saving alert group: ' + err
                });
                return;
            }

            res.json(client.alertGroups);
        });
    });
};

exports.get = function(req, res) {
    getClient(req, res, function (client) {
        _.forEach(client.alertGroups, function (alertGroup) {
            if (alertGroup.code === req.params.code) {
                res.json(alertGroup);
                return;
            }
        });

        res.status(404).send({
            message: 'Alert group not found.'
        });
    });
};

exports.update = function(req, res) {
    // TODO: Need to validate phone numbers with google-libphonenumber for E.164 formatting
    getClient(req, res, function (client) {
        var updatedAlertGroups = [];

        _.forEach(client.alertGroups, function (alertGroup) {
            if (alertGroup.code === req.params.code) {
                updatedAlertGroups.push(_.assignIn(alertGroup, req.body));
            } else {
                updatedAlertGroups.push(alertGroup);
            }
        });

        client.alertGroups = updatedAlertGroups;

        client.save(function(err, client) {
            res.status(200).send({
                message: 'Alert groups have been updated.'
            });
        });
    });
};

exports.remove = function(req, res) {
    getClient(req, res, function (client) {
        var updatedAlertGroups = [];
        var code = req.params.code;
        var isId = false;

        try {
            code = mongoose.Types.ObjectId(code);
            isId = true;
        } catch (err) {
            code = req.params.code;
            isId = false;
        }

        // Check if the code is a mongo _id
        if (isId) {
            _.forEach(client.alertGroups, function (alertGroup) {
                if (alertGroup._id.toString() !== code.toString()) {
                    updatedAlertGroups.push(alertGroup);
                }
            });
        } else {
            _.forEach(client.alertGroups, function (alertGroup) {
                if (alertGroup.code !== code) {
                    updatedAlertGroups.push(alertGroup);
                }
            });
        }

        client.alertGroups = updatedAlertGroups;

        client.save(function(err, newClient) {
            res.json(client.alertGroups);
        });
    });
};


function getClient(req, res, callback) {

    authorize.validate(endpoint, req, res, 'user', function() {

        var authorized = false;

        // Make sure the user is allowed see the client
        switch (req.user.role) {
            case 'user':
                if (req.user.client === req.params.id) {
                    authorized = true;
                }
                break;
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
            util.sendUnauthorized(res);
            return;
        }

        var clientId = mongoose.Types.ObjectId(req.params.id);

        Client.findOne(
            { _id: clientId }, function(err, client) {
                if (!client || err) {
                    res.status(404).send({
                        message: 'Client not found.'
                    });
                    return;
                }

                callback(client);
            });
    });
}
