'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    errorHandler = require('./errors.server.controller'),
    Client = require('@terepac/terepac-models').Client,
    User = require('@terepac/terepac-models').User,
    _ = require('lodash'),
    moment = require('moment'),
    randomstring = require('randomstring'),
    authorize = require('../lib/authorize.server.lib'),
    endpoint = 'asset';

exports.getOne = function(req, res) {

};

exports.update = function(req, res) {

};

exports.listDevices = function(req, res) {

};

// Remember to add/update the tag when a device is added to an asset. Think about other things that need updating!
exports.addDevice = function(req, res) {

};

// Remember to add/update the tag when a device is removed from an asset
exports.removeDevice = function(req, res) {

};
