'use strict';

/**
 * Module dependencies.
 */
var Event = require('@terepac/terepac-models').Event,
    EventTelemetry = require('@terepac/terepac-models').EventTelemetry,
    _ = require('lodash'),
    moment = require('moment'),
    authorize = require('../lib/authorize.server.lib'),
    JSONStream = require('JSONStream'),
    microdate = require('../lib/microdate'),
    endpoint = 'event';

exports.getOne = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {

        var promise = Event.findById(req.params.eventId)
            .populate('asset', {tagCode: 1, name: 1, description: 1, location: 1})
            .populate('device', {serialNumber: 1, type: 1, description: 1})
            .populate('sensor', {type: 1, typeString: 1, description: 1, unit: 1})
            .exec();

        promise.then(function(event) {
            var authorized = false;

            switch (req.user.role) {
                case 'user':
                    if (req.user.client.toString() === event.client.toString()) {
                        authorized = true;
                    }
                    break;
                case 'manufacturer':
                case 'admin':
                case 'manager':
                    if (req.user.client.toString() === event.client.toString() || _.includes(req.user.resellerClients, event.client)) {
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

            res.json(event);

        }).catch(function(error) {
            res.status(404).send({
                message: 'Error with the database.'
            });
        });
    });
};

exports.searchTelemetry = function(req, res) {
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

        query.event = req.params.eventId;

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

        EventTelemetry.find(query, fields)
            .sort({timestamp: 1})
            .cursor()
            .pipe(JSONStream.stringify())
            .pipe(res);
    });
};
