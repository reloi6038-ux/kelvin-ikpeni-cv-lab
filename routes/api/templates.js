'use strict';

const express = require('express');
const ctrl = require('../../controllers/templateController');
const { readLimiter } = require('../../middleware/rateLimiters');

const router = express.Router();

router.get('/', readLimiter, ctrl.listTemplates);
router.get('/:id', readLimiter, ctrl.getTemplate);

module.exports = router;