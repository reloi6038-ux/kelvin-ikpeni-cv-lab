'use strict';

const { isValidTokenFormat, hashToken } = require('../services/tokenService');

// Reads X-Session-Token from the request. If present and well-formed, attaches
// req.ownerHash. If absent or malformed, responds 401 with a machine-readable
// code. Do NOT log the token or its hash.
module.exports = function sessionToken(req, res, next) {
  const token = req.get('X-Session-Token');

  if (!token) {
    return res.status(401).json({
      error: { code: 'NO_SESSION', message: 'Missing X-Session-Token header.' },
    });
  }
  if (!isValidTokenFormat(token)) {
    return res.status(401).json({
      error: { code: 'BAD_SESSION', message: 'X-Session-Token must be 64 lowercase hex characters.' },
    });
  }

  try {
    req.ownerHash = hashToken(token);
  } catch {
    return res.status(401).json({
      error: { code: 'BAD_SESSION', message: 'Invalid session token.' },
    });
  }
  return next();
};