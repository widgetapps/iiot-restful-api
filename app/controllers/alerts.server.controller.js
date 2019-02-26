'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    authorize = require('../lib/authorize.server.lib'),
    Alert = require('@terepac/terepac-models').Alert,
    _ = require('lodash'),
    util = require('../lib/util'),
    endpoint = 'client';

exports.list = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {

        if (!authorized(req)) {
            util.sendUnauthorized(res);
            return;
        }

        var clientId = mongoose.Types.ObjectId(req.params.id);

        Alert.find(
            { client: clientId }, {
                created: 1,
                updated: 1,
                assets: 1,
                sensor: 1,
                alertGroupCodes: 1,
                active: 1,
                frequencyMinutes: 1,
                limits: 1
            }, function(err, alerts) {
                if (!alerts || err) {
                    res.status(404).send({
                        message: 'No alerts found.'
                    });
                    return;
                }

                res.json(alerts);
            });
    });

};

exports.insert = function(req, res) {
    authorize.validate(endpoint, req, res, 'manager', function() {

        if (!authorized(req)) {
            util.sendUnauthorized(res);
            return;
        }

        var clientId = mongoose.Types.ObjectId(req.params.id);

        var alert = new Alert(req.body);
        alert.client = clientId;

        alert.save(function (err, alert) {
            if (err) {
                res.status(400).send({
                    message: 'Error saving alert: ' + err
                });
                return;
            } else {
                res.json(alert);
            }
        });
    });
};

exports.get = function(req, res) {
    authorize.validate(endpoint, req, res, 'manager', function() {

        if (!authorized(req)) {
            util.sendUnauthorized(res);
            return;
        }

        var alertId = mongoose.Types.ObjectId(req.params.alertId);

        Alert.findOne(
            { _id: alertId }, function(err, alert) {
                if (!alert || err) {
                    res.status(404).send({
                        message: 'Alert not found.'
                    });
                    return;
                }

                res.json(alert);
            });
    });
};

exports.update = function(req, res) {
    authorize.validate(endpoint, req, res, 'manager', function() {

        if (!authorized(req)) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
        }

        Alert.findById(
            req.params.alertId,
            function(err, alert) {
                if (!alert || err) {
                    res.status(404).send({
                        message: 'Alert not found.'
                    });
                    return;
                }

                alert = _.assignIn(alert, req.body);

                alert.save(function(err, newAlert) {
                    if (err){
                        res.status(400).send({
                            message: 'Error saving alert.'
                        });
                    }

                    res.json({
                        message: 'Alert has been updated.'
                    });
                });

            }
        );
    });
};

exports.remove = function(req, res) {
    authorize.validate(endpoint, req, res, 'manager', function() {

        if (!authorized(req)) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
        }

        Alert.findByIdAndDelete(
            req.params.alertId,
            function(err, alert) {
                if (!alert || err) {
                    res.status(404).send({
                        message: 'Alert not found.'
                    });
                    return;
                }

                res.status(200).send({
                    message: 'Alert has been deleted.'
                });
            }
        );
    });
};

function authorized(req) {

    switch (req.user.role) {
        case 'manager':
            if (_.includes(req.user.resellerClients, req.params.id)) {
                return true;
            }
            break;
        case 'admin':
            if (req.user.client === req.params.id || _.includes(req.user.resellerClients, req.params.id)) {
                return true;
            }
            break;
        case 'super':
            return true;
    }

    return false;

}
