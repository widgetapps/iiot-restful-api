'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * Order Schema
 */
var OrderSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
    deviceSyncCode: {
        type: String
    },
    serialNumbers: [{
        type: String
    }],
    client: {
        type: Schema.ObjectId,
        ref: 'Client'
    }
});

mongoose.model('Order', OrderSchema);