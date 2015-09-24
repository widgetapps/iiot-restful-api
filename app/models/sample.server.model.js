'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * Sample Schema
 * This contains each sample sent by devices
 */
var SampleSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
    timestamp: {
        type: Date
    },
    data: {
        value: {
            type: Number
        },
        unit: {
            type: String
        }
    },
    tagname: {
        type: String
    },
    device: {
        type: Schema.ObjectId,
        ref: 'Device'
    }
});

mongoose.model('Sample', SampleSchema);