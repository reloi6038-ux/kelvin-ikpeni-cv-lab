'use strict';

const express = require('express');
const ctrl = require('../../controllers/resumeController');
const sessionToken = require('../../middleware/sessionToken');
const validate = require('../../middleware/validate');
const { validateCreate, validateUpdate } = require('../../validation/resumeSchema');
const { readLimiter, writeLimiter } = require('../../middleware/rateLimiters');

const router = express.Router();

// Every /api/resumes endpoint requires a valid X-Session-Token.
router.use(sessionToken);

router.get('/', readLimiter, ctrl.list);
router.post('/', writeLimiter, validate(validateCreate), ctrl.create);
router.get('/:id', readLimiter, ctrl.getOne);
router.patch('/:id', writeLimiter, validate(validateUpdate), ctrl.update);
router.delete('/:id', writeLimiter, ctrl.remove);
router.post('/:id/duplicate', writeLimiter, ctrl.duplicate);

module.exports = router;