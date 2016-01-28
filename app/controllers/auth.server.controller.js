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
    jwt = require('jsonwebtoken');

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
            res.json({ success: false, message: 'Authentication failed. User not found.' });
        } else if (user) {
            if (!user.authenticate(req.body.password)) {
                res.json({ success: false, message: 'Authentication failed. Wrong password.' });
            } else {
                console.log(user._id);
                Client.findById(user.client, function(err, client) {
                    if (err) throw err;

                    if (!client) {
                        res.json({ success: false, message: 'No client associated with user.' });
                    } else if (client) {

                        // Don't store private stuff in the jwt
                        user.password = undefined;
                        user.salt = undefined;

                        var token = jwt.sign(user, client.apikey.secret, {
                            expiresIn: '1d'
                        });

                        // return the information including token as JSON
                        res.json({
                            success: true,
                            message: 'Enjoy your token!',
                            token: token
                        });
                    }
                });
            }
        }

    });

};
