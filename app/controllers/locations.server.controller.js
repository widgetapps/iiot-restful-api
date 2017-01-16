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
