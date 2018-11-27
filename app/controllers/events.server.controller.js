'use strict';

/**
 * Module dependencies.
 */
var Event = require('@terepac/terepac-models').Event,
    _ = require('lodash'),
    moment = require('moment'),
    authorize = require('../lib/authorize.server.lib'),
    endpoint = 'event';

exports.getOne = function(req, res) {
    res.json({eventId: req.params.eventId}); return;
    authorize.validate(endpoint, req, res, 'user', function() {

        var promise = Event.findById(req.params.eventId).populate('asset').populate('device').populate('sensor').exec();

        promise.then(function(event) {
            var authorized = false;

            switch (req.user.role) {
                case 'user':
                    if (req.user.client.toString() === event.client.toString()) {
                        authorized = true;
                    }
                    break;
                case 'admin':
                case 'manager':
                    if (req.user.client.toString() === event.client.toString() || _.contains(req.user.resellerClients, event.client)) {
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
        var authorized = false;

        switch (req.user.role) {
            case 'user':
                if (req.user.client === req.params.id) {
                    authorized = true;
                }
                break;
            case 'manager':
            case 'admin':
                if (req.user.client === req.params.id || _.contains(req.user.resellerClients, req.params.id)) {
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
