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
        type: Date
    },
    updated: {
        type: Date
    },
    serialNumber: {
        type: String,
        unique: true
    },
    type: {
        type: String
    },
    code: {
        type: String
    },
    descriptor: {
        type: String
    },
    client: {
        type: Schema.ObjectId,
        ref: 'Client'
    }
});

DeviceSchema.pre('save', function(next) {
    // get the current date
    var currentDate = new Date();

    // change the updated field to current date
    this.updated = currentDate;

    // if created doesn't exist, add to that field
    if (!this.created)
        this.created = currentDate;

    next();
});

module.exports = mongoose.model('Device', DeviceSchema);