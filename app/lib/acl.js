'use strict';

var acl = require('acl');
acl = new acl(new acl.memoryBackend());

/*
acl.allow([
    {
        roles:['guest', 'member'],
        allows:[
            {resources:'blogs', permissions:'get'},
            {resources:['forums', 'news'], permissions:['get', 'put', 'delete']}
        ]
    },
    {
        roles:['gold', 'silver'],
        allows:[
            {resources:'cash', permissions:['sell', 'exchange']},
            {resources:['account', 'deposit'], permissions:['put', 'delete']}
        ]
    }
]);

acl.addRoleParents('admin', 'user');
*/

module.exports = acl;
