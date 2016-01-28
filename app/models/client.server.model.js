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
            type: String
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

mongoose.model('Client', ClientSchema);