'use strict';

module.exports = {
	app: {
		title: 'terepac-api',
		description: 'The RESTful API for the Terepac ONE Platform.',
		keywords: 'MongoDB, Express, AngularJS, Node.js'
	},
	port: process.env.PORT || 3101,
	ip: process.env.IP || '127.0.0.1',
    mqtt: process.env.MQTT || 'mqtt://10.240.0.20:1883',
	templateEngine: 'swig',
	sessionSecret: 'MEAN',
	sessionCollection: 'sessions'
};
