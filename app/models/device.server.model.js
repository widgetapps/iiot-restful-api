'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * Device Schema
 */
var DeviceSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
    descriptor: {
        type: Storage
    },
    client: {
        type: Schema.ObjectId,
        ref: 'Client'
    }
});

mongoose.model('Device', DeviceSchema);