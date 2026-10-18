'use strict';

const path = require('path');

module.exports = function notFound(req, res) {
  if (req.path.startsWith('/api') || req.accepts(['html', 'json']) === 'json') {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` },
    });
  }
  res.status(404).set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '..', 'public', 'pages', '404.html'), (err) => {
    if (err) res.type('text/plain').send('Not found');
  });
};