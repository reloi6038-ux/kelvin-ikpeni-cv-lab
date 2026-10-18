'use strict';

const express = require('express');
const ctrl = require('../../controllers/resumeController');
const exportCtrl = require('../../controllers/exportController');
const sessionToken = require('../../middleware/sessionToken');
const validate = require('../../middleware/validate');
const { validateCreate, validateUpdate } = require('../../validation/resumeSchema');
const { readLimiter, writeLimiter, exportLimiter } = require('../../middleware/rateLimiters');

const router = express.Router();

router.use(sessionToken);

router.get('/', readLimiter, ctrl.list);
router.post('/', writeLimiter, validate(validateCreate), ctrl.create);

// Bulk delete — requires a stricter rate limiter, and it must come
// BEFORE '/:id' routes so it doesn't get swallowed by them.
router.delete('/', writeLimiter, ctrl.removeAll);

router.get('/:id', readLimiter, ctrl.getOne);
router.patch('/:id', writeLimiter, validate(validateUpdate), ctrl.update);
router.delete('/:id', writeLimiter, ctrl.remove);
router.post('/:id/duplicate', writeLimiter, ctrl.duplicate);

router.post('/:id/export/pdf-meta', exportLimiter, exportCtrl.exportPdfMeta);
router.post('/:id/export/docx', exportLimiter, exportCtrl.exportDocx);

module.exports = router;