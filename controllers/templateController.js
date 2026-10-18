'use strict';

const registry = require('../services/templateRegistry');

function listTemplates(_req, res) {
  res.json({ templates: registry.list() });
}

function getTemplate(req, res) {
  const t = registry.get(req.params.id);
  if (!t) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown template id.' } });
  }
  res.json({ template: t });
}

module.exports = { listTemplates, getTemplate };