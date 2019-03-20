'use strict';

/**
 * Module dependencies.
 */
var Tag = require('@terepac/terepac-models').Tag,
    _ = require('lodash');

exports.getHistory = function(req, res) {

    let promise = Tag.findById(req.params.tagId).populate('historical.device', {_id: 1, serialNumber: 1, type: 1, description: 1}).exec();

    promise.then(function(tag) {
        let authorized = false;

        switch (req.user.role) {
            case 'user':
                if (req.user.client.toString() === tag.client.toString()) {
                    authorized = true;
                }
                break;
            case 'manufacturer':
            case 'admin':
            case 'manager':
                if (req.user.client.toString() === tag.client.toString() || _.includes(req.user.resellerClients, tag.client)) {
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

        if (!tag) {
            res.status(404).send({
                message: 'Tag not found.'
            });
            return;
        }

        res.json({
            tag: tag.tag.full,
            active: tag.active,
            activeStart: tag.activeStart,
            historical: tag.historical
        });

    }).catch(function(error) {
        res.status(400).send({
            message: 'Error with the database.'
        });
    });
};

