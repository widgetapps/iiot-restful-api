'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    errorHandler = require('./errors.server.controller'),
    Measurement = mongoose.model('Measurement'),
    Device = mongoose.model('Device'),
    _ = require('lodash'),
    moment = require('moment');


exports.ciscodata = function(req, res) {
    Device.findOne({ serialNumber: '1' }, function(err, device) {
        console.log(device);
        Measurement.find({
                device: device._id,
                created: {'$gte': moment().subtract(1, 'minute'), '$lte': moment()}
            })
            .sort('created')
            .exec(function (err, measurements) {

                var accel     = [];
                var vibration = [];

                var accelrow = [];
                var accelcurrentcount = 0;

                _.each(measurements, function(measurement, key) {

                    switch(measurements[key].sensor) {
                        case 'shck':
                            vibration.push({c: [
                                {v: moment(measurements[key].created).utcOffset('-04:00').format('mm:ss')},
                                {v: measurements[key].data.values.average * 10} // Multiply by 10 for better viz
                            ]});
                            break;
                        case 'aclx':
                        case 'acly':
                        case 'aclz':
                            if (accelcurrentcount < 4) {
                                if (accelcurrentcount === 0)
                                    accelrow[0] = {v: moment(measurements[key].created).utcOffset('-04:00').format('mm:ss')};
                                if (measurements[key].sensor === 'aclx')
                                    accelrow[1] = {v: measurements[key].data.values.average};
                                if (measurements[key].sensor === 'acly')
                                    accelrow[2] = {v: measurements[key].data.values.average};
                                if (measurements[key].sensor === 'aclz')
                                    accelrow[3] = {v: measurements[key].data.values.average};

                                accelcurrentcount++;
                            }
                            break;
                    }

                    if (accelrow.length === 4) {
                        accel.push({c: accelrow});
                        accelrow = [];
                        accelcurrentcount = 0;
                    }
                });

                res.json({
                    response: 'OK',
                    accel: accel,
                    vibration: vibration
                });
            });
    });
}