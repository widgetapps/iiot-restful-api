'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * Sensor Schema
 */
    // EGU = Engineering Units (SCADA)
// Add enabled field. This is for buffer all/post roll
var SensorSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
});

mongoose.model('Sensor', SensorSchema);