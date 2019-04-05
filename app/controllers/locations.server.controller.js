'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    _ = require('lodash'),
    Location = require('@terepac/terepac-models').Location,
    Client = require('@terepac/terepac-models').Client,
    Asset = require('@terepac/terepac-models').Asset;


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

    Location.findById(
        req.params.locationId,
        function (err, location) {
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

            if (!location || err) {
                res.status(404).send({
                    message: 'Location not found.'
                });
                return;
            }

            location = _.assignIn(location, req.body);

            location.save(function(err, newLocation) {
                if (err){
                    res.status(400).send({
                        message: 'Error saving location.'
                    });
                }

                res.json(newLocation);
            });

        }
    );
};

exports.remove = function(req, res) {
    Location.findById(
        req.params.locationId,
        function (err, location) {
            var authorized = false;

            switch (req.user.role) {
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

            if (!location || err) {
                res.status(404).send({
                    message: 'Location not found.'
                });
                return;
            }

            // Query asset to see if this has been assigned to an asset Can't remove if so.
            Asset.find(
                {location: mongoose.Types.ObjectId(location._id)},
                function(err, assets) {
                    if (assets.length > 0) {
                        res.status(400).send({
                            message: 'Cannot delete location. The location is assigned to at least one asset.'
                        });
                        return;
                    } else {
                        location.remove(function(err, removedLocation) {
                            if (err) {
                                res.status(400).send({
                                    message: 'Database error.'
                                });
                                return;
                            }

                            Client.findByIdAndUpdate(
                                location.client,
                                {$pull: {'locations': mongoose.Types.ObjectId(location._id)}},
                                {safe: true, new : true},
                                function(err, client) {

                                    res.json({
                                        message: 'The device has been deleted.'
                                    });
                                    return;

                                }
                            );

                        });
                    }
                }
            );

        }
    );
};
