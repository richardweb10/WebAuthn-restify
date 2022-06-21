'use strict';
const mongoose = require('mongoose');
const config = require('../config');
console.log("process.env.DB_CONNECTION: ", config.DB_CONNECTION)
const dbConnection = config.DB_CONNECTION;
//mongoose.set('useCreateIndex', true);

mongoose.connect(dbConnection, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});
const db = mongoose.connection;

db.on('error', () => {
	console.log('> error occurred from the database');
});
db.once('open', () => {
	console.log('> successfully opened the database');
});
module.exports = mongoose;
