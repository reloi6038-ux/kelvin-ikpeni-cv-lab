'use strict';

// The browser generates a 64-char hex session token and stores it in
// localStorage. Every request carries it in the X-Session-Token header.
//
// The server NEVER stores the raw token. It stores:
//   ownerHash = HMAC-SHA256(SESSION_PEPPER, token)
//
// This means:
//   - If the Mongo DB is ever exposed, tokens are still unusable (pepper
//     lives only in env).
//   - An attacker who guesses a resume _id still needs the matching token
//     to pass the ownership check.

const crypto = require('crypto');
const env = require('../config/env');

const TOKEN_RE = /^[a-f0-9]{64}$/;

function isValidTokenFormat(token) {
  return typeof token === 'string' && TOKEN_RE.test(token);
}

function hashToken(token) {
  if (!isValidTokenFormat(token)) {
    // Callers must validate first; a defensive throw here prevents accidental
    // hashing of garbage into the DB.
    throw new Error('Invalid session token format');
  }
  return crypto
    .createHmac('sha256', env.SESSION_PEPPER)
    .update(token, 'utf8')
    .digest('hex');
}

// Constant-time equality to prevent timing attacks on hash comparison.
function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

module.exports = { isValidTokenFormat, hashToken, safeEqualHex };