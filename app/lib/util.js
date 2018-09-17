'use strict';

var crypto = require('crypto');

exports.createHash = function (buffer) {
    var key = 'DIbwxjIzrF6Ucr0itJma';
    if (process.env.SECRET_KEY) {
        key = process.env.SECRET_KEY;
    }

    const keyBuffer = Buffer.from(key);
    const hashBuffer = Buffer.from(crypto.createHash('md5').update(buffer).digest('hex'));
    const totalLength = keyBuffer.length + hashBuffer.length;
    const keyedHash = Buffer.concat([keyBuffer, hashBuffer], totalLength);

    return crypto.createHash('md5').update(keyedHash).digest('hex');
};
