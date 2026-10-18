'use strict';

const path = require('path');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, _next) {
  // Map known error types to statuses.
  let status = err.status || err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error.';

  if (err.name === 'ValidationError') { status = 400; code = 'VALIDATION_ERROR'; }
  else if (err.name === 'CastError') { status = 400; code = 'BAD_ID'; }
  else if (err.type === 'entity.too.large') { status = 413; code = 'PAYLOAD_TOO_LARGE'; }
  else if (err.type === 'entity.parse.failed') { status = 400; code = 'BAD_JSON'; }

  if (!env.isProd && status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }
  if (env.isProd && status >= 500) {
    message = 'Internal server error.';
  }

  if (req.path.startsWith('/api') || req.accepts(['html', 'json']) === 'json') {
    return res.status(status).json({ error: { code, message } });
  }
  res.status(status).set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '..', 'public', 'pages', '500.html'), (sendErr) => {
    if (sendErr) res.type('text/plain').send('Server error');
  });
};