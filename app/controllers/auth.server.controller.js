'use strict';

/**
 * Controller dependencies.
 */
var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Client = mongoose.model('Client'),
    Device = mongoose.model('Device'),
    _ = require('lodash'),
    moment = require('moment'),
    jwt = require('jsonwebtoken'),
    randomstring = require('randomstring');

/**
 * Module dependencies.
 */
exports.authenticate = function(req, res) {
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

        if (err) throw err;

        if (!user) {
            res.status(404).send({
                message: 'Authentication failed. User not found.'
            });
        } else if (user) {
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

                        // Generate the new client ID
                        var clientId = randomstring.generate({
                            length: 32,
                            charset: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_+;":,.<>/?'
                        });

                        // save the client ID
                        client.apikey.id = clientId;
                        client.save(function(err) {

                            if (err) {
                                res.status(409).send({
                                   message: 'Error saving the client ID'
                                });
                                return;
                            }
                            var token = jwt.sign(user, client.apikey.secret, {
                                expiresIn: '1d'
                            });

                            // return the information, including token, as JSON
                            res.json({
                                message: 'Authentication successful.',
                                clientId: clientId,
                                token: token
                            });
                        });
                    }
                });
            }
        }

    });

};
