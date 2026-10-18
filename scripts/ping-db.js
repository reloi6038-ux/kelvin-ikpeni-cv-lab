'use strict';

// Standalone script: load .env, connect to Mongo, print OK, disconnect.
// Run with:  npm run ping-db

const env = require('../config/env');
const db = require('../config/db');

(async () => {
  try {
    await db.connect(3, 1500);
    // eslint-disable-next-line no-console
    console.log(`OK: connected to MongoDB (${env.NODE_ENV})`);
    await db.disconnect();
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('FAIL:', err.message);
    process.exit(1);
  }
})();