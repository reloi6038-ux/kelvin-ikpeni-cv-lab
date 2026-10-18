'use strict';

const mongoose = require('mongoose');
const Resume = require('../models/Resume');
const { buildResumeDocx } = require('../services/docxService');

// -----------------------------------------------------------------------------
// POST /api/resumes/:id/export/docx
// Returns a .docx binary (Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document)
//
// POST /api/resumes/:id/export/pdf-meta
// Returns metadata for the client-side PDF export (title, filename, template
// id) so the client can render the same document in a hidden iframe.
// -----------------------------------------------------------------------------

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

function notFound(res) {
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resume not found.' } });
}

function sanitizeFilenamePart(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')     // strip accents
    .replace(/[^a-zA-Z0-9\-_. ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function filenameBase(resume) {
  const name = sanitizeFilenamePart(resume.contact && resume.contact.fullName) || 'Resume';
  const role = sanitizeFilenamePart(resume.contact && resume.contact.title) || '';
  const date = new Date().toISOString().slice(0, 10);
  return [name, role, date].filter(Boolean).join('-');
}

async function getOwnedResume(req, res) {
  if (!isValidObjectId(req.params.id)) { notFound(res); return null; }
  const doc = await Resume.findActiveById(req.params.id, req.ownerHash);
  if (!doc) { notFound(res); return null; }
  return doc;
}

async function exportPdfMeta(req, res, next) {
  try {
    const doc = await getOwnedResume(req, res);
    if (!doc) return;
    res.set('Cache-Control', 'no-store');
    res.json({
      filenameBase: filenameBase(doc),
      resume: doc.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

async function exportDocx(req, res, next) {
  try {
    const doc = await getOwnedResume(req, res);
    if (!doc) return;

    const buffer = await buildResumeDocx(doc.toJSON());
    const base = filenameBase(doc);

    res.set('Cache-Control', 'no-store');
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.set('Content-Disposition', `attachment; filename="${base}.docx"`);
    res.set('Content-Length', String(buffer.length));
    res.status(200).end(buffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { exportPdfMeta, exportDocx, filenameBase };