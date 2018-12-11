'use strict';

/**
 * Controller dependencies.
 */
var User = require('@terepac/terepac-models').User,
    Client = require('@terepac/terepac-models').Client,
    _ = require('lodash'),
    jwt = require('jsonwebtoken');

/**
 * Module dependencies.
 */
exports.authenticate = function(req, res) {

    var promise = User.findOne({ email: req.body.email }).exec();

    console.log('PROMISES HAVE BEEN MADE');

    promise.then(function (user) {

        console.log('QUERY SUCCESSFUL');

        if (!user) {
            console.log('ERROR: NO USER');
            res.status(404).send({
                message: 'Authentication failed. User not found.'
            });
        } else {
            console.log('USER FOUND');
            if (!user.authenticate(req.body.password)) {
                console.log('ERROR: BAD PASSWORD - ' + user.hashPassword(req.body.password) + ' vs ' + user.password);
                res.status(404).send({
                    message: 'Authentication failed. Incorrect password.'
                });
            } else {
                console.log('USER ID: ' + user._id);
                Client.findById(user.client, function(err, client) {
                    if (err) throw err;

                    if (!client) {
                        console.log('ERROR: NO CLIENT');
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

                        var token = jwt.sign(JSON.stringify(user), client.apikey.secret, {
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
    }).catch(function() {
        res.status(404).send({
            message: 'Error with the database.'
        });
    });

};
