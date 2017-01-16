'use strict';

/**
 * Controller dependencies.
 */
var mongoose = require('mongoose'),
    User = require('@terepac/terepac-models').User,
    Client = require('@terepac/terepac-models').Client,
    Device = require('@terepac/terepac-models').Device,
    _ = require('lodash'),
    moment = require('moment'),
    jwt = require('jsonwebtoken'),
    randomstring = require('randomstring');

/**
 * Module dependencies.
 */
exports.authenticate = function(req, res) {

    console.log('STARTING AUTHENTICATION...');
    console.log('EMAIL: ' + req.body.email);

    User.findOne({
        email: req.body.email
    },{
        firstName: 1,
        lastName: 1,
        email: 1,
        password: 1,
        salt: 1,
        phone: 1,
        roles: 1,
        active: 1,
        client: 1
    }).exec(function(err, user) {

        console.log('QUERY SUCCESSFUL');

        if (err) {
            res.status(404).send({
                message: 'Error finding the user: ' + err
            });
            return;
        }

        console.log('NO ERROR');

        if (!user) {
            console.log('NO USER');
            res.status(404).send({
                message: 'Authentication failed. User not found.'
            });
        } else {
            console.log('USER FOUND');
            if (!user.authenticate(req.body.password)) {
                res.status(404).send({
                    message: 'Authentication failed. Incorrect password.'
                });
            } else {
                console.log(user._id);
                Client.findById(user.client, function(err, client) {
                    if (err) throw err;

                    if (!client) {
                        res.status(409).send({
                            message: 'No client associated with user, your are an orphan!'
                        });
                    } else if (client) {

                        // Don't store private stuff in the jwt
                        user.password = undefined;
                        user.salt = undefined;

                        // Add reseller info to the user
                        if (client.reseller) {
                            user.reseller = true;
                            user.resellerClients = client.resellerClients;
                        } else {
                            user.reseller = false;
                        }

                        var token = jwt.sign(user, client.apikey.secret, {
                            expiresIn: '1d'
                        });

                        // return the information, including token, as JSON
                        res.json({
                            message: 'Authentication successful.',
                            token: token
                        });
                    }
                });
            }
        }

    });

};
