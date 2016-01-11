'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * Measurement Schema
 * This contains each sample sent by devices
 */
var MeasurementSchema = new Schema({
    created: {
        type: Date,
        index: true
    },
    updated: {
        type: Date
    },
    sensor: {
        type: String,
        index: true
    },
    data: {
        unit: {
            type: String
        },
        values :{
            min: {
                type: Number
            },
            max: {
                type: Number
            },
            average: {
                type: Number
            },
            current: {
                type: Number
            }
        }
    },
    device: {
        type: Schema.ObjectId,
        ref: 'Device',
        index: true
    }
});

MeasurementSchema.pre('save', function(next) {
    // get the current date
    var currentDate = new Date();

    // change the updated field to current date
    this.updated = currentDate;

    // if created doesn't exist, add to that field
    if (!this.created)
        this.created = currentDate;

    next();
});

module.exports = mongoose.model('Measurement', MeasurementSchema);