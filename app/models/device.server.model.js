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
        index: true,
        required: true
    },
    updated: {
        type: Date
    },
    serialNumber: {
        type: String,
        unique: true,
        index: true,
        required: true
    },
    type: {
        type: String,
        enum: ['hydrant','machine'],
        required: true
    },
    sensors: [{
        type: String,
        enum: ['temp', 'pres', 'aclx', 'acly', 'aclz', 'shck', 'humi', 'lght'],
        required: true
    }],
    code: {
        type: String
    },
    descriptor: {
        type: String
    },
    testmode: {
        type: Boolean
    },
    debug: {
        active: {
            type: Boolean
        },
        host: {
            type: String
        },
        port: {
            type: Number
        }
    },
    settings: {
        normalrate: {
            type: Number
        },
        highlimit: {
            type: Number
        },
        lowlimit: {
            type: Number
        },
        deadband: {
            type: Number
        },
        bufferallduration: {
            type: Number
        },
        preroll: {
            type: Number
        },
        postroll: {
            type: Number
        },
        starttime: {
            type: Date
        },
        stoptime: {
            type: Date
        }
    },
    acl: [{
        client: {
            type: Schema.ObjectId,
            ref: 'Client'
        },
        scope: {
            type: String,
            enum: ['system','user'],
            default: 'system'
        },
        permission: {
            type: String,
            enum: ['r','w']
        }
    }],
    client: {
        type: Schema.ObjectId,
        ref: 'Client',
        index: true
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