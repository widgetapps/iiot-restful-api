'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    jsonQuery = require('json-query'),
    Device = require('@terepac/terepac-models').Device,
    _ = require('lodash');

exports.getOne = function(req, res) {

    let promise = Device.findById(
        req.params.deviceId,
        {
            created: 1,
            updated: 1,
            serialNumber: 1,
            topicId: 1,
            type: 1,
            geolocation: 1,
            description: 1,
            sensors: 1,
            location: 1,
            asset: 1,
            client: 1
        }
    ).populate('sensors').exec();

    promise.then(function(device) {

        let authorized = false;

        switch (req.user.role) {
            case 'user':
                if (req.user.client.toString() === device.client.toString()) {
                    authorized = true;
                }
                break;
            case 'manufacturer':
            case 'admin':
            case 'manager':
                if (req.user.client.toString() === device.client.toString() || _.includes(req.user.resellerClients, device.client)) {
                    authorized = true;
                }
                break;
            case 'super':
                authorized = true;
                break;
        }

        if (!authorized) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
        }

        if (!device) {
            res.status(404).send({
                message: 'No device found.'
            });
            return;
        }

        res.json(device);
    }).catch(function(error) {
        res.status(400).send({
            message: 'Error with the database.'
        });
    });
};

exports.getHydrants = function(req, res) {
    let authorized = false;

    switch (req.user.role) {
        case 'manufacturer':
        case 'super':
            authorized = true;
            break;
    }

    if (!authorized) {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    Device.find({type: 'hydrant'}, {
        'serialNumber': 1,
        'topicId': 1,
        'description': 1,
        'lastTransmission': 1,
        'sensors': 1,
        'client': 1,
        'asset': 1,
        'location': 1
    })
        .populate('sensors', {
            'tagCode': 1,
            'type': 1,
            'typeString': 1,
            'description': 1,
            'unit': 1
        })
        .populate('client', {
            'tagCode': 1,
            'companyName': 1,
            'address': 1,
            'contact': 1
        })
        .populate('asset', {
            'tagCode': 1,
            'name': 1,
            'description': 1
        })
        .populate('location', {
            'tagCode': 1,
            'description': 1,
            'geolocation.coordinates': 1
        })
        .exec(function(err, hydrants) {
            if (err) {
                res.status(500).send({
                    message: 'Database error.',
                    error: err
                });
                return;
            }

            res.json(hydrants);
        });
};

exports.getResetEndpoints = function(req, res) {
    let authorized = false;

    switch (req.user.role) {
        case 'super':
            authorized = true;
            break;
    }

    if (!authorized) {
        res.status(401).send({
            message: 'You are not authorized to access this resource.'
        });
        return;
    }

    Device.find({
        type: 'hydrant',
        asset: {$ne: null}
    }, {
        'serialNumber': 1,
        'asset': 1
    })
        .populate('asset', {
            'tagCode': 1,
            'name': 1,
            'description': 1
        })
        .exec(function(err, hydrants) {
            if (err) {
                res.status(500).send({
                    message: 'Database error.',
                    error: err
                });
                return;
            }

            let endpoints = [];

            _.forEach(hydrants, function (hydrant) {
                endpoints.push('{{endpoint}}/assets/' + hydrant._id + '/settings/resend');
            });

            res.json(endpoints);
        });
};

exports.updateDevice = function(req, res) {
    let clientId = mongoose.Types.ObjectId(req.user.client);
    let deviceId = mongoose.Types.ObjectId(req.params.deviceId);

    Device.update(
        { _id: deviceId, $or: [{client: clientId}, {'acl.client': clientId}] },
        {
            $set: {
                descriptor: req.body.descriptor
            }
        }, function(err, device) {
            if (!device || err) {
                res.status(404).send({
                    message: 'No device found.'
                });
                return;
            }

            res.json({
                message: 'Device saved.'
            });
        }
    );
};

exports.getSensors = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);
    var deviceId = mongoose.Types.ObjectId(req.params.deviceId);

    Device.findOne(
        { _id: deviceId, $or: [{client: clientId}, {'acl.client': clientId}] }, {
            sensors: 1
        })
        .populate('sensors.sensor')
        .exec(function (err, device) {
            if (err) {
                res.status(500).send({
                    message: 'Database error.'
                });
                return;
            }

            var sensors = [];

            _.each(device.sensors, function(sensor){
                var data = {
                    _id: sensor.sensor._id,
                    type: sensor.sensor.type,
                    typeString: sensor.sensor.typeString,
                    tagCode: sensor.sensor.tagCode,
                    description: sensor.sensor.description,
                    unit: sensor.sensor.unit,
                    limits: sensor.limits
                };

                sensors.push(data);
            });

            res.json(sensors);
        });

};

exports.getSensor = function(req, res) {
    var clientId = mongoose.Types.ObjectId(req.user.client);
    var deviceId = mongoose.Types.ObjectId(req.params.deviceId);
    var sensorId = mongoose.Types.ObjectId(req.params.sensorId);

    Device.findOne(
        { _id: deviceId, $or: [{client: clientId}, {'acl.client': clientId}] }, {
            sensors: 1
        })
        .populate('sensors.sensor')
        .exec(function (err, device) {
            if (err) {
                res.status(500).send({
                    message: 'Database error.'
                });
                return;
            }

            var data = jsonQuery('sensors[sensor._id=' + sensorId + ']', {data: device}).value;

            var sensor = {
                _id: data.sensor._id,
                type: data.sensor.type,
                typeString: data.sensor.typeString,
                tagCode: data.sensor.tagCode,
                description: data.sensor.description,
                unit: data.sensor.unit,
                limits: data.limits
            };

            res.json(sensor);
        });
};

exports.onboard = function(req, res) {
    let deviceId = mongoose.Types.ObjectId(req.params.deviceId);
    let clientId = mongoose.Types.ObjectId(req.params.clientId);

    Device.findOne( { _id: deviceId }, function(err, device) {
        let authorized = false;

        switch (req.user.role) {
            case 'admin':
            case 'manager':
                if (req.user.client.toString() === device.client.toString() || _.includes(req.user.resellerClients, device.client)) {
                    authorized = true;
                }
                break;
            case 'super':
            case 'manufacturer':
                authorized = true;
                break;
        }

        if (!authorized) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
        }

        if (!device || err) {
            res.status(404).send({
                message: 'Device not found.'
            });
            return;
        }

        /**
         * If the device is assigned to the factory...
         * DWS Factory ID: 5c55bb32e46c3b302f4d2bd8
         * Dapagee Factory ID: 5fd10f7bd22e5044360b33b6
         **/
        if (device.client.toString() === '5c55bb32e46c3b302f4d2bd8' || device.client.toString() === '5fd10f7bd22e5044360b33b6') {

            if (device.asset && (device.asset !== null || device.asset !=='')) {
                res.status(400).send({
                    message: 'The device is assigned to an asset. Please remove it to onboard to a client.'
                });
                return;
            }

            if (device.location && (device.location !== null || device.location !=='')) {
                res.status(400).send({
                    message: 'The device is assigned to a location. Please remove it to onboard to a client.'
                });
                return;
            }

            device.client = clientId;

            device.save(function (err, updatedDevice) {
                res.json({
                    message: 'The device is now assigned to the client.'
                });
            });

        } else {
            res.status(400).send({
                message: 'The device is already assigned to a client.'
            });
            return;
        }
    });
};

exports.offboard = function(req, res) {
    const deviceId = mongoose.Types.ObjectId(req.params.deviceId);

    Device.findOne( { _id: deviceId }, function(err, device) {
        let authorized = false;

        switch (req.user.role) {
            case 'admin':
            case 'manager':
                if (req.user.client.toString() === device.client.toString() || _.includes(req.user.resellerClients, device.client)) {
                    authorized = true;
                }
                break;
            case 'super':
            case 'manufacturer':
                authorized = true;
                break;
        }

        if (!authorized) {
            res.status(401).send({
                message: 'You are not authorized to access this resource.'
            });
            return;
        }

        if (!device || err) {
            res.status(404).send({
                message: 'Device not found.'
            });
            return;
        }

        if (device.asset && (device.asset !== null || device.asset !== '')) {
            res.status(400).send({
                message: 'The device is assigned to an asset. Please remove it to offboard to the factory.'
            });
            return;
        }

        /**
         * Assign back to the relevant factory...
         * DWS Factory ID: 5c55bb32e46c3b302f4d2bd8
         * Dapagee Factory ID: 5fd10f7bd22e5044360b33b6
         **/
        if (device.type === 'hydrant') {
            device.client = mongoose.Types.ObjectId('5c55bb32e46c3b302f4d2bd8');
        } else {
            device.client = mongoose.Types.ObjectId('5fd10f7bd22e5044360b33b6');
        }

        device.location = null;

        device.save(function (err, updatedDevice) {
            res.json({
                message: 'The ' + device.type + ' is now assigned to the factory.'
            });
        });
    });
};
