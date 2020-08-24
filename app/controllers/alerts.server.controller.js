'use strict';

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
    Alert = require('@terepac/terepac-models').Alert,
    _ = require('lodash'),
    util = require('../lib/util');

function authorized(req) {
    switch (req.user.role) {
        case 'user':
            if (req.user.client.toString() === req.params.id) {
                return true;
            }
            break;
        case 'manager':
        case 'admin':
            if (req.user.client.toString() === req.params.id || _.includes(req.user.resellerClients, req.params.id)) {
                return true;
            }
            break;
        case 'super':
            return true;
    }

    return false;
}

exports.list = function(req, res) {

    if (!authorized(req)) {
        util.sendUnauthorized(res);
        return;
    }

    let clientId = mongoose.Types.ObjectId(req.params.id);

    Alert.find(
        { client: clientId }, {
            created: 1,
            updated: 1,
            name: 1,
            assets: 1,
            sensorCode: 1,
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

};

exports.insert = function(req, res) {

    if (!authorized(req)) {
        util.sendUnauthorized(res);
        return;
    }

    let clientId = mongoose.Types.ObjectId(req.params.id);

    let alert = new Alert(req.body);
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
};

exports.get = function(req, res) {

    if (!authorized(req)) {
        util.sendUnauthorized(res);
        return;
    }

    let alertId = mongoose.Types.ObjectId(req.params.alertId);

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
};

exports.update = function(req, res) {

    if (!authorized(req)) {
        util.sendUnauthorized(res);
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

            alert.save(function(err, updatedAlert) {
                if (err){
                    res.status(400).send({
                        message: 'Error saving alert.'
                    });
                }

                res.json(updatedAlert);
            });

        }
    );
};

exports.remove = function(req, res) {

    if (!authorized(req)) {
        util.sendUnauthorized(res);
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
                message: 'Alert has been deleted.',
                id: alert._id
            });
        }
    );
};
