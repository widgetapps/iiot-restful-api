'use strict';

/**
 * Controller dependencies.
 */
var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Client = mongoose.model('Client'),
    Device = mongoose.model('Device'),
    _ = require('lodash');

exports.index = function(req, res) {
	res.json({message: 'Hi there, I\'m a Terepac ONE server. Isn\'t that weird?'});
};

exports.addUser = function(req, res) {
    var user = new User({
        firstName: 'Darryl',
        lastName: 'Patterson',
        email: 'darryl.patterson@terepac.com',
        password: 'ijoinedterepacin2014',
        phone: '4167866116',
        provider: 'local',
        roles: ['user','admin','manager'],
        active: true,
        client: ObjectId('56abdebcf331efa3b7f0b956')
    });

    user.save(function(err, userData){
        if (err) {
            res.json({message: 'Error adding user', err: err});
            return;
        }

        res.json({message: 'Data Added', userData: userData});
    });
};

exports.addData = function(req, res) {

    var client = new Client({
        apikey: {
            id: '123456789',
            secret: 'A1A2A3A4A5A6A7A8A9A0'
        },
        companyName: 'WidgetApps',
        address: {
            street1: '2 Vankirk Rd',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M1P1M7',
            country: 'CA'
        },
        contact: {
            firstName: 'Nicole',
            lastName: 'Bouchard',
            email: 'nic.patterson@gmail.com',
            phone: '6477866465'
        },
        reseller: false
    });

    client.save(function(err, clientData) {
        if (err) {
            res.json({message: 'Error adding client', err: err});
            return;
        }

        var user = new User({
            firstName: 'Darryl',
            lastName: 'Patterson',
            email: 'widgetapps@gmail.com',
            password: '1234567890',
            phone: '4167866116',
            provider: 'local',
            roles: ['user','admin','manager'],
            active: true,
            client: clientData._id
        });

        user.save(function(err, userData){
            if (err) {
                res.json({message: 'Error adding user', err: err});
                return;
            }

            res.json({message: 'Data Added', clientData: clientData, userData: userData});
        });
    });
}