'use strict';

var Device = require('@terepac/terepac-models').Device,
    crypto = require('crypto'),
    util = require('../lib/util'),
    Mqtt = require('@terepac/terepac-models').Mqtt,
    mysql = require('mysql');

exports.index = function(req, res) {
	res.json({message: 'Hi there, I\'m a Terepac ONE server. Isn\'t that weird?'});
};

exports.migrateMqttLogins = function( req, res) {
    let promise = Mqtt.find({}).exec();

    promise.then(function(logins) {
        let sql = 'INSERT INTO mqtt_user (username, password, is_superuser) VALUES\n';
        logins.forEach(function(login) {
            let superu = 0;
            if (login.is_superuser) {
                superu = 1;
            }
            sql += '("' + login.username + '", "' + login.password + '", ' + superu + '),\n';
        });
        res.send(sql);
    }).catch(function(e) {
        res.json({
            message: 'ERROR: ' + e.toString()
        });
    });
};

exports.dbCheck = function(req, res) {

    var promise = Device.find({}).exec();

    promise.then(function(devices) {
        res.json({
            message: 'DB is A-OK.'
        });
    }).catch(function(e) {
        res.json({
            message: 'DB is NOT doing ok.'
        });
    });

};

exports.getHashes = function(req, res) {
    var serialNumber = Buffer.from(req.params.serialNumber);

    var login = crypto.createHash('md5').update(serialNumber).digest('hex');
    var password = util.createHash(Buffer.from(login));

    res.json({
        serialNumber: serialNumber,
        login: login,
        password: password
    });
};
