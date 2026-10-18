'use strict';

const mongoose = require('mongoose');

// -----------------------------------------------------------------------------
// Strings: every text field has a hard upper bound. This is the last line of
// defense against abuse and keeps documents small (Mongo has a 16MB doc limit,
// but we want resumes to stay well under 200KB).
// -----------------------------------------------------------------------------

const MAX_SHORT = 200;
const MAX_MEDIUM = 500;
const MAX_LONG = 5000;
const MAX_BULLETS = 40;
const MAX_ENTRIES = 40;
const MAX_CUSTOM_SECTIONS = 10;

const bulletSchema = new mongoose.Schema(
  { text: { type: String, maxlength: MAX_MEDIUM, default: '' } },
  { _id: false }
);

const contactSchema = new mongoose.Schema(
  {
    fullName: { type: String, maxlength: MAX_SHORT, default: '' },
    title: { type: String, maxlength: MAX_SHORT, default: '' },
    email: { type: String, maxlength: MAX_SHORT, default: '' },
    phone: { type: String, maxlength: 40, default: '' },
    city: { type: String, maxlength: MAX_SHORT, default: '' },
    country: { type: String, maxlength: MAX_SHORT, default: '' },
    website: { type: String, maxlength: MAX_SHORT, default: '' },
    linkedin: { type: String, maxlength: MAX_SHORT, default: '' },
    portfolio: { type: String, maxlength: MAX_SHORT, default: '' },
    // Data URL of the uploaded photo, or a URL. We cap size in validation.
    photoUrl: { type: String, maxlength: 500000, default: '' },
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 40 },
    employer: { type: String, maxlength: MAX_SHORT, default: '' },
    jobTitle: { type: String, maxlength: MAX_SHORT, default: '' },
    location: { type: String, maxlength: MAX_SHORT, default: '' },
    startDate: { type: String, maxlength: 20, default: '' },
    endDate: { type: String, maxlength: 20, default: '' },
    isCurrent: { type: Boolean, default: false },
    bullets: { type: [bulletSchema], default: [] },
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 40 },
    institution: { type: String, maxlength: MAX_SHORT, default: '' },
    degree: { type: String, maxlength: MAX_SHORT, default: '' },
    field: { type: String, maxlength: MAX_SHORT, default: '' },
    location: { type: String, maxlength: MAX_SHORT, default: '' },
    startDate: { type: String, maxlength: 20, default: '' },
    endDate: { type: String, maxlength: 20, default: '' },
    isCurrent: { type: Boolean, default: false },
    description: { type: String, maxlength: MAX_MEDIUM, default: '' },
  },
  { _id: false }
);

const skillSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 40 },
    name: { type: String, maxlength: MAX_SHORT, default: '' },
    level: { type: String, maxlength: 40, default: '' }, // e.g. "Advanced"
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 40 },
    name: { type: String, maxlength: MAX_SHORT, default: '' },
    description: { type: String, maxlength: MAX_MEDIUM, default: '' },
    link: { type: String, maxlength: MAX_SHORT, default: '' },
    startDate: { type: String, maxlength: 20, default: '' },
    endDate: { type: String, maxlength: 20, default: '' },
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 40 },
    name: { type: String, maxlength: MAX_SHORT, default: '' },
    issuer: { type: String, maxlength: MAX_SHORT, default: '' },
    date: { type: String, maxlength: 20, default: '' },
    link: { type: String, maxlength: MAX_SHORT, default: '' },
  },
  { _id: false }
);

const languageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 40 },
    name: { type: String, maxlength: MAX_SHORT, default: '' },
    proficiency: { type: String, maxlength: 40, default: '' },
  },
  { _id: false }
);

const awardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 40 },
    title: { type: String, maxlength: MAX_SHORT, default: '' },
    issuer: { type: String, maxlength: MAX_SHORT, default: '' },
    date: { type: String, maxlength: 20, default: '' },
    description: { type: String, maxlength: MAX_MEDIUM, default: '' },
  },
  { _id: false }
);

const volunteerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 40 },
    organization: { type: String, maxlength: MAX_SHORT, default: '' },
    role: { type: String, maxlength: MAX_SHORT, default: '' },
    startDate: { type: String, maxlength: 20, default: '' },
    endDate: { type: String, maxlength: 20, default: '' },
    description: { type: String, maxlength: MAX_MEDIUM, default: '' },
  },
  { _id: false }
);

const publicationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 40 },
    title: { type: String, maxlength: MAX_SHORT, default: '' },
    venue: { type: String, maxlength: MAX_SHORT, default: '' },
    date: { type: String, maxlength: 20, default: '' },
    link: { type: String, maxlength: MAX_SHORT, default: '' },
  },
  { _id: false }
);

const membershipSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 40 },
    organization: { type: String, maxlength: MAX_SHORT, default: '' },
    role: { type: String, maxlength: MAX_SHORT, default: '' },
    since: { type: String, maxlength: 20, default: '' },
  },
  { _id: false }
);

const referenceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 40 },
    name: { type: String, maxlength: MAX_SHORT, default: '' },
    relationship: { type: String, maxlength: MAX_SHORT, default: '' },
    contact: { type: String, maxlength: MAX_MEDIUM, default: '' },
  },
  { _id: false }
);

const customSectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 40 },
    title: { type: String, maxlength: MAX_SHORT, default: '' },
    content: { type: String, maxlength: MAX_LONG, default: '' },
  },
  { _id: false }
);

const themeSchema = new mongoose.Schema(
  {
    primaryColor: { type: String, maxlength: 20, default: '#111827' },
    accentColor: { type: String, maxlength: 20, default: '#2563eb' },
    fontFamily: { type: String, maxlength: 60, default: 'Inter' },
    fontSize: { type: Number, min: 9, max: 16, default: 11 },
    spacing: { type: Number, min: 0.8, max: 1.6, default: 1.0 },
  },
  { _id: false }
);

const SECTION_KEYS = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'awards',
  'volunteer',
  'publications',
  'memberships',
  'references',
  'custom',
];

const visibilitySchema = new mongoose.Schema(
  Object.fromEntries(SECTION_KEYS.map((k) => [k, { type: Boolean, default: true }])),
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    ownerHash: {
      type: String,
      required: true,
      index: true,
      match: [/^[a-f0-9]{64}$/, 'ownerHash must be 64 hex chars'],
    },
    title: { type: String, maxlength: MAX_SHORT, default: 'Untitled Resume' },
    templateId: { type: String, maxlength: 60, default: 'modern-professional' },
    contact: { type: contactSchema, default: () => ({}) },
    summary: { type: String, maxlength: MAX_LONG, default: '' },
    experience: { type: [experienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    skills: { type: [skillSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
    languages: { type: [languageSchema], default: [] },
    awards: { type: [awardSchema], default: [] },
    volunteer: { type: [volunteerSchema], default: [] },
    publications: { type: [publicationSchema], default: [] },
    memberships: { type: [membershipSchema], default: [] },
    references: { type: [referenceSchema], default: [] },
    customSections: { type: [customSectionSchema], default: [], validate: (v) => v.length <= MAX_CUSTOM_SECTIONS },
    theme: { type: themeSchema, default: () => ({}) },
    sectionOrder: {
      type: [{ type: String, enum: SECTION_KEYS }],
      default: () => [...SECTION_KEYS],
    },
    sectionVisibility: { type: visibilitySchema, default: () => ({}) },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
    // Never serialize ownerHash to the client, and drop the soft-delete marker
    // from responses. Also normalize _id to a string.
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.ownerHash;
        delete ret.deletedAt;
        return ret;
      },
    },
  }
);

// Compound index for the "list my resumes" query.
resumeSchema.index({ ownerHash: 1, deletedAt: 1, updatedAt: -1 });

// Sanity: every array field has a hard cap to prevent unbounded growth.
resumeSchema.pre('validate', function enforceArrayCaps(next) {
  const capped = ['experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'awards', 'volunteer', 'publications', 'memberships', 'references'];
  for (const key of capped) {
    if (Array.isArray(this[key]) && this[key].length > MAX_ENTRIES) {
      return next(new Error(`${key} cannot exceed ${MAX_ENTRIES} entries`));
    }
  }
  for (const exp of this.experience || []) {
    if ((exp.bullets || []).length > MAX_BULLETS) {
      return next(new Error(`Each experience entry cannot exceed ${MAX_BULLETS} bullets`));
    }
  }
  return next();
});

// Soft-delete by default.
resumeSchema.statics.findActiveById = function (id, ownerHash) {
  return this.findOne({ _id: id, ownerHash, deletedAt: null });
};

resumeSchema.statics.listActiveByOwner = function (ownerHash) {
  return this.find({ ownerHash, deletedAt: null }).sort({ updatedAt: -1 });
};

module.exports = mongoose.model('Resume', resumeSchema);
module.exports.SECTION_KEYS = SECTION_KEYS;