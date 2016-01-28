'use strict';

module.exports = function(req, res, next) {

    var mongoose = require('mongoose');
    var Client = mongoose.model('Client');
    var jwt = require('jsonwebtoken');

    console.log('A secured request!');
    var token = req.headers['x-access-token'];
    var clientId = req.headers['x-client-id'];

    if (token && clientId) {
        Client.findOne({
            'apikey.id': clientId
        },{
            apikey: 1
        }).exec(function(err, client) {
            jwt.verify(token, client.apikey.secret, function(err, decoded) {
                if (err) {
                    res.json({ success: false, message: 'Failed to authenticate token.' });
                } else {
                    // if everything is good, save to request for use in other routes
                    req.decoded = decoded;
                    next();
                }
            });
        });

    } else {
        res.status(403).send({
            success: false,
            message: 'No token and/or client ID provided.'
        });
    }
};