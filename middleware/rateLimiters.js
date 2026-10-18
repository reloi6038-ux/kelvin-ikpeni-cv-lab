'use strict';

const rateLimit = require('express-rate-limit');

// Keys are per-IP by default. On Render, X-Forwarded-For is set by the proxy;
// trust proxy is enabled in server.js.

const jsonHandler = (req, res) => {
  res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
  });
};

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler,
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler,
});

const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler,
});

module.exports = { readLimiter, writeLimiter, exportLimiter };