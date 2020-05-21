'use strict';

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
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
    authorize = require('../lib/authorize.server.lib'),
    endpoint = 'client',
    JSONStream = require('JSONStream');



function getTelemetryGroupStatementInterval(start, end, interval) {
    /*
    Remove last char of interval
    Check to make sure it's valid letter (s, m, h, d)
    Calculate the number of days between start and end
    Check the interval makes sense for the days to limit retured data
     */
}

function getTelemetryGroupStatement(start, end) {

    let group, diff, interval;

    group = {
        '_id': {
            'tag': '$tag.full',
            'year': { '$year': '$timestamp' },
            'month': { '$month': '$timestamp' },
            'day': { '$dayOfMonth': '$timestamp' },
            'hour': { '$hour': '$timestamp' }
        }
    };

    diff = end.diff(start, 'hours');
    if (diff < 24) { // Handle 1h to 24hrs, 10s interval
        interval = diff * 10; // seconds
        group._id.minute = { '$minute': '$timestamp' };
        group._id.second = {
            '$subtract': [
                { '$second': '$timestamp' },
                { '$mod': [{ '$second': '$timestamp'}, interval]}
            ]
        };

        return group;
    }

    diff = end.diff(start, 'days');
    if (diff >= 1 && diff < 7) { // Handle 1d to 7d, 5m interval
        interval = diff * 5; // minutes
        group._id.minute = {
            '$subtract': [
                { '$minute': '$timestamp' },
                { '$mod': [{ '$minute': '$timestamp'}, interval]}
            ]
        };

        return group;
    }

    diff = end.diff(start, 'weeks');
    if (diff >= 1 && diff < 4) { // Handle 1w to 4w, 30m interval
        interval = diff * 30; // minutes
        group._id.minute = {
            '$subtract': [
                { '$minute': '$timestamp' },
                { '$mod': [{ '$minute': '$timestamp'}, interval]}
            ]
        };

        return group;
    }

    diff = end.diff(start, 'weeks');
    if (diff >= 4) { // Handle > 4w, 2h interval
        interval = 2; // hours
        group._id.hour = {
            '$subtract': [
                { '$hour': '$timestamp' },
                { '$mod': [{ '$hour': '$timestamp'}, interval]}
            ]
        };

        return group;
    }

    return null;
}

function userAuthorized(req) {
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

    return authorized;
}

function validateDates(req) {
    let now = moment.utc();
    let start = moment.utc(req.query.start);
    let end = moment.utc(req.query.end);

    if (!start.isValid() || !end.isValid()) {
        return {
            valid: false,
            message: 'Start and/or end date are invalid.'
        };
    }

    if (start.isAfter(now)) {
        return {
            valid: false,
            message: 'The start date must be in the past.'
        };
    }

    if (start.isAfter(end)) {
        return {
            valid: false,
            message: 'The start date must be before the end date.'
        };
    }

    return {
        valid: true,
        now: now,
        start: start,
        end: end
    };

}

exports.getSummarizedTelemetry = function(req, res) {

    if (!userAuthorized(req)) {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    if (!req.query.tags || req.query.tags === '') {
        res.status(400).send({
            message: 'No tags where provided.'
        });
        return;
    }

    let dates = validateDates(req);

    if (!dates.valid) {
        res.status(400).send({
            message: dates.message
        });
        return;
    }

    let interval = req.query.interval;
    let intervalGroup = {};
    intervalGroup.group    = interval[interval.length - 1];
    intervalGroup.interval = parseInt(interval.substring(0, interval.length - 1));
};

exports.getAggregatedTelemetry = function(req, res) {

    if (!userAuthorized(req)) {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    if (!req.query.tags || req.query.tags === '') {
        res.status(400).send({
            message: 'No tags where provided.'
        });
        return;
    }

    let dates = validateDates(req);

    if (!dates.valid) {
        res.status(400).send({
            message: dates.message
        });
        return;
    }

    if (dates.end.diff(dates.start, 'hours') < 1) {
        res.status(400).send({
            message: 'There must be at least 1 hour between the start and end dates.',
            hours: dates.end.diff(dates.start, 'hours')
        });
        return;
    }

    if (dates.end.diff(dates.start, 'days') > 365) {
        res.status(400).send({
            message: 'There cannot be more than 365 days between the start and end dates.',
            days: dates.end.diff(dates.start, 'days')
        });
        return;
    }

    res.set({
        'Content-Type': 'application/json',
        'X-Accel-Buffering': 'no',
        'Cache-Control': 'no-cache'
    });

    let group = getTelemetryGroupStatement(dates.start, dates.end);
    let sort = {'_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1, '_id.minute': 1, '_id.second': 1};

    group.unit = {'$first': '$data.unit'};
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

    let tags = req.query.tags.split(',');

    Telemetry.aggregate([
        {'$match': {
                'tag.full': {$in: tags},
                timestamp: {'$gte': moment(req.query.start).toDate(), '$lt': moment(req.query.end).toDate()}
            }},
        {'$group': group},
        {'$sort': sort}
    ]).cursor().exec().pipe(JSONStream.stringify()).pipe(res);
};

exports.searchTelemetry = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {

        if (!userAuthorized(req)) {
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
            timestamp: {'$gte': moment(req.query.start), '$lt': moment(req.query.end)}
        }, fields)
            .sort({timestamp: 1})
            .cursor()
            .pipe(JSONStream.stringify())
            .pipe(res);
    });
};

exports.getLatestTelemetry = function(req, res) {
    authorize.validate(endpoint, req, res, 'user', function() {

        if (!userAuthorized(req)) {
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