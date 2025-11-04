const dotenv = require('dotenv');
dotenv.config();

const config = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/tienda',
  JWT_SECRET: process.env.JWT_SECRET || 'secret_key_default',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

module.exports = config;


