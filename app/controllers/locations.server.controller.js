'use strict';

/**
 * Module dependencies.
 */
var Location = require('@terepac/terepac-models').Location;


exports.getOne = function(req, res) {

    var promise = Location.findById(req.params.locationId).exec();

    promise.then(function(location) {
        var authorized = false;

        switch (req.user.role) {
            case 'user':
                if (req.user.client.toString() === location.client.toString()) {
                    authorized = true;
                }
                break;
            case 'manufacturer':
            case 'admin':
            case 'manager':
                if (req.user.client.toString() === location.client.toString() || _.includes(req.user.resellerClients, location.client)) {
                    authorized = true;
                }
                break;
            case 'super':
                authorized = true;
                break;
        }

        if (!authorized) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
        }

        res.json(location);

    }).catch(function(error) {
        res.status(400).send({
            message: 'Error with the database.'
        });
    });
};

exports.update = function(req, res) {

    Location.findByIdAndUpdate(
        req.params.locationId,
        req.body,
        {new: true},
        (err, location) => {
            var authorized = false;

            switch (req.user.role) {
                case 'user':
                    if (req.user.client.toString() === location.client.toString()) {
                        authorized = true;
                    }
                    break;
                case 'manufacturer':
                case 'admin':
                case 'manager':
                    if (req.user.client.toString() === location.client.toString() || _.includes(req.user.resellerClients, location.client)) {
                        authorized = true;
                    }
                    break;
                case 'super':
                    authorized = true;
                    break;
            }

            if (!authorized) {
                res.status(401).send({
                    message: 'You are not authorized to access this resource.'
                });
                return;
            }

            if (err) {
                res.status(400).send({
                    message: 'Error with the database.'
                });
            }

            if (!location) {
                res.status(404).send({
                    message: 'Location not found.'
                });
            }

            res.json(location);
        }
    );
};
