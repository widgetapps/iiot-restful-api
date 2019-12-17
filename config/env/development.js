'use strict';

module.exports = {
	db: 'mongodb://localhost/one-platform-dev',
	authdb: {
		host: '10.240.0.25',
		user: 'yourusername',
		password: 'yourpassword',
		database: 'mqtt_auth'
	},
	app: {
		title: 'terepac-api - Development Environment'
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
