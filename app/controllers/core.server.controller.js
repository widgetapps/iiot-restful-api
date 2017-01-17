'use strict';

var mongoose = require('mongoose'),
    Device = require('@terepac/terepac-models').Device;

exports.index = function(req, res) {
	res.json({message: 'Hi there, I\'m a Terepac ONE server. Isn\'t that weird?'});
};

exports.dbCheck = function(req, res) {

    var promise = Device.find({}).exec();

    promise.then(function(devices) {
        res.json({
            message: 'DB is A-OK.'
        });
    }).catch(function(e) {
        res.json({
            message: 'DB is NOT doing ok.'
        });
    });

};