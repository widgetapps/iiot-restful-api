'use strict';

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
    crypto = require('crypto'),
    mysql = require('mysql'),
    config = require('../../config/config'),
    Device = require('@terepac/terepac-models').Device;

exports.insert = function(req, res) {

    if (req.user.role !== 'manufacturer' && req.user.role !== 'super') {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    if (req.params.type !== 'hydrant2' && req.params.type !== 'hydrant4' && req.params.type !== 'sv1') {
        res.status(404).send({
            message: 'Device type not found.'
        });
        return;
    }

    let device = {};

    if (req.params.type === 'sv1') {
        device = {
            serialNumber: req.body['serial-number'],
            topicId: crypto.createHash('md5').update(req.body['serial-number']).digest('hex'),
            type: 'machine',
            client: mongoose.Types.ObjectId(req.body['client-id'])
        };

        device.sensors = [
            mongoose.Types.ObjectId('587c39716e0a2b66d72d5230'), //
            mongoose.Types.ObjectId('587c39716e0a2b66d72d522a'), // Temperature
            mongoose.Types.ObjectId('592e3ad09d0d902900a31e27') //
        ];
    } else {
        device = {
            serialNumber: req.body['serial-number'],
            topicId: req.body['topic-id'],
            type: 'hydrant',
            client: mongoose.Types.ObjectId('5c55bb32e46c3b302f4d2bd8') // This is the factory ID
        };

        device.sensors = [
            mongoose.Types.ObjectId('587c39716e0a2b66d72d5229'), // Pressure
            mongoose.Types.ObjectId('587c39716e0a2b66d72d522a'), // Temperature
            mongoose.Types.ObjectId('587c39716e0a2b66d72d522c'), // Battery
            mongoose.Types.ObjectId('5bad4408e10b1abeaae3192f')  // RSSI
        ];

        if (req.params.type === 'hydrant4') {
            device.sensors.push(mongoose.Types.ObjectId('5be5a5a5f7ec2e5095d8d868')); // Raw Hydrophone Data
            device.sensors.push(mongoose.Types.ObjectId('5c4dd19c182a9136a27b6fa0')); // Hydrophone Summary RMS Data
        }
    }

    let newDevice = new Device(device);

    newDevice.save(function (err, d) {
        if (err) {
            res.status(400).send({
                message: 'Error inserting the device: ' + err
            });
        } else {
            let mydb = mysql.createConnection(config.authdb);

            mydb.connect(function(err) {
                if (err) throw err;

                let sql = 'INSERT INTO mqtt_user (username, password) VALUES (?, ?)';
                let values = [
                    req.body['mqtt-username'],
                    crypto.createHash('sha256').update(req.body['mqtt-password']).digest('hex')
                ];

                mydb.query(sql, values, function (err, result) {
                    if (err) {
                        res.status(400).send({
                            message: 'The device was added but there was an error saving the device MQTT credentials: ' + err,
                            _id: d._id
                        });
                    }

                    res.status(200).send({
                        _id: d._id
                    });
                });
            });
            /*
            var mqtt = new Mqtt({
                username: req.body['mqtt-username'],
                password: crypto.createHash('sha256').update(req.body['mqtt-password']).digest('hex'),
                is_superuser: false,
                publish: [
                    '+/v1/pressure',
                    '+/v1/temperature',
                    '+/v1/battery',
                    '+/v1/reset',
                    '+/v1/location',
                    '+/v1/pressure-event',
                    '+/v1/rssi',
                    '+/v1/hydrophone',
                    '+/v1/hydrophone-summary'
                ],
                subscribe: ['+/v1/configuration']
            });

            mqtt.save(function (err, mu) {
                if (err) {
                    res.status(400).send({
                        message: 'The device was added but there was an error saving the device MQTT credentials: ' + err,
                        _id: d._id
                    });
                }

                res.status(200).send({
                    _id: d._id
                });
            });
             */
        }
    });
};

exports.changePassword = function(req, res) {

    if (req.user.role !== 'manufacturer' && req.user.role !== 'super') {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    let mydb = mysql.createConnection(config.authdb);

    mydb.connect(function(err) {
        if (err) throw err;

        let sql = 'UPDATE mqtt_user SET password = ? WHERE username = ?';
        let values = [
            crypto.createHash('sha256').update(req.body['mqtt-password']).digest('hex'),
            req.params.username
        ];

        mydb.query(sql, values, function (err, result) {
            if (err) {
                res.status(400).send({
                    message: 'Error updating password: ' + err
                });
            }
            res.json({
                message: 'The MQTT password has been changed.'
            });
        });
    });
};

exports.remove = function(req, res) {

    if (req.user.role !== 'manufacturer' && req.user.role !== 'super') {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    Device.findOne( { serialNumber: req.params.serialNumber } )
        .exec(function (err, device) {
            if (err) {
                res.status(500).send({
                    message: 'Database error.'
                });
                return;
            }

            if (!device) {
                res.status(404).send({
                    message: 'Device not found.'
                });
                return;
            }

            var assetId = device.asset;

            if (device.client.toString() === '5c55bb32e46c3b302f4d2bd8' && (!assetId || device.asset === null)) {
                device.remove(function (err, deletedDevice) {
                    if (err) {
                        res.status(500).send({
                            message: 'Database error.'
                        });
                        return;
                    }

                    let mydb = mysql.createConnection(config.authdb);

                    mydb.connect(function(err) {
                        if (err) throw err;

                        let sql = 'DELETE FROM mqtt_user WHERE username = ?';
                        let values = [
                            req.params.serialNumber
                        ];

                        mydb.query(sql, values, function (err, result) {
                            if (err) {
                                res.status(400).send({
                                    message: 'Error updating password: ' + err
                                });
                            }
                            res.json({
                                message: 'The device has been deleted.'
                            });
                        });
                    });
                });
            } else {
                res.status(400).send({
                    message: 'Cannot delete the device, it is assigned to a client and/or an asset.'
                });

            }
        });
};
