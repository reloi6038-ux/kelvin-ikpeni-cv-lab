'use strict';

// Central metadata for every template. Phase 4 will render each one; Phase 5
// uses these entries to populate the template selector in the editor. The CSS
// for each template lives in public/templates/<id>.css (added in Phase 5).

const TEMPLATES = [
  {
    id: 'modern-professional',
    name: 'Modern Professional',
    category: 'Modern',
    description: 'Clean two-column layout with a subtle accent bar. A strong default for most industries.',
    style: 'modern',
    atsCompatible: true,
    premium: false,
    supportedSections: ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages'],
  },
  {
    id: 'minimalist-ivory',
    name: 'Minimalist Ivory',
    category: 'Minimalist',
    description: 'Whitespace-heavy, single-column layout with elegant typography and no color blocks.',
    style: 'minimal',
    atsCompatible: true,
    premium: false,
    supportedSections: ['summary', 'experience', 'education', 'skills', 'projects', 'awards', 'languages'],
  },
  {
    id: 'executive-charcoal',
    name: 'Executive Charcoal',
    category: 'Executive',
    description: 'Authoritative serif headline with a leadership-first structure. Suited to senior roles.',
    style: 'executive',
    atsCompatible: true,
    premium: true,
    supportedSections: ['summary', 'experience', 'education', 'skills', 'awards', 'memberships'],
  },
  {
    id: 'corporate-navy',
    name: 'Corporate Navy',
    category: 'Corporate',
    description: 'Conservative navy header with a strict grid. Ideal for finance, law, and consulting.',
    style: 'corporate',
    atsCompatible: true,
    premium: false,
    supportedSections: ['summary', 'experience', 'education', 'skills', 'certifications', 'languages'],
  },
  {
    id: 'creative-terracotta',
    name: 'Creative Terracotta',
    category: 'Creative',
    description: 'Warm palette with a left rail for contact and skills. Expressive but professional.',
    style: 'creative',
    atsCompatible: false,
    premium: true,
    supportedSections: ['summary', 'experience', 'education', 'skills', 'projects', 'awards', 'volunteer'],
  },
  {
    id: 'graduate-fresh',
    name: 'Graduate Fresh',
    category: 'Graduate',
    description: 'Education-forward layout for early-career candidates. Room for coursework and projects.',
    style: 'graduate',
    atsCompatible: true,
    premium: false,
    supportedSections: ['summary', 'education', 'projects', 'experience', 'skills', 'certifications', 'languages'],
  },
  {
    id: 'academic-classic',
    name: 'Academic Classic',
    category: 'Academic',
    description: 'Traditional CV with publications, grants, and teaching sections emphasized.',
    style: 'academic',
    atsCompatible: true,
    premium: true,
    supportedSections: ['summary', 'education', 'publications', 'experience', 'awards', 'memberships', 'references'],
  },
  {
    id: 'technical-mono',
    name: 'Technical Mono',
    category: 'Technical',
    description: 'Monospaced accents and a skills matrix designed for software engineers and DevOps.',
    style: 'technical',
    atsCompatible: true,
    premium: true,
    supportedSections: ['summary', 'experience', 'skills', 'projects', 'certifications', 'education'],
  },
  {
    id: 'business-bold',
    name: 'Business Bold',
    category: 'Business',
    description: 'Bold headline and KPI-style achievement emphasis. Effective for sales and business roles.',
    style: 'business',
    atsCompatible: true,
    premium: false,
    supportedSections: ['summary', 'experience', 'education', 'skills', 'certifications'],
  },
  {
    id: 'ats-plain',
    name: 'ATS Plain',
    category: 'ATS',
    description: 'Single-column, no graphics, no colors. Maximum parse compatibility for ATS systems.',
    style: 'ats',
    atsCompatible: true,
    premium: false,
    supportedSections: ['summary', 'experience', 'education', 'skills', 'certifications', 'projects'],
  },
  {
    id: 'traditional-serif',
    name: 'Traditional Serif',
    category: 'Traditional',
    description: 'Classic serif layout with justified body text. Familiar and credible for older industries.',
    style: 'traditional',
    atsCompatible: true,
    premium: false,
    supportedSections: ['summary', 'experience', 'education', 'skills', 'references'],
  },
  {
    id: 'international-adaptable',
    name: 'International Adaptable',
    category: 'International',
    description: 'Region-neutral dates, flexible section order, and no country-specific conventions.',
    style: 'international',
    atsCompatible: true,
    premium: true,
    supportedSections: ['summary', 'experience', 'education', 'skills', 'languages', 'certifications', 'projects'],
  },
];

const byId = new Map(TEMPLATES.map((t) => [t.id, t]));

function list() {
  return TEMPLATES.map((t) => ({ ...t }));
}
function get(id) {
  const t = byId.get(id);
  return t ? { ...t } : null;
}
function isValidTemplateId(id) {
  return byId.has(id);
}

module.exports = { list, get, isValidTemplateId, TEMPLATES };