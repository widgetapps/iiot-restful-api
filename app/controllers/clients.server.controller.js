'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    errorHandler = require('./errors.server.controller'),
    Client = mongoose.model('Client'),
    User = mongoose.model('User'),
    _ = require('lodash'),
    moment = require('moment'),
    randomstring = require('randomstring');

exports.list = function(req, res) {
    if (!_.contains(req.user.roles, 'admin')) {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    Client.find( {},
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
    if (!_.contains(req.user.roles, 'admin')) {
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

    client.save(function (err, client) {
        if (err) {
            res.status(400).send({
                message: 'Error inserting the client: ' + err
            });
            return;
        } else {
            res.status(200).send({
                _id: client._id
            });
        }
    });

};

exports.getOne = function(req, res) {
    if (!_.contains(req.user.roles, 'admin')) {
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
        }, function(err, device) {
            if (!device || err) {
                res.status(404).send({
                    message: 'No device found.'
                });
                return;
            }

            res.json(device);
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
