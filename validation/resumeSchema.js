'use strict';

const validator = require('validator');
const { isValidTemplateId } = require('../services/templateRegistry');
const { SECTION_KEYS } = require('../models/Resume');

// Helpers ---------------------------------------------------------------

const isStr = (v) => typeof v === 'string';
const clamp = (v, max) => (isStr(v) ? v.slice(0, max) : '');

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
const HEX64_RE = /^[a-f0-9]{64}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

function entryIdOrFail(id, errs, field) {
  if (!isStr(id) || !ID_RE.test(id)) errs.push({ field, message: 'invalid or missing id' });
}

// Field validators ------------------------------------------------------

function validateContact(input, errs) {
  const c = input && typeof input === 'object' ? input : {};
  const out = {
    fullName: clamp(c.fullName, 200),
    title: clamp(c.title, 200),
    email: clamp(c.email, 200),
    phone: clamp(c.phone, 40),
    city: clamp(c.city, 200),
    country: clamp(c.country, 200),
    website: clamp(c.website, 200),
    linkedin: clamp(c.linkedin, 200),
    portfolio: clamp(c.portfolio, 200),
    photoUrl: clamp(c.photoUrl, 500000),
  };
  if (out.email && !validator.isEmail(out.email)) errs.push({ field: 'contact.email', message: 'must be a valid email' });
  for (const key of ['website', 'linkedin', 'portfolio']) {
    if (out[key] && !validator.isURL(out[key], { require_protocol: false })) {
      errs.push({ field: `contact.${key}`, message: 'must be a URL' });
    }
  }
  if (out.photoUrl && !/^data:image\/(png|jpe?g|webp);base64,/.test(out.photoUrl) && !validator.isURL(out.photoUrl, { require_protocol: true })) {
    errs.push({ field: 'contact.photoUrl', message: 'must be an image data URL or an https URL' });
  }
  return out;
}

function validateBullets(arr, errs, field) {
  if (!Array.isArray(arr)) return [];
  if (arr.length > 40) { errs.push({ field, message: 'too many bullets (max 40)' }); return []; }
  return arr
    .filter((b) => b && isStr(b.text))
    .map((b) => ({ text: clamp(b.text, 500) }));
}

function validateExperience(arr, errs) {
  if (!Array.isArray(arr)) return [];
  if (arr.length > 40) { errs.push({ field: 'experience', message: 'max 40 entries' }); return []; }
  return arr.map((e, i) => {
    const field = `experience[${i}]`;
    if (!e || typeof e !== 'object') { errs.push({ field, message: 'must be an object' }); return null; }
    entryIdOrFail(e.id, errs, `${field}.id`);
    return {
      id: String(e.id).slice(0, 40),
      employer: clamp(e.employer, 200),
      jobTitle: clamp(e.jobTitle, 200),
      location: clamp(e.location, 200),
      startDate: clamp(e.startDate, 20),
      endDate: clamp(e.endDate, 20),
      isCurrent: !!e.isCurrent,
      bullets: validateBullets(e.bullets, errs, `${field}.bullets`),
    };
  }).filter(Boolean);
}

function validateEducation(arr, errs) {
  if (!Array.isArray(arr)) return [];
  if (arr.length > 40) { errs.push({ field: 'education', message: 'max 40 entries' }); return []; }
  return arr.map((e, i) => {
    const field = `education[${i}]`;
    if (!e || typeof e !== 'object') { errs.push({ field, message: 'must be an object' }); return null; }
    entryIdOrFail(e.id, errs, `${field}.id`);
    return {
      id: String(e.id).slice(0, 40),
      institution: clamp(e.institution, 200),
      degree: clamp(e.degree, 200),
      field: clamp(e.field, 200),
      location: clamp(e.location, 200),
      startDate: clamp(e.startDate, 20),
      endDate: clamp(e.endDate, 20),
      isCurrent: !!e.isCurrent,
      description: clamp(e.description, 500),
    };
  }).filter(Boolean);
}

function simpleList(key, fields) {
  return function (arr, errs) {
    if (!Array.isArray(arr)) return [];
    if (arr.length > 40) { errs.push({ field: key, message: 'max 40 entries' }); return []; }
    return arr.map((item, i) => {
      const field = `${key}[${i}]`;
      if (!item || typeof item !== 'object') { errs.push({ field, message: 'must be an object' }); return null; }
      entryIdOrFail(item.id, errs, `${field}.id`);
      const out = { id: String(item.id).slice(0, 40) };
      for (const [k, max] of Object.entries(fields)) {
        out[k] = clamp(item[k], max);
      }
      return out;
    }).filter(Boolean);
  };
}

const validateSkills = simpleList('skills', { name: 200, level: 40 });
const validateProjects = simpleList('projects', { name: 200, description: 500, link: 200, startDate: 20, endDate: 20 });
const validateCertifications = simpleList('certifications', { name: 200, issuer: 200, date: 20, link: 200 });
const validateLanguages = simpleList('languages', { name: 200, proficiency: 40 });
const validateAwards = simpleList('awards', { title: 200, issuer: 200, date: 20, description: 500 });
const validateVolunteer = simpleList('volunteer', { organization: 200, role: 200, startDate: 20, endDate: 20, description: 500 });
const validatePublications = simpleList('publications', { title: 200, venue: 200, date: 20, link: 200 });
const validateMemberships = simpleList('memberships', { organization: 200, role: 200, since: 20 });
const validateReferences = simpleList('references', { name: 200, relationship: 200, contact: 500 });

function validateCustomSections(arr, errs) {
  if (!Array.isArray(arr)) return [];
  if (arr.length > 10) { errs.push({ field: 'customSections', message: 'max 10 sections' }); return []; }
  return arr.map((s, i) => {
    const field = `customSections[${i}]`;
    if (!s || typeof s !== 'object') { errs.push({ field, message: 'must be an object' }); return null; }
    entryIdOrFail(s.id, errs, `${field}.id`);
    return { id: String(s.id).slice(0, 40), title: clamp(s.title, 200), content: clamp(s.content, 5000) };
  }).filter(Boolean);
}

function validateTheme(t, errs) {
  const src = t && typeof t === 'object' ? t : {};
  const out = {
    primaryColor: isStr(src.primaryColor) && HEX_COLOR_RE.test(src.primaryColor) ? src.primaryColor : '#111827',
    accentColor: isStr(src.accentColor) && HEX_COLOR_RE.test(src.accentColor) ? src.accentColor : '#2563eb',
    fontFamily: clamp(src.fontFamily, 60) || 'Inter',
    fontSize: Number.isFinite(src.fontSize) ? Math.min(16, Math.max(9, src.fontSize)) : 11,
    spacing: Number.isFinite(src.spacing) ? Math.min(1.6, Math.max(0.8, src.spacing)) : 1.0,
  };
  return out;
}

function validateSectionOrder(order, errs) {
  if (!Array.isArray(order)) return [...SECTION_KEYS];
  const seen = new Set();
  const out = [];
  for (const k of order) {
    if (!SECTION_KEYS.includes(k)) { errs.push({ field: 'sectionOrder', message: `unknown section "${k}"` }); continue; }
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  // Append any missing sections so the list is complete and deterministic.
  for (const k of SECTION_KEYS) if (!seen.has(k)) out.push(k);
  return out;
}

function validateVisibility(v) {
  const src = v && typeof v === 'object' ? v : {};
  const out = {};
  for (const k of SECTION_KEYS) out[k] = src[k] !== false;
  return out;
}

// Public API -----------------------------------------------------------

// Create: all fields optional except templateId (must be known).
function validateCreate(body) {
  const errs = [];
  const b = body && typeof body === 'object' ? body : {};

  const out = {
    title: clamp(b.title, 200) || 'Untitled Resume',
    templateId: isStr(b.templateId) ? b.templateId : 'modern-professional',
    contact: validateContact(b.contact, errs),
    summary: clamp(b.summary, 5000),
    experience: validateExperience(b.experience, errs),
    education: validateEducation(b.education, errs),
    skills: validateSkills(b.skills, errs),
    projects: validateProjects(b.projects, errs),
    certifications: validateCertifications(b.certifications, errs),
    languages: validateLanguages(b.languages, errs),
    awards: validateAwards(b.awards, errs),
    volunteer: validateVolunteer(b.volunteer, errs),
    publications: validatePublications(b.publications, errs),
    memberships: validateMemberships(b.memberships, errs),
    references: validateReferences(b.references, errs),
    customSections: validateCustomSections(b.customSections, errs),
    theme: validateTheme(b.theme, errs),
    sectionOrder: validateSectionOrder(b.sectionOrder, errs),
    sectionVisibility: validateVisibility(b.sectionVisibility),
  };

  if (!isValidTemplateId(out.templateId)) {
    errs.push({ field: 'templateId', message: 'unknown templateId' });
  }

  return errs.length ? { ok: false, errors: errs } : { ok: true, value: out };
}

// Update: same shape but all fields optional. We merge onto the existing doc
// in the controller, so here we only validate the keys that were provided.
function validateUpdate(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, errors: [{ field: '_root', message: 'body must be an object' }] };
  }
  const errs = [];
  const out = {};

  if ('title' in body) out.title = clamp(body.title, 200) || 'Untitled Resume';
  if ('templateId' in body) {
    if (!isStr(body.templateId) || !isValidTemplateId(body.templateId)) {
      errs.push({ field: 'templateId', message: 'unknown templateId' });
    } else {
      out.templateId = body.templateId;
    }
  }
  if ('contact' in body) out.contact = validateContact(body.contact, errs);
  if ('summary' in body) out.summary = clamp(body.summary, 5000);

  if ('experience' in body) out.experience = validateExperience(body.experience, errs);
  if ('education' in body) out.education = validateEducation(body.education, errs);
  if ('skills' in body) out.skills = validateSkills(body.skills, errs);
  if ('projects' in body) out.projects = validateProjects(body.projects, errs);
  if ('certifications' in body) out.certifications = validateCertifications(body.certifications, errs);
  if ('languages' in body) out.languages = validateLanguages(body.languages, errs);
  if ('awards' in body) out.awards = validateAwards(body.awards, errs);
  if ('volunteer' in body) out.volunteer = validateVolunteer(body.volunteer, errs);
  if ('publications' in body) out.publications = validatePublications(body.publications, errs);
  if ('memberships' in body) out.memberships = validateMemberships(body.memberships, errs);
  if ('references' in body) out.references = validateReferences(body.references, errs);
  if ('customSections' in body) out.customSections = validateCustomSections(body.customSections, errs);
  if ('theme' in body) out.theme = validateTheme(body.theme, errs);
  if ('sectionOrder' in body) out.sectionOrder = validateSectionOrder(body.sectionOrder, errs);
  if ('sectionVisibility' in body) out.sectionVisibility = validateVisibility(body.sectionVisibility);

  if (!Object.keys(out).length && !errs.length) {
    errs.push({ field: '_root', message: 'no updatable fields supplied' });
  }
  return errs.length ? { ok: false, errors: errs } : { ok: true, value: out };
}

module.exports = { validateCreate, validateUpdate, HEX64_RE };