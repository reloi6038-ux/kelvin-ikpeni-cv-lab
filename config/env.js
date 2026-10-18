'use strict';

const path = require('path');
const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

function required(name) {
  const v = process.env[name];
  if (!v || String(v).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  MONGODB_URI: required('MONGODB_URI'),
  SESSION_PEPPER: required('SESSION_PEPPER'),
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '')
    .split(',').map((s) => s.trim()).filter(Boolean),
  isProd: process.env.NODE_ENV === 'production',
};

if (env.SESSION_PEPPER.length < 32) {
  throw new Error('SESSION_PEPPER must be at least 32 characters long.');
}

module.exports = env;