'use strict';

module.exports = function(req, res, next) {

    var mongoose = require('mongoose');
    var Client = require('@terepac/terepac-models').Client;
    var jwt = require('jsonwebtoken');

    var token = req.headers['x-access-token'];
    var clientId = req.headers['x-client-id'];

    if (token && clientId) {
        Client.findOne({
            'apikey.id': clientId
        },{
            apikey: 1
        }).exec(function(err, client) {
            if (client === null) {
                res.status(401).send({
                    message: 'Client not found',
                    ref: 'https://developers.terepac.one/#authentication'
                });
            } else {
                jwt.verify(token, client.apikey.secret, function(err, decoded) {
                    if (err) {
                        res.status(401).send({
                            message: 'The supplied x-access-token (JWT) is not valid.',
                            ref: 'https://developers.terepac.one/#authentication',
                            url: req.baseUrl
                        });
                    } else {
                        // if everything is good, save to request for use in other routes
                        req.user = decoded;
                        next();
                    }
                });
            }
        });

    } else {
        res.status(401).send({
            message: 'One or both of the required headers (x-client-id, x-access-token) are missing.',
            ref: 'https://developers.terepac.one/#authentication',
            url: req.baseUrl
        });
    }
};