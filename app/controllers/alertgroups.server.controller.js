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
    getClient(req, res, function(client) {
        if (!client.alertGroups) {
            client.alertGroups = [];
        }
        client.alertGroups.push(req.body);
        client.save(function(err, client) {
            res.status(200).send({
                message: 'Alert group has been added.'
            });
        });
    });
};

exports.get = function(req, res) {
    getClient(req, res, function (client) {
        _.forEach(client.alertGroups, function (alertGroup) {
            if (alertGroup.code === req.params.code) {
                res.json(alertGroup);
            }
        });

        res.status(404).send({
            message: 'Alert group not found.'
        });
    });
};

exports.update = function(req, res) {
    getClient(req, res, function (client) {
        var updatedAlertGroups = [];

        _.forEach(client.alertGroups, function (alertGroup) {
            if (alertGroup.code === req.params.code) {
                updatedAlertGroups.push(req.body);
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

        _.forEach(client.alertGroups, function (alertGroup) {
            if (alertGroup.code !== req.params.code) {
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
            { _id: clientId }, {
                created: 1,
                updated: 1,
                'apikey.id': 1,
                companyName: 1,
                address: 1,
                contact: 1,
                reseller: 1,
                alertGroups: 1
            }, function(err, client) {
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
