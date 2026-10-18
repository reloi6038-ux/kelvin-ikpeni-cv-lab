'use strict';

// Tiny validator driver. Each schema is a function that returns:
//   { ok: true, value }   — sanitized value
//   { ok: false, errors } — array of { field, message }
// We deliberately hand-roll this to avoid a heavy dependency for a small schema.

module.exports = function validate(schemaFn) {
  return (req, res, next) => {
    const result = schemaFn(req.body);
    if (!result.ok) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'One or more fields failed validation.',
          details: result.errors,
        },
      });
    }
    req.body = result.value;
    return next();
  };
};