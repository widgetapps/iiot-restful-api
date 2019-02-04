'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    errorHandler = require('./errors.server.controller'),
    User = require('@terepac/terepac-models').User,
    _ = require('lodash'),
    moment = require('moment');

exports.list = function(req, res) {
    if (!_.contains(req.user.roles, 'admin')) {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    res.status(400).send({
        message: 'Not implemented yet.'
    });
};

exports.getOne = function(req, res) {
    if (!_.contains(req.user.roles, 'admin')) {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    res.status(400).send({
        message: 'Not implemented yet.'
    });
};

exports.update = function(req, res) {
    if (!_.contains(req.user.roles, 'admin')) {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    res.status(400).send({
        message: 'Not implemented yet.'
    });
};

exports.changePassword = function(req, res) {
    if (!_.contains(req.user.roles, 'admin')) {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    var promise = User.findOne({ email: req.body.email }).exec();
    promise.then(function (user) {
        user.pasword = req.body.password;

        user.save(function (err, user) {
            if (err) {
                res.status(400).send({
                    message: 'Error resetting password: ' + err
                });
                return;
            } else {
                res.status(200).send({
                    message: 'The password has been changed.'
                });
            }
        });
    });
};
