'use strict';

/**
 * Controller dependencies.
 */
var User = require('@terepac/terepac-models').User,
    Client = require('@terepac/terepac-models').Client,
    _ = require('lodash'),
    jwt = require('jsonwebtoken'),
    crypto = require('crypto');


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

    var promise = User.findOne({ email: req.body.email }).exec();
    promise.then(function (user) {
        if (!user) {
            res.status(404).send({
                message: 'Authentication failed. User not found.'
            });
        } else {
            if (!user.authenticate(req.body.password)) {
                res.status(404).send({
                    message: 'Authentication failed. Incorrect password.'
                });
            } else {
                Client.findById(user.client, function(err, client) {
                    if (err) throw err;

                    if (!client) {
                        res.status(404).send({
                            message: 'No client associated with user, your are an orphan!'
                        });
                    } else {
                        var diffHell = crypto.createDiffieHellman(1536);
                        diffHell.generateKeys();

                        var privateKey = diffHell.getPrivateKey('hex');
                        var publicKey = diffHell.getPublicKey('hex');

                        user.pki.privateKey = privateKey;
                        user.pki.publicKey = publicKey;

                        User.findByIdAndUpdate(
                            user._id,
                            {
                                '$set': {
                                    'pki.privateKey': privateKey,
                                    'pki.publicKey': publicKey,
                                    updated: Date.now()
                                }
                            },
                            function (err, savedUser) {

                                if (!savedUser || err) {
                                    res.status(404).send({
                                        message: 'Error saving keys.'
                                    });
                                }

                                // Don't store private stuff in the jwt
                                savedUser.password = undefined;
                                savedUser.salt = undefined;
                                savedUser.provider = undefined;
                                savedUser.providerData = undefined;
                                savedUser.additionalProviderData = undefined;
                                savedUser.active = undefined;
                                savedUser.resetPasswordToken = undefined;
                                savedUser.resetPasswordExpires = undefined;
                                savedUser.pki = undefined;

                                // Add reseller info to the user
                                if (client.reseller) {
                                    savedUser.reseller = true;
                                    savedUser.resellerClients = client.resellerClients;
                                } else {
                                    savedUser.reseller = false;
                                }

                                var token = jwt.sign(savedUser.toObject(), privateKey, {
                                    expiresIn: '1d'
                                });

                                // return the information, including token, as JSON
                                res.json({
                                    message: 'Login successful.',
                                    token: token,
                                    publicKey: publicKey
                                });
                            }
                        );
                    }
                });
            }
        }
    }).catch(function() {
        res.status(500).send({
            message: 'Error with the database.'
        });
    });

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
                // console.log('ERROR: BAD PASSWORD - ' + user.hashPassword(req.body.password) + ' vs ' + user.password);
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
