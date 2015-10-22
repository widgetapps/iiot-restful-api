'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * Device Schema
 */


    // Interval that the device reports to the cloud
// Need a device type: hydrant | hub (might be hub types)
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