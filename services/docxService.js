'use strict';

const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  BorderStyle, TabStopType, TabStopPosition,
} = require('docx');
const registry = require('./templateRegistry');

const ACCENT = '2563EB';
const INK = '0F172A';
const MUTED = '64748B';

function safe(v) { return (v == null ? '' : String(v)).trim(); }

function dateRange(start, end, isCurrent) {
  const s = safe(start);
  if (isCurrent) return s ? `${s} – Present` : 'Present';
  const e = safe(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || '';
}

function sectionHeading(text) {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0', space: 4 } },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, color: ACCENT, size: 20, characterSpacing: 40 }),
    ],
  });
}

function buildContactLine(contact) {
  const bits = [];
  if (contact.email) bits.push(safe(contact.email));
  if (contact.phone) bits.push(safe(contact.phone));
  const loc = [contact.city, contact.country].filter(Boolean).join(', ');
  if (loc) bits.push(loc);
  if (contact.website) bits.push(safe(contact.website));
  if (contact.linkedin) bits.push(safe(contact.linkedin));
  if (contact.portfolio) bits.push(safe(contact.portfolio));
  return bits.join('  ·  ');
}

function renderHeader(resume) {
  const c = resume.contact || {};
  const out = [];

  out.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: safe(c.fullName) || 'Your Name', bold: true, size: 48, color: INK })],
  }));

  if (c.title) {
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: safe(c.title), size: 24, color: ACCENT, bold: true })],
    }));
  }

  const line = buildContactLine(c);
  if (line) {
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: line, size: 18, color: MUTED })],
    }));
  }
  return out;
}

function renderEntryHead(left, right) {
  return new Paragraph({
    spacing: { before: 60, after: 20 },
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({ text: safe(left), bold: true, size: 22, color: INK }),
      new TextRun({ text: '\t' + safe(right), size: 18, color: MUTED }),
    ],
  });
}

function renderBullets(bullets) {
  return (bullets || [])
    .filter((b) => b && b.text)
    .map((b) => new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 60 },
      children: [new TextRun({ text: safe(b.text), size: 21, color: '334155' })],
    }));
}

const SECTION_RENDERERS = {
  summary(resume) {
    if (!resume.summary) return [];
    return [
      sectionHeading('Summary'),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: safe(resume.summary), size: 21, color: '334155' })],
      }),
    ];
  },
  experience(resume) {
    if (!Array.isArray(resume.experience) || !resume.experience.length) return [];
    const out = [sectionHeading('Experience')];
    for (const e of resume.experience) {
      const head = `${safe(e.jobTitle)}${e.employer ? ' — ' + safe(e.employer) : ''}`;
      out.push(renderEntryHead(head, dateRange(e.startDate, e.endDate, e.isCurrent)));
      if (e.location) {
        out.push(new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: safe(e.location), size: 18, color: MUTED, italics: true })],
        }));
      }
      out.push(...renderBullets(e.bullets));
    }
    return out;
  },
  education(resume) {
    if (!Array.isArray(resume.education) || !resume.education.length) return [];
    const out = [sectionHeading('Education')];
    for (const e of resume.education) {
      const title = [e.degree, e.field].filter(Boolean).join(', ');
      const head = `${safe(title)}${e.institution ? ' — ' + safe(e.institution) : ''}`;
      out.push(renderEntryHead(head, dateRange(e.startDate, e.endDate, e.isCurrent)));
      if (e.description) {
        out.push(new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: safe(e.description), size: 20, color: '334155' })],
        }));
      }
    }
    return out;
  },
  skills(resume) {
    if (!Array.isArray(resume.skills) || !resume.skills.length) return [];
    return [
      sectionHeading('Skills'),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({
          text: resume.skills
            .filter((s) => s && s.name)
            .map((s) => s.name + (s.level ? ` (${s.level})` : ''))
            .join('  ·  '),
          size: 21, color: '334155',
        })],
      }),
    ];
  },
  projects(resume) {
    if (!Array.isArray(resume.projects) || !resume.projects.length) return [];
    const out = [sectionHeading('Projects')];
    for (const p of resume.projects) {
      out.push(renderEntryHead(safe(p.name), dateRange(p.startDate, p.endDate, false)));
      if (p.description) {
        out.push(new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: safe(p.description), size: 21, color: '334155' })],
        }));
      }
    }
    return out;
  },
  certifications(resume) {
    if (!Array.isArray(resume.certifications) || !resume.certifications.length) return [];
    return [
      sectionHeading('Certifications'),
      ...resume.certifications.map((c) => new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: [new TextRun({
          text: `${safe(c.name)}${c.issuer ? ' — ' + safe(c.issuer) : ''}${c.date ? ` (${safe(c.date)})` : ''}`,
          size: 21, color: '334155',
        })],
      })),
    ];
  },
  languages(resume) {
    if (!Array.isArray(resume.languages) || !resume.languages.length) return [];
    return [
      sectionHeading('Languages'),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({
          text: resume.languages.map((l) => safe(l.name) + (l.proficiency ? ` (${safe(l.proficiency)})` : '')).join('  ·  '),
          size: 21, color: '334155',
        })],
      }),
    ];
  },
  awards(resume) {
    if (!Array.isArray(resume.awards) || !resume.awards.length) return [];
    return [
      sectionHeading('Awards'),
      ...resume.awards.map((a) => new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: [new TextRun({
          text: `${safe(a.title)}${a.issuer ? ' — ' + safe(a.issuer) : ''}${a.date ? ` (${safe(a.date)})` : ''}`,
          size: 21, color: '334155',
        })],
      })),
    ];
  },
  volunteer(resume) {
    if (!Array.isArray(resume.volunteer) || !resume.volunteer.length) return [];
    const out = [sectionHeading('Volunteer')];
    for (const v of resume.volunteer) {
      const head = `${safe(v.role)}${v.organization ? ' — ' + safe(v.organization) : ''}`;
      out.push(renderEntryHead(head, dateRange(v.startDate, v.endDate, false)));
      if (v.description) {
        out.push(new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: safe(v.description), size: 20, color: '334155' })],
        }));
      }
    }
    return out;
  },
  publications(resume) {
    if (!Array.isArray(resume.publications) || !resume.publications.length) return [];
    return [
      sectionHeading('Publications'),
      ...resume.publications.map((p) => new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: [new TextRun({
          text: `${safe(p.title)}${p.venue ? ' — ' + safe(p.venue) : ''}${p.date ? ` (${safe(p.date)})` : ''}`,
          size: 21, color: '334155',
        })],
      })),
    ];
  },
  memberships(resume) {
    if (!Array.isArray(resume.memberships) || !resume.memberships.length) return [];
    return [
      sectionHeading('Memberships'),
      ...resume.memberships.map((m) => new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: [new TextRun({
          text: `${safe(m.organization)}${m.role ? ' — ' + safe(m.role) : ''}${m.since ? ` (since ${safe(m.since)})` : ''}`,
          size: 21, color: '334155',
        })],
      })),
    ];
  },
  references(resume) {
    if (!Array.isArray(resume.references) || !resume.references.length) return [];
    return [
      sectionHeading('References'),
      ...resume.references.map((r) => new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: [new TextRun({
          text: `${safe(r.name)}${r.relationship ? ' — ' + safe(r.relationship) : ''}${r.contact ? ' · ' + safe(r.contact) : ''}`,
          size: 21, color: '334155',
        })],
      })),
    ];
  },
  custom(resume) {
    if (!Array.isArray(resume.customSections) || !resume.customSections.length) return [];
    const out = [];
    for (const cs of resume.customSections) {
      if (!cs.title && !cs.content) continue;
      out.push(sectionHeading(safe(cs.title) || 'Section'));
      out.push(new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: safe(cs.content), size: 20, color: '334155' })],
      }));
    }
    return out;
  },
};

async function buildResumeDocx(resume) {
  const visibility = resume.sectionVisibility || {};
  const template = registry.get(resume.templateId);
  const supported = template ? template.supportedSections : null;

  const visible = (k) => {
    if (visibility[k] === false) return false;
    if (Array.isArray(supported) && !supported.includes(k)) return false;
    return true;
  };

  const order = Array.isArray(resume.sectionOrder) && resume.sectionOrder.length
    ? resume.sectionOrder
    : ['summary', 'experience', 'education', 'skills', 'projects', 'certifications',
       'languages', 'awards', 'volunteer', 'publications', 'memberships', 'references', 'custom'];

  const body = [...renderHeader(resume)];
  for (const key of order) {
    if (!visible(key)) continue;
    const renderer = SECTION_RENDERERS[key];
    if (renderer) body.push(...renderer(resume));
  }

  const doc = new Document({
    creator: 'Kelvin Ikpeni CV Lab',
    title: safe(resume.title) || 'Resume',
    description: 'Generated by Kelvin Ikpeni CV Lab',
    styles: {
      default: {
        document: {
          run: { font: resume?.theme?.fontFamily || 'Calibri', size: 22 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: body,
    }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { buildResumeDocx };