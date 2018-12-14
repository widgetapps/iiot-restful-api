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
                        crypto.generateKeyPair('rsa', {
                            modulusLength: 2048,
                            publicKeyEncoding: {
                                type: 'spki',
                                format: 'pem'
                            },
                            privateKeyEncoding: {
                                type: 'pkcs8',
                                format: 'pem'
                            }
                        }, function (err, publicKey, privateKey) {
                            // Handle errors and use the generated key pair.
                            if (err) {
                                res.status(500).send({
                                    message: 'Error generating keys.'
                                });
                            }

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
                                        algorithm: 'RS256',
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

                        });
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
