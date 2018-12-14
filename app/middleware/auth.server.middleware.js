'use strict';

module.exports = function(req, res, next) {

    var Client = require('@terepac/terepac-models').Client;
    var User = require('@terepac/terepac-models').User;
    var jwt = require('jsonwebtoken');

    var token = req.headers['x-access-token'];
    var clientId = req.headers['x-client-id'];

    if (token && clientId) {
        Client.findOne({
            'apikey.id': clientId
        },{
            _id: 1,
            apikey: 1
        }).exec(function(err, client) {
            if (client === null) {
                res.status(401).send({
                    message: 'Client ID not found',
                    ref: 'https://developers.terepac.one/#authentication'
                });
            } else {
                var decodedUser = jwt.decode(token);

                User.findById(decodedUser._id, {pki: 1, client: 1}).exec(function(err, user) {
                    if (!user || err) {
                        res.status(404).send({
                            message: 'Authentication error: User not found.',
                            ref: 'https://developers.terepac.one/#authentication'
                        });
                    }

                    if (user.client.valueOf() !== client._id.valueOf()) {
                        res.status(401).send({
                            message: 'Authentication error: User does not belong to supplied Client ID.',
                            ref: 'https://developers.terepac.one/#authentication',
                            details: 'User Client ID ' + user.client + ' supplied Client ID ' + client._id
                        });
                    }

                    jwt.verify(token, user.pki.publicKey, function(err, decoded) {
                        if (err) {
                            res.status(401).send({
                                message: 'The supplied x-access-token (JWT) is not valid. Please login again.',
                                ref: 'https://developers.terepac.one/#authentication',
                                error: err
                            });
                        } else {
                            // if everything is good, save to request for use in other routes
                            req.user = decoded;
                            next();
                        }
                    });
                });
            }
        });

    } else {
        res.status(401).send({
            message: 'One or both of the required headers (x-client-id, x-access-token) are missing.',
            ref: 'https://developers.terepac.one/#authentication',
            path: req.path
        });
    }
};
