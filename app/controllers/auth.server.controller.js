'use strict';

/**
 * Controller dependencies.
 */
var User = require('@terepac/terepac-models').User,
    Client = require('@terepac/terepac-models').Client,
    _ = require('lodash'),
    jwt = require('jsonwebtoken');


exports.login = function(req, res) {
    /**
     * 1) Hit the DB to check the credentials. (get the user record)
     * 2) If valid, create a PKI pair
     * 3) Encode the JWT with the private key
     * 4) Store the private & public keys into the DB
     * 5) Return the JWT and the public key
     *
     * NOTE: The headers for API auth stay the same, a client ID and the JWT. Will need to allow a customer to change their client ID
     */

};

exports.logout = function(req, res) {

};

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

                        var token = jwt.sign(user.toObject(), client.apikey.secret, {
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
