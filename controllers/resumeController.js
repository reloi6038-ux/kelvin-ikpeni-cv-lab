'use strict';

const mongoose = require('mongoose');
const Resume = require('../models/Resume');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

function notFound(res) {
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resume not found.' } });
}

async function create(req, res, next) {
  try {
    const doc = await Resume.create({ ...req.body, ownerHash: req.ownerHash });
    return res.status(201).json({ resume: doc });
  } catch (err) { return next(err); }
}

async function list(req, res, next) {
  try {
    const docs = await Resume.listActiveByOwner(req.ownerHash);
    return res.json({ resumes: docs });
  } catch (err) { return next(err); }
}

async function getOne(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) return notFound(res);
    const doc = await Resume.findActiveById(req.params.id, req.ownerHash);
    if (!doc) return notFound(res);
    return res.json({ resume: doc });
  } catch (err) { return next(err); }
}

async function update(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) return notFound(res);
    const doc = await Resume.findActiveById(req.params.id, req.ownerHash);
    if (!doc) return notFound(res);
    Object.assign(doc, req.body);
    await doc.save();
    return res.json({ resume: doc });
  } catch (err) { return next(err); }
}

async function remove(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) return notFound(res);
    const doc = await Resume.findActiveById(req.params.id, req.ownerHash);
    if (!doc) return notFound(res);
    doc.deletedAt = new Date();
    await doc.save();
    return res.status(204).end();
  } catch (err) { return next(err); }
}

async function duplicate(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) return notFound(res);
    const src = await Resume.findActiveById(req.params.id, req.ownerHash);
    if (!src) return notFound(res);

    const plain = src.toObject();
    delete plain._id;
    delete plain.createdAt;
    delete plain.updatedAt;
    plain.title = `${plain.title} (copy)`;
    const copy = await Resume.create({ ...plain, ownerHash: req.ownerHash });
    return res.status(201).json({ resume: copy });
  } catch (err) { return next(err); }
}

// Bulk soft-delete every resume owned by the caller. Returns a count so the
// client can confirm "N resumes deleted".
async function removeAll(req, res, next) {
  try {
    const now = new Date();
    const result = await Resume.updateMany(
      { ownerHash: req.ownerHash, deletedAt: null },
      { $set: { deletedAt: now } }
    );
    return res.json({
      ok: true,
      deletedCount: result.modifiedCount || 0,
      deletedAt: now.toISOString(),
    });
  } catch (err) { return next(err); }
}

module.exports = { create, list, getOne, update, remove, duplicate, removeAll, isValidObjectId };