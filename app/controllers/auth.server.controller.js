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
                res.status(401).send({
                    message: 'Authentication failed. Incorrect password.'
                });
            } else {
                Client.findById(user.client, function(err, client) {
                    if (err) throw err;

                    if (!client) {
                        res.status(404).send({
                            message: 'No client associated with user, you are an orphan!'
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

                            User.findByIdAndUpdate(
                                user._id,
                                {
                                    '$set': {
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
                                        expiresIn: '7d'
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

exports.authenticate = function(req, res) {

    let promise = User.findOne({ email: req.body.email }).exec();
    promise.then(function (user) {
        if (!user) {
            res.status(404).send({
                message: 'Authentication failed. User not found.'
            });
            return;
        }

        if (!user.authenticate(req.body.password)) {
            res.status(401).send({
                message: 'Authentication failed. Incorrect password.'
            });
            return;
        }

        Client.findById(user.client, function(err, client) {

            if (err || !client) {
                res.status(404).send({
                    message: 'No client associated with user, you are an orphan!'
                });
                return;
            }

            // If the JTW in the DB is still valid, just return that.
            let existingKey = false;
            if (user.pki && user.pki.token) {
                jwt.verify(user.pki.token, user.pki.publicKey, function(err, decoded) {
                    if (!err) {
                        res.json({
                            message: 'Login successful using existing JWT.',
                            token: user.pki.token,
                            publicKey: user.pki.publicKey
                        });

                        existingKey = true;
                    }
                });
            }

            if (existingKey) return;

            //  Create a new JTW
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
                    return;
                }

                // Clone the user object to strip out fields that shouldn't be in the JWT
                let userJwt = _.cloneDeep(user);

                userJwt.id = user._id;

                // Don't store private stuff in the jwt
                userJwt._id = undefined;
                userJwt.password = undefined;
                userJwt.salt = undefined;
                userJwt.provider = undefined;
                userJwt.providerData = undefined;
                userJwt.additionalProviderData = undefined;
                userJwt.active = undefined;
                userJwt.resetPasswordToken = undefined;
                userJwt.resetPasswordExpires = undefined;
                userJwt.pki = undefined;
                userJwt.__v = undefined;
                userJwt.created = undefined;
                userJwt.updated = undefined;
                userJwt.phone = undefined;

                // Add reseller info to the user
                if (client.reseller) {
                    userJwt.reseller = true;
                    userJwt.resellerClients = client.resellerClients;
                } else {
                    userJwt.reseller = false;
                }

                userJwt.apiKey = client.apikey.id;

                let token = jwt.sign(userJwt.toObject(), privateKey, {
                    algorithm: 'RS256',
                    expiresIn: '7d'
                });

                user.pki.publicKey = publicKey;
                user.pki.token = token;

                user.save(function(err, savedUser) {

                    if (!savedUser || err) {
                        res.status(404).send({
                            message: 'Error saving keys.'
                        });
                        return;
                    }

                    // return the information, including token, as JSON
                    res.json({
                        message: 'Login successful using a new JWT.',
                        token: token,
                        publicKey: publicKey
                    });
                });

            });
        });
    }).catch(function() {
        res.status(500).send({
            message: 'Error with the database.'
        });
    });
};

exports.logout = function(req, res) {

};

exports.validate = function(req, res) {
    res.json({message: 'The JWT is valid.'});
};
