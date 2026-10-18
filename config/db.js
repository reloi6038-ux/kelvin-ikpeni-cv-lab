'use strict';

// Manages the Mongoose connection lifecycle:
//   - connect() with sane options
//   - a small retry loop (Atlas occasionally fails TLS handshake during cold start)
//   - log connection events without leaking the URI
//   - graceful disconnect on shutdown

const mongoose = require('mongoose');
const env = require('./env');

// Important for security and simplicity: fail fast on unknown query fields.
mongoose.set('strictQuery', true);
// Don't buffer commands indefinitely if we lose the connection.
mongoose.set('bufferCommands', false);

let isConnected = false;

async function connect(retries = 5, delayMs = 2000) {
  if (isConnected) return mongoose.connection;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 0,
        autoIndex: !env.isProd, // build indexes automatically in dev; in prod use syncIndexes()
      });
      isConnected = true;
      // eslint-disable-next-line no-console
      console.log('[db] connected');
      return mongoose.connection;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[db] connect attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function disconnect() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  // eslint-disable-next-line no-console
  console.log('[db] disconnected');
}

mongoose.connection.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[db] connection error:', err.message);
});
mongoose.connection.on('disconnected', () => {
  isConnected = false;
  // eslint-disable-next-line no-console
  console.warn('[db] disconnected');
});

function isHealthy() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connect, disconnect, isHealthy, mongoose };