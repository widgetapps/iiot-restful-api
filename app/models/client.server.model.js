'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * Client Schema
 */
var ClientSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
    apikey: {
        id: {
            type: String,
            index: true
        },
        secret: {
            type: String
        }
    },
    companyName: {
        type: String
    },
    address: {
        street: {
            type: String
        },
        street2: {
            type: String
        },
        city: {
            type: String
        },
        province: {
            type: String
        },
        postalCode: {
            type: String
        },
        country: {
            type: String
        }
    },
    contact: {
        firstName: {
            type: String
        },
        lastName: {
            type: String
        },
        email: {
            type: String
        },
        phone: {
            type: String
        }
    },
    reseller: {
        type: Boolean
    },
    resellerParent: {
        type: Schema.ObjectId,
        ref: 'Client'
    },
    resellerClients: [{
        type: Schema.ObjectId,
        ref: 'Client'
    }],
    users: [{
        type: Schema.ObjectId,
        ref: 'User'
    }]
});

ClientSchema.pre('save', function(next) {
    // get the current date
    var currentDate = new Date();

    // change the updated field to current date
    this.updated = currentDate;

    // if created doesn't exist, add to that field
    if (!this.created)
        this.created = currentDate;

    next();
});

mongoose.model('Client', ClientSchema);