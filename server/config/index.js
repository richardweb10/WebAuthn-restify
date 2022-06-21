require("dotenv").config({ path: `.env` });

const config = {
    "DB_CONNECTION": process.env.DB_CONNECTION,
    "RP_ID": process.env.RP_ID,
    "PORT": process.env.PORT
  }
  module.exports = config;