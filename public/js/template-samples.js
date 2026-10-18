// ---------------------------------------------------------------------------
// Sample resume data + a shared resume-preview renderer.
//
// - SAMPLE_RESUME: fictional candidate, same for every template so the gallery
//   compares templates on identical content.
// - renderResumePreview(target, resume, templateId): builds a DOM tree with a
//   .doc.doc--<templateId> wrapper. The per-template CSS lives in
//   public/templates/preview.css. Phase 5's editor reuses this same function,
//   so previews and the live editor are guaranteed to match.
//
// All values are HTML-escaped before injection. User-provided resume content
// in Phase 5 will flow through the same escaping path.
// ---------------------------------------------------------------------------

export const SAMPLE_RESUME = {
  title: 'Sample Resume',
  templateId: 'modern-professional',
  contact: {
    fullName: 'Amara Okafor',
    title: 'Senior Product Designer',
    email: 'amara.okafor@example.com',
    phone: '+234 801 555 0100',
    city: 'Lagos',
    country: 'Nigeria',
    website: 'amaraokafor.design',
    linkedin: 'linkedin.com/in/amaraokafor',
    portfolio: 'amaraokafor.design/work',
    photoUrl: '',
  },
  summary:
    'Product designer with 8 years of experience shipping customer-facing products at scale. Led design for two 0→1 platforms and grew the design system used by 40+ engineers.',
  experience: [
    {
      id: 'exp1',
      employer: 'Northwind Labs',
      jobTitle: 'Senior Product Designer',
      location: 'Lagos, NG',
      startDate: '2021',
      endDate: '',
      isCurrent: true,
      bullets: [
        { text: "Led end-to-end design for the company's flagship analytics product, shipping 6 major releases in 18 months." },
        { text: 'Built and maintained a design system now used by 40+ engineers across 3 product teams.' },
        { text: 'Reduced time-to-first-value for new users by 34% through onboarding redesign and usability testing.' },
      ],
    },
    {
      id: 'exp2',
      employer: 'Meridian Studio',
      jobTitle: 'Product Designer',
      location: 'Remote',
      startDate: '2018',
      endDate: '2021',
      isCurrent: false,
      bullets: [
        { text: 'Designed and shipped 12 client products across fintech, health, and logistics.' },
        { text: "Established the studio's accessibility checklist, adopted on every project from 2019 onward." },
      ],
    },
  ],
  education: [
    {
      id: 'edu1',
      institution: 'University of Lagos',
      degree: 'B.Sc.',
      field: 'Computer Science',
      location: 'Lagos, NG',
      startDate: '2012',
      endDate: '2016',
      isCurrent: false,
      description: 'First Class Honours. Graduated top 5% of cohort.',
    },
  ],
  skills: [
    { id: 's1', name: 'Product Design', level: 'Expert' },
    { id: 's2', name: 'Design Systems', level: 'Expert' },
    { id: 's3', name: 'Figma', level: 'Expert' },
    { id: 's4', name: 'Prototyping', level: 'Advanced' },
    { id: 's5', name: 'User Research', level: 'Advanced' },
    { id: 's6', name: 'HTML / CSS', level: 'Working' },
    { id: 's7', name: 'Accessibility (WCAG)', level: 'Advanced' },
  ],
  projects: [
    {
      id: 'p1',
      name: 'Noteworthy',
      description: 'A note-taking app used by 4,000+ designers. Built the MVP and design system.',
      link: 'noteworthy.example.com',
      startDate: '2022',
      endDate: '2023',
    },
  ],
  certifications: [
    { id: 'c1', name: 'Google UX Design Certificate', issuer: 'Google', date: '2020', link: '' },
  ],
  languages: [
    { id: 'l1', name: 'English', proficiency: 'Native' },
    { id: 'l2', name: 'Yoruba', proficiency: 'Fluent' },
    { id: 'l3', name: 'French', proficiency: 'Conversational' },
  ],
  awards: [
    { id: 'a1', title: 'Design Team of the Year', issuer: 'Lagos Design Awards', date: '2023', description: '' },
  ],
  volunteer: [],
  publications: [],
  memberships: [],
  references: [],
  customSections: [],
  theme: {
    primaryColor: '#0f172a',
    accentColor: '#2563eb',
    fontFamily: 'Inter',
    fontSize: 11,
    spacing: 1.0,
  },
  sectionOrder: [
    'summary', 'experience', 'education', 'skills',
    'projects', 'certifications', 'languages', 'awards',
  ],
  sectionVisibility: {
    summary: true, experience: true, education: true, skills: true,
    projects: true, certifications: true, languages: true, awards: true,
    volunteer: false, publications: false, memberships: false,
    references: false, custom: false,
  },
};

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function renderDateRange(start, end, isCurrent) {
  const s = escapeHtml(start || '');
  if (isCurrent) return s ? `${s} – Present` : 'Present';
  const e = escapeHtml(end || '');
  if (s && e) return `${s} – ${e}`;
  return s || e || '';
}

function sectionSummary(resume, visible) {
  if (!visible('summary') || !resume.summary) return '';
  return `<section class="doc-section">
    <h2 class="doc-h2">Summary</h2>
    <p class="doc-p">${escapeHtml(resume.summary)}</p>
  </section>`;
}

function sectionExperience(resume, visible) {
  if (!visible('experience') || !Array.isArray(resume.experience) || !resume.experience.length) return '';
  const items = resume.experience.map((e) => {
    const head = `
      <div class="doc-entry__head">
        <span class="doc-entry__title">${escapeHtml(e.jobTitle || '')}${e.employer ? ' — ' + escapeHtml(e.employer) : ''}</span>
        <span class="doc-entry__meta">${renderDateRange(e.startDate, e.endDate, e.isCurrent)}</span>
      </div>`;
    const sub = e.location ? `<div class="doc-entry__sub">${escapeHtml(e.location)}</div>` : '';
    const bullets = Array.isArray(e.bullets) && e.bullets.length
      ? `<ul class="doc-bullets">${e.bullets
          .filter((b) => b && b.text)
          .map((b) => `<li>${escapeHtml(b.text)}</li>`)
          .join('')}</ul>`
      : '';
    return `<div class="doc-entry">${head}${sub}${bullets}</div>`;
  }).join('');
  return `<section class="doc-section"><h2 class="doc-h2">Experience</h2>${items}</section>`;
}

function sectionEducation(resume, visible) {
  if (!visible('education') || !Array.isArray(resume.education) || !resume.education.length) return '';
  const items = resume.education.map((e) => {
    const titleParts = [e.degree, e.field].filter(Boolean).join(', ');
    const inst = e.institution ? ` — ${escapeHtml(e.institution)}` : '';
    const head = `
      <div class="doc-entry__head">
        <span class="doc-entry__title">${escapeHtml(titleParts)}${inst}</span>
        <span class="doc-entry__meta">${renderDateRange(e.startDate, e.endDate, e.isCurrent)}</span>
      </div>`;
    const desc = e.description ? `<p class="doc-p doc-p--sm">${escapeHtml(e.description)}</p>` : '';
    return `<div class="doc-entry">${head}${desc}</div>`;
  }).join('');
  return `<section class="doc-section"><h2 class="doc-h2">Education</h2>${items}</section>`;
}

function sectionSkills(resume, visible) {
  if (!visible('skills') || !Array.isArray(resume.skills) || !resume.skills.length) return '';
  const items = resume.skills
    .filter((s) => s && s.name)
    .map((s) => `<li><span>${escapeHtml(s.name)}</span>${s.level ? `<span class="doc-skill__level">${escapeHtml(s.level)}</span>` : ''}</li>`)
    .join('');
  return `<section class="doc-section"><h2 class="doc-h2">Skills</h2><ul class="doc-skills">${items}</ul></section>`;
}

function sectionProjects(resume, visible) {
  if (!visible('projects') || !Array.isArray(resume.projects) || !resume.projects.length) return '';
  const items = resume.projects.map((p) => {
    const head = `
      <div class="doc-entry__head">
        <span class="doc-entry__title">${escapeHtml(p.name || '')}</span>
        <span class="doc-entry__meta">${renderDateRange(p.startDate, p.endDate, false)}</span>
      </div>`;
    const desc = p.description ? `<p class="doc-p doc-p--sm">${escapeHtml(p.description)}</p>` : '';
    return `<div class="doc-entry">${head}${desc}</div>`;
  }).join('');
  return `<section class="doc-section"><h2 class="doc-h2">Projects</h2>${items}</section>`;
}

function sectionCertifications(resume, visible) {
  if (!visible('certifications') || !Array.isArray(resume.certifications) || !resume.certifications.length) return '';
  const items = resume.certifications
    .filter((c) => c && c.name)
    .map((c) => {
      const issuer = c.issuer ? ` — ${escapeHtml(c.issuer)}` : '';
      const date = c.date ? ` (${escapeHtml(c.date)})` : '';
      return `<li>${escapeHtml(c.name)}${issuer}${date}</li>`;
    }).join('');
  return `<section class="doc-section"><h2 class="doc-h2">Certifications</h2><ul class="doc-bullets">${items}</ul></section>`;
}

function sectionLanguages(resume, visible) {
  if (!visible('languages') || !Array.isArray(resume.languages) || !resume.languages.length) return '';
  const items = resume.languages
    .filter((l) => l && l.name)
    .map((l) => {
      const level = l.proficiency ? ` — ${escapeHtml(l.proficiency)}` : '';
      return `<li>${escapeHtml(l.name)}${level}</li>`;
    }).join('');
  return `<section class="doc-section"><h2 class="doc-h2">Languages</h2><ul class="doc-bullets">${items}</ul></section>`;
}

function sectionAwards(resume, visible) {
  if (!visible('awards') || !Array.isArray(resume.awards) || !resume.awards.length) return '';
  const items = resume.awards
    .filter((a) => a && a.title)
    .map((a) => {
      const issuer = a.issuer ? ` — ${escapeHtml(a.issuer)}` : '';
      const date = a.date ? ` (${escapeHtml(a.date)})` : '';
      return `<li>${escapeHtml(a.title)}${issuer}${date}</li>`;
    }).join('');
  return `<section class="doc-section"><h2 class="doc-h2">Awards</h2><ul class="doc-bullets">${items}</ul></section>`;
}

const SECTION_RENDERERS = {
  summary: sectionSummary,
  experience: sectionExperience,
  education: sectionEducation,
  skills: sectionSkills,
  projects: sectionProjects,
  certifications: sectionCertifications,
  languages: sectionLanguages,
  awards: sectionAwards,
};

const DEFAULT_ORDER = Object.keys(SECTION_RENDERERS);

export function renderResumePreview(target, resume = SAMPLE_RESUME, templateId = resume.templateId) {
  if (!target) return null;

  const visibility = resume.sectionVisibility || {};
  const visible = (key) => visibility[key] !== false;
  const order = Array.isArray(resume.sectionOrder) && resume.sectionOrder.length
    ? resume.sectionOrder
    : DEFAULT_ORDER;

  const c = resume.contact || {};
  const contactBits = [
    c.email,
    c.phone,
    c.city && c.country ? `${c.city}, ${c.country}` : c.city || c.country,
    c.website,
    c.linkedin,
    c.portfolio,
  ].filter(Boolean).map(escapeHtml);
  const contactLine = contactBits.join(' · ');

  const sectionsHtml = order
    .map((key) => {
      const fn = SECTION_RENDERERS[key];
      return fn ? fn(resume, visible) : '';
    })
    .join('');

  const html = `
<div class="doc doc--${escapeHtml(templateId)}" data-template="${escapeHtml(templateId)}">
  <header class="doc-header">
    ${c.photoUrl ? `<div class="doc-photo"><img src="${escapeHtml(c.photoUrl)}" alt=""></div>` : ''}
    <div class="doc-header__text">
      <h1 class="doc-name">${escapeHtml(c.fullName || 'Your Name')}</h1>
      ${c.title ? `<div class="doc-title">${escapeHtml(c.title)}</div>` : ''}
      ${contactLine ? `<div class="doc-contact">${contactLine}</div>` : ''}
    </div>
  </header>
  ${sectionsHtml}
</div>`;

  target.innerHTML = html;
  return target.firstElementChild;
}