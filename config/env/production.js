'use strict';

module.exports = {
	db: process.env.MONGO_STRING || process.env.MONGOHQ_URL || process.env.MONGOLAB_URI || 'mongodb://10.240.162.13,10.240.253.155/one-platform?replicaSet=rs0',
	authdb: {
		host: process.env.AUTHDB_HOST || '',
		user: process.env.AUTHDB_USER || '',
		password: process.env.AUTHDB_PASS || '',
		database: process.env.AUTHDB_NAME || ''
	},
    mqttoptions: {
        clientId: 'worker_hydrant',
        username: 'worker',
        password: process.env.MQTT_PASSWORD || ''
    },
	mailer: {
		from: process.env.MAILER_FROM || 'MAILER_FROM',
		options: {
			service: process.env.MAILER_SERVICE_PROVIDER || 'MAILER_SERVICE_PROVIDER',
			auth: {
				user: process.env.MAILER_EMAIL_ID || 'MAILER_EMAIL_ID',
				pass: process.env.MAILER_PASSWORD || 'MAILER_PASSWORD'
			}
		}
	}
};
