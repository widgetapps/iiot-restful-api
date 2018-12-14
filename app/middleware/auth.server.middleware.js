'use strict';

module.exports = function(req, res, next) {

    var Client = require('@terepac/terepac-models').Client;
    var jwt = require('jsonwebtoken');

    var token = req.headers['x-access-token'];
    var clientId = req.headers['x-client-id'];

    if (token && clientId) {
        Client.findOne({
            'apikey.id': clientId
        },{
            apikey: 1,
            pki: 1
        }).exec(function(err, client) {
            if (client === null) {
                res.status(401).send({
                    message: 'Client ID not found',
                    ref: 'https://developers.terepac.one/#authentication'
                });
            } else {
                jwt.verify(token, client.pki.publicKey, function(err, decoded) {
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
