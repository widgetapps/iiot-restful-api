'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * Sensor Schema
 */
var SensorSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
});

mongoose.model('Sensor', SensorSchema);