const mongoose = require('../db');

const User = mongoose.model(
	'User',
	new mongoose.Schema({
		id: {
			type: String,
		},
		name: {
			type: String,
			unique: false
		},
		email: {
			type: String,
		},
		devices: {
			type: Array,
		},
		registered: {
			type: Boolean,
			default: false,
		},
	})
);

module.exports = User;
