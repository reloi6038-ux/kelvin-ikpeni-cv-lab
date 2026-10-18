// ---------------------------------------------------------------------------
// Editor: form for every resume section + section reordering + theme reset.
// Mutations dispatch 'resume:changed' on document.
// Mutations that should be captured for undo dispatch 'resume:mutation' with
// a `commit` timestamp; the builder decides when to snapshot.
// ---------------------------------------------------------------------------

const SECTION_LABELS = {
  contact: 'Contact',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  awards: 'Awards',
  volunteer: 'Volunteer',
  publications: 'Publications',
  memberships: 'Memberships',
  references: 'References',
  custom: 'Custom sections',
};

const TEMPLATE_DEFAULT_THEME = {
  primaryColor: '#0f172a',
  accentColor: '#2563eb',
  fontFamily: 'Inter',
  fontSize: 11,
  spacing: 1.0,
};

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function createEmptyResume(templateId = 'modern-professional') {
  return {
    title: 'Untitled Resume',
    templateId,
    contact: {
      fullName: '', title: '', email: '', phone: '',
      city: '', country: '', website: '', linkedin: '', portfolio: '', photoUrl: '',
    },
    summary: '',
    experience: [], education: [], skills: [], projects: [],
    certifications: [], languages: [], awards: [], volunteer: [],
    publications: [], memberships: [], references: [], customSections: [],
    theme: { ...TEMPLATE_DEFAULT_THEME },
    sectionOrder: [
      'summary', 'experience', 'education', 'skills', 'projects',
      'certifications', 'languages', 'awards', 'volunteer',
      'publications', 'memberships', 'references', 'custom',
    ],
    sectionVisibility: {
      summary: true, experience: true, education: true, skills: true,
      projects: true, certifications: true, languages: true, awards: true,
      volunteer: true, publications: true, memberships: true,
      references: true, custom: true,
    },
  };
}

// ---- DOM helpers --------------------------------------------------------

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function field(label, input) {
  const id = input.id || `f-${uid()}`;
  input.id = id;
  return el('label', { class: 'field', for: id }, [
    el('span', { class: 'field__label' }, label),
    input,
  ]);
}

function textInput(value, opts = {}) {
  return el('input', {
    type: opts.type || 'text',
    value: value || '',
    class: 'input',
    placeholder: opts.placeholder || '',
    maxlength: opts.maxlength || 200,
    autocomplete: opts.autocomplete || 'off',
  });
}

function textarea(value, opts = {}) {
  const t = el('textarea', {
    class: 'input input--textarea',
    rows: opts.rows || 4,
    maxlength: opts.maxlength || 5000,
    placeholder: opts.placeholder || '',
  });
  t.value = value || '';
  return t;
}

// ---- Renderers ----------------------------------------------------------

function renderContact(state) {
  const c = state.resume.contact;
  const wrap = el('div', { class: 'form-grid' });

  const photoRow = el('div', { class: 'photo-url-row' });
  const thumb = el('div', { class: 'photo-url-thumb', 'aria-hidden': 'true' });
  const img = el('img', { alt: '', referrerpolicy: 'no-referrer', loading: 'lazy' });
  img.style.display = 'none';
  img.addEventListener('load', () => {
    img.style.display = 'block';
    thumb.classList.add('photo-url-thumb--has');
    thumb.dataset.state = 'has';
  });
  img.addEventListener('error', () => {
    img.style.display = 'none';
    thumb.classList.remove('photo-url-thumb--has');
    thumb.dataset.state = 'error';
  });
  thumb.appendChild(img);

  const photoInput = textInput(c.photoUrl || '', {
    placeholder: 'https://example.com/photo.jpg',
    autocomplete: 'url',
    maxlength: 500000,
    type: 'url',
  });

  if (c.photoUrl) { thumb.dataset.state = 'loading'; img.src = c.photoUrl; }
  else { thumb.dataset.state = 'empty'; }

  photoInput.addEventListener('input', (e) => {
    const v = e.target.value.trim();
    c.photoUrl = v;
    if (!v) {
      img.removeAttribute('src');
      img.style.display = 'none';
      thumb.classList.remove('photo-url-thumb--has');
      thumb.dataset.state = 'empty';
    } else {
      thumb.dataset.state = 'loading';
      img.src = v;
    }
    emitChange();
  });

  const photoLabel = el('label', { class: 'field' }, [
    el('span', { class: 'field__label' }, 'Profile photo URL (optional)'),
    photoInput,
  ]);
  photoLabel.appendChild(el('span', { class: 'field__hint' },
    'Paste a direct image URL. Must be publicly reachable over https. Leave blank to hide the photo.'));

  const photoClear = el('button', {
    type: 'button', class: 'btn btn--ghost',
    onclick: () => {
      c.photoUrl = '';
      photoInput.value = '';
      img.removeAttribute('src');
      img.style.display = 'none';
      thumb.classList.remove('photo-url-thumb--has');
      thumb.dataset.state = 'empty';
      emitChange();
    },
  }, 'Remove photo');
  photoLabel.appendChild(photoClear);

  photoRow.appendChild(thumb);
  photoRow.appendChild(photoLabel);
  wrap.appendChild(photoRow);

  const inputs = [
    ['fullName', 'Full name', 'Amara Okafor', 'name'],
    ['title', 'Professional title', 'Senior Product Designer', 'organization-title'],
    ['email', 'Email', 'you@example.com', 'email'],
    ['phone', 'Phone', '+234 800 000 0000', 'tel'],
    ['city', 'City', 'Lagos', 'address-level2'],
    ['country', 'Country', 'Nigeria', 'country-name'],
    ['website', 'Website', 'yoursite.com', 'url'],
    ['linkedin', 'LinkedIn', 'linkedin.com/in/you', 'url'],
    ['portfolio', 'Portfolio', 'portfolio.example.com', 'url'],
  ];
  for (const [key, label, ph, ac] of inputs) {
    const input = textInput(c[key], { placeholder: ph, autocomplete: ac });
    input.addEventListener('input', (e) => { c[key] = e.target.value; emitChange(); });
    wrap.appendChild(field(label, input));
  }
  return wrap;
}

function renderSummary(state) {
  const wrap = el('div');
  const ta = textarea(state.resume.summary, {
    rows: 7, maxlength: 5000,
    placeholder: 'A concise paragraph: who you are, what you do, and the impact you bring.',
  });
  const counter = el('div', { class: 'field__hint', 'aria-live': 'polite' },
    `${state.resume.summary.length} / 5000 characters`);
  ta.addEventListener('input', (e) => {
    state.resume.summary = e.target.value;
    counter.textContent = `${e.target.value.length} / 5000 characters`;
    emitChange();
  });
  wrap.appendChild(field('Professional summary', ta));
  wrap.appendChild(counter);
  return wrap;
}

function renderEntryCard(title, onRemove, children) {
  return el('div', { class: 'entry-card' }, [
    el('div', { class: 'entry-card__head' }, [
      el('h4', { class: 'entry-card__title' }, title),
      el('button', {
        type: 'button', class: 'btn btn--ghost btn--icon',
        'aria-label': 'Remove entry',
        onclick: onRemove,
      }, '✕'),
    ]),
    el('div', { class: 'entry-card__body' }, children),
  ]);
}

function renderListSection(state, key, opts) {
  const wrap = el('div');
  const list = state.resume[key];
  if (!list.length) {
    wrap.appendChild(el('p', { class: 'empty-note' }, opts.emptyText));
  }
  list.forEach((entry, i) => {
    const fields = opts.build(entry, () => {
      list.splice(i, 1);
      rerenderCurrent();
      emitChange();
    });
    wrap.appendChild(renderEntryCard(opts.title(entry, i), () => {
      list.splice(i, 1);
      rerenderCurrent();
      emitChange();
    }, fields));
  });
  const addBtn = el('button', {
    type: 'button', class: 'btn btn--secondary',
    onclick: () => {
      list.push(opts.newEntry());
      rerenderCurrent();
      emitChange();
    },
  }, opts.addLabel);
  wrap.appendChild(addBtn);
  return wrap;
}

function renderExperience(state) {
  return renderListSection(state, 'experience', {
    emptyText: 'No positions yet. Add your most recent role first.',
    title: (e, i) => e.jobTitle || e.employer || `Position ${i + 1}`,
    addLabel: '+ Add position',
    newEntry: () => ({ id: uid(), employer: '', jobTitle: '', location: '', startDate: '', endDate: '', isCurrent: false, bullets: [{ text: '' }] }),
    build: (entry) => {
      const grid = el('div', { class: 'form-grid' });
      const simple = [
        ['jobTitle', 'Job title', 'Senior Product Designer'],
        ['employer', 'Employer', 'Northwind Labs'],
        ['location', 'Location', 'Lagos, NG'],
        ['startDate', 'Start (e.g. 2021)', '2021'],
      ];
      for (const [k, label, ph] of simple) {
        const input = textInput(entry[k], { placeholder: ph });
        input.addEventListener('input', (e) => { entry[k] = e.target.value; emitChange(); });
        grid.appendChild(field(label, input));
      }
      const endInput = textInput(entry.endDate, { placeholder: '2024' });
      endInput.disabled = !!entry.isCurrent;
      endInput.addEventListener('input', (e) => { entry.endDate = e.target.value; emitChange(); });
      grid.appendChild(field('End (or leave blank)', endInput));

      const currentLabel = el('label', { class: 'checkbox' });
      const cb = el('input', { type: 'checkbox' });
      cb.checked = !!entry.isCurrent;
      cb.addEventListener('change', (e) => {
        entry.isCurrent = e.target.checked;
        endInput.disabled = entry.isCurrent;
        if (entry.isCurrent) { entry.endDate = ''; endInput.value = ''; }
        emitChange();
      });
      currentLabel.appendChild(cb);
      currentLabel.appendChild(document.createTextNode(' Currently here'));
      grid.appendChild(currentLabel);

      const bulletsWrap = el('div', { class: 'bullets' });
      bulletsWrap.appendChild(el('div', { class: 'field__label' }, 'Achievements'));
      entry.bullets.forEach((b, bi) => {
        const row = el('div', { class: 'bullet-row' });
        const input = textInput(b.text, { placeholder: 'Led X, achieving Y by Z.', maxlength: 500 });
        input.addEventListener('input', (e) => { b.text = e.target.value; emitChange(); });
        const remove = el('button', {
          type: 'button', class: 'btn btn--ghost btn--icon',
          'aria-label': 'Remove bullet',
          onclick: () => { entry.bullets.splice(bi, 1); rerenderCurrent(); emitChange(); },
        }, '✕');
        row.appendChild(input);
        row.appendChild(remove);
        bulletsWrap.appendChild(row);
      });
      const addBullet = el('button', {
        type: 'button', class: 'btn btn--ghost',
        onclick: () => { entry.bullets.push({ text: '' }); rerenderCurrent(); emitChange(); },
      }, '+ Add bullet');
      bulletsWrap.appendChild(addBullet);
      grid.appendChild(bulletsWrap);
      return grid;
    },
  });
}

function renderEducation(state) {
  return renderListSection(state, 'education', {
    emptyText: 'No education entries yet.',
    title: (e, i) => e.degree || e.institution || `Education ${i + 1}`,
    addLabel: '+ Add education',
    newEntry: () => ({ id: uid(), institution: '', degree: '', field: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' }),
    build: (entry) => {
      const grid = el('div', { class: 'form-grid' });
      const simple = [
        ['degree', 'Degree', 'B.Sc.'],
        ['field', 'Field of study', 'Computer Science'],
        ['institution', 'Institution', 'University of Lagos'],
        ['location', 'Location', 'Lagos, NG'],
        ['startDate', 'Start', '2012'],
        ['endDate', 'End', '2016'],
      ];
      for (const [k, label, ph] of simple) {
        const input = textInput(entry[k], { placeholder: ph });
        input.addEventListener('input', (e) => { entry[k] = e.target.value; emitChange(); });
        grid.appendChild(field(label, input));
      }
      const ta = textarea(entry.description, { rows: 3, maxlength: 500, placeholder: 'Honours, relevant coursework, thesis, etc.' });
      ta.addEventListener('input', (e) => { entry.description = e.target.value; emitChange(); });
      grid.appendChild(field('Additional details', ta));
      return grid;
    },
  });
}

function renderSkills(state) {
  return renderListSection(state, 'skills', {
    emptyText: 'Add your strongest skills first.',
    title: (s, i) => s.name || `Skill ${i + 1}`,
    addLabel: '+ Add skill',
    newEntry: () => ({ id: uid(), name: '', level: '' }),
    build: (entry) => {
      const grid = el('div', { class: 'form-grid form-grid--2' });
      const name = textInput(entry.name, { placeholder: 'Product Design' });
      name.addEventListener('input', (e) => { entry.name = e.target.value; emitChange(); });
      grid.appendChild(field('Skill', name));
      const level = textInput(entry.level, { placeholder: 'Expert / Advanced / Working' });
      level.addEventListener('input', (e) => { entry.level = e.target.value; emitChange(); });
      grid.appendChild(field('Level (optional)', level));
      return grid;
    },
  });
}

function renderProjects(state) {
  return renderListSection(state, 'projects', {
    emptyText: 'Add a project that demonstrates impact.',
    title: (p, i) => p.name || `Project ${i + 1}`,
    addLabel: '+ Add project',
    newEntry: () => ({ id: uid(), name: '', description: '', link: '', startDate: '', endDate: '' }),
    build: (entry) => {
      const grid = el('div', { class: 'form-grid' });
      const simple = [
        ['name', 'Project name', 'Noteworthy'],
        ['link', 'Link', 'example.com/project'],
        ['startDate', 'Start', '2022'],
        ['endDate', 'End', '2023'],
      ];
      for (const [k, label, ph] of simple) {
        const input = textInput(entry[k], { placeholder: ph });
        input.addEventListener('input', (e) => { entry[k] = e.target.value; emitChange(); });
        grid.appendChild(field(label, input));
      }
      const ta = textarea(entry.description, { rows: 3, maxlength: 500, placeholder: 'What it does, why it matters, and your role.' });
      ta.addEventListener('input', (e) => { entry.description = e.target.value; emitChange(); });
      grid.appendChild(field('Description', ta));
      return grid;
    },
  });
}

function renderCertifications(state) {
  return renderListSection(state, 'certifications', {
    emptyText: 'No certifications yet.',
    title: (c, i) => c.name || `Certification ${i + 1}`,
    addLabel: '+ Add certification',
    newEntry: () => ({ id: uid(), name: '', issuer: '', date: '', link: '' }),
    build: (entry) => {
      const grid = el('div', { class: 'form-grid form-grid--2' });
      const simple = [['name', 'Name', 'Google UX Design Certificate'], ['issuer', 'Issuer', 'Google'], ['date', 'Date', '2020'], ['link', 'Link', '']];
      for (const [k, label, ph] of simple) {
        const input = textInput(entry[k], { placeholder: ph });
        input.addEventListener('input', (e) => { entry[k] = e.target.value; emitChange(); });
        grid.appendChild(field(label, input));
      }
      return grid;
    },
  });
}

function renderLanguages(state) {
  return renderListSection(state, 'languages', {
    emptyText: 'No languages added.',
    title: (l, i) => l.name || `Language ${i + 1}`,
    addLabel: '+ Add language',
    newEntry: () => ({ id: uid(), name: '', proficiency: '' }),
    build: (entry) => {
      const grid = el('div', { class: 'form-grid form-grid--2' });
      const name = textInput(entry.name, { placeholder: 'French' });
      name.addEventListener('input', (e) => { entry.name = e.target.value; emitChange(); });
      grid.appendChild(field('Language', name));
      const level = textInput(entry.proficiency, { placeholder: 'Native / Fluent / Conversational' });
      level.addEventListener('input', (e) => { entry.proficiency = e.target.value; emitChange(); });
      grid.appendChild(field('Proficiency', level));
      return grid;
    },
  });
}

function renderAwards(state) {
  return renderListSection(state, 'awards', {
    emptyText: 'No awards added.',
    title: (a, i) => a.title || `Award ${i + 1}`,
    addLabel: '+ Add award',
    newEntry: () => ({ id: uid(), title: '', issuer: '', date: '', description: '' }),
    build: (entry) => {
      const grid = el('div', { class: 'form-grid' });
      const simple = [['title', 'Title', 'Design Team of the Year'], ['issuer', 'Issuer', 'Lagos Design Awards'], ['date', 'Date', '2023']];
      for (const [k, label, ph] of simple) {
        const input = textInput(entry[k], { placeholder: ph });
        input.addEventListener('input', (e) => { entry[k] = e.target.value; emitChange(); });
        grid.appendChild(field(label, input));
      }
      return grid;
    },
  });
}

function renderVolunteer(state) {
  return renderListSection(state, 'volunteer', {
    emptyText: 'No volunteer experience added.',
    title: (v, i) => v.role || v.organization || `Volunteer ${i + 1}`,
    addLabel: '+ Add volunteer role',
    newEntry: () => ({ id: uid(), organization: '', role: '', startDate: '', endDate: '', description: '' }),
    build: (entry) => {
      const grid = el('div', { class: 'form-grid' });
      const simple = [['role', 'Role', 'Mentor'], ['organization', 'Organization', 'Local Bootcamp'], ['startDate', 'Start', '2021'], ['endDate', 'End', '2023']];
      for (const [k, label, ph] of simple) {
        const input = textInput(entry[k], { placeholder: ph });
        input.addEventListener('input', (e) => { entry[k] = e.target.value; emitChange(); });
        grid.appendChild(field(label, input));
      }
      return grid;
    },
  });
}

function renderPublications(state) {
  return renderListSection(state, 'publications', {
    emptyText: 'No publications added.',
    title: (p, i) => p.title || `Publication ${i + 1}`,
    addLabel: '+ Add publication',
    newEntry: () => ({ id: uid(), title: '', venue: '', date: '', link: '' }),
    build: (entry) => {
      const grid = el('div', { class: 'form-grid' });
      const simple = [['title', 'Title', ''], ['venue', 'Venue', ''], ['date', 'Date', ''], ['link', 'Link', '']];
      for (const [k, label, ph] of simple) {
        const input = textInput(entry[k], { placeholder: ph });
        input.addEventListener('input', (e) => { entry[k] = e.target.value; emitChange(); });
        grid.appendChild(field(label, input));
      }
      return grid;
    },
  });
}

function renderMemberships(state) {
  return renderListSection(state, 'memberships', {
    emptyText: 'No memberships added.',
    title: (m, i) => m.organization || `Membership ${i + 1}`,
    addLabel: '+ Add membership',
    newEntry: () => ({ id: uid(), organization: '', role: '', since: '' }),
    build: (entry) => {
      const grid = el('div', { class: 'form-grid form-grid--2' });
      const simple = [['organization', 'Organization', ''], ['role', 'Role', ''], ['since', 'Since', '']];
      for (const [k, label, ph] of simple) {
        const input = textInput(entry[k], { placeholder: ph });
        input.addEventListener('input', (e) => { entry[k] = e.target.value; emitChange(); });
        grid.appendChild(field(label, input));
      }
      return grid;
    },
  });
}

function renderReferences(state) {
  return renderListSection(state, 'references', {
    emptyText: 'No references added.',
    title: (r, i) => r.name || `Reference ${i + 1}`,
    addLabel: '+ Add reference',
    newEntry: () => ({ id: uid(), name: '', relationship: '', contact: '' }),
    build: (entry) => {
      const grid = el('div', { class: 'form-grid' });
      const simple = [['name', 'Name', ''], ['relationship', 'Relationship', 'Former manager at Northwind Labs'], ['contact', 'Contact', 'email or phone']];
      for (const [k, label, ph] of simple) {
        const input = textInput(entry[k], { placeholder: ph });
        input.addEventListener('input', (e) => { entry[k] = e.target.value; emitChange(); });
        grid.appendChild(field(label, input));
      }
      return grid;
    },
  });
}

function renderCustomSections(state) {
  return renderListSection(state, 'customSections', {
    emptyText: 'Add custom sections like Teaching, Grants, or Speaking.',
    title: (c, i) => c.title || `Custom section ${i + 1}`,
    addLabel: '+ Add custom section',
    newEntry: () => ({ id: uid(), title: '', content: '' }),
    build: (entry) => {
      const grid = el('div', { class: 'form-grid' });
      const title = textInput(entry.title, { placeholder: 'Section title' });
      title.addEventListener('input', (e) => { entry.title = e.target.value; emitChange(); });
      grid.appendChild(field('Title', title));
      const ta = textarea(entry.content, { rows: 4, maxlength: 5000, placeholder: 'One entry per line' });
      ta.addEventListener('input', (e) => { entry.content = e.target.value; emitChange(); });
      grid.appendChild(field('Content', ta));
      return grid;
    },
  });
}

function renderAppearance(state) {
  const t = state.resume.theme;
  const grid = el('div', { class: 'form-grid form-grid--2' });

  const colorWrap = el('div', { class: 'field' }, [el('span', { class: 'field__label' }, 'Accent color')]);
  const colorInput = el('input', { type: 'color', class: 'input input--color' });
  colorInput.value = t.accentColor || '#2563eb';
  colorInput.addEventListener('input', (e) => { t.accentColor = e.target.value; emitChange(); });
  colorWrap.appendChild(colorInput);
  grid.appendChild(colorWrap);

  const fontSel = el('select', { class: 'input' });
  ['Inter', 'Georgia', 'JetBrains Mono'].forEach((f) => {
    const o = el('option', { value: f }, f);
    if (f === t.fontFamily) o.selected = true;
    fontSel.appendChild(o);
  });
  fontSel.addEventListener('change', (e) => { t.fontFamily = e.target.value; emitChange(); });
  grid.appendChild(field('Font', fontSel));

  const size = el('input', { type: 'range', min: '9', max: '14', step: '0.5', class: 'input' });
  size.value = t.fontSize || 11;
  size.addEventListener('input', (e) => { t.fontSize = parseFloat(e.target.value); emitChange(); });
  grid.appendChild(field(`Font size (${t.fontSize || 11}pt)`, size));

  const spacing = el('input', { type: 'range', min: '0.85', max: '1.4', step: '0.05', class: 'input' });
  spacing.value = t.spacing || 1;
  spacing.addEventListener('input', (e) => { t.spacing = parseFloat(e.target.value); emitChange(); });
  grid.appendChild(field(`Line spacing (${(t.spacing || 1).toFixed(2)}×)`, spacing));

  // Reset theme button
  const reset = el('button', {
    type: 'button', class: 'btn btn--secondary', style: 'grid-column:1 / -1;justify-self:start;',
    onclick: () => {
      state.resume.theme = { ...TEMPLATE_DEFAULT_THEME };
      rerenderCurrent();
      emitChange();
    },
  }, 'Reset theme to default');
  grid.appendChild(reset);
  return grid;
}

function renderVisibility(state) {
  const wrap = el('div', { class: 'visibility-grid' });
  const order = state.resume.sectionOrder || [];
  const v = state.resume.sectionVisibility || {};
  for (const key of order) {
    if (!(key in SECTION_LABELS)) continue;
    const label = el('label', { class: 'checkbox' });
    const cb = el('input', { type: 'checkbox' });
    cb.checked = v[key] !== false;
    cb.addEventListener('change', (e) => {
      state.resume.sectionVisibility = state.resume.sectionVisibility || {};
      state.resume.sectionVisibility[key] = e.target.checked;
      emitChange();
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + SECTION_LABELS[key]));
    wrap.appendChild(label);
  }
  return wrap;
}

function renderReorder(state) {
  const wrap = el('div', { class: 'reorder-list' });
  wrap.appendChild(el('p', { class: 'field__hint' },
    'Drag to reorder, or use the Up/Down buttons. Order affects the preview and the exported document.'));

  const order = (state.resume.sectionOrder || []).filter((k) => k in SECTION_LABELS);
  order.forEach((key, idx) => {
    const row = el('div', { class: 'reorder-item', draggable: 'true', dataset: { key, idx: String(idx) } });

    const handle = el('span', { class: 'reorder-item__handle', 'aria-hidden': 'true' }, '⋮⋮');
    const label = el('span', { class: 'reorder-item__label' }, SECTION_LABELS[key]);

    const up = el('button', {
      type: 'button', class: 'btn btn--ghost btn--icon', 'aria-label': 'Move up',
      disabled: idx === 0,
      onclick: () => move(idx, -1),
    }, '↑');
    const down = el('button', {
      type: 'button', class: 'btn btn--ghost btn--icon', 'aria-label': 'Move down',
      disabled: idx === order.length - 1,
      onclick: () => move(idx, 1),
    }, '↓');

    row.appendChild(handle);
    row.appendChild(label);
    row.appendChild(up);
    row.appendChild(down);

    // Drag events
    row.addEventListener('dragstart', (e) => {
      row.classList.add('reorder-item--dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
    });
    row.addEventListener('dragend', () => row.classList.remove('reorder-item--dragging'));
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      row.classList.add('reorder-item--over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('reorder-item--over'));
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('reorder-item--over');
      const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const to = idx;
      if (!Number.isInteger(from) || from === to) return;
      reorder(from, to);
    });

    wrap.appendChild(row);
  });

  function move(from, delta) {
    const to = from + delta;
    if (to < 0 || to >= order.length) return;
    reorder(from, to);
  }

  function reorder(from, to) {
    const arr = state.resume.sectionOrder.slice();
    // Compose full order including any non-visible sections not in this list.
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    state.resume.sectionOrder = arr;
    rerenderCurrent();
    emitChange();
  }

  return wrap;
}

// ---- Dispatch -----------------------------------------------------------

const SECTION_RENDERERS = {
  contact: renderContact,
  summary: renderSummary,
  experience: renderExperience,
  education: renderEducation,
  skills: renderSkills,
  projects: renderProjects,
  certifications: renderCertifications,
  languages: renderLanguages,
  awards: renderAwards,
  volunteer: renderVolunteer,
  publications: renderPublications,
  memberships: renderMemberships,
  references: renderReferences,
  custom: renderCustomSections,
  appearance: renderAppearance,
  visibility: renderVisibility,
  reorder: renderReorder,
};

// ---- Public API ---------------------------------------------------------

let _state = null;
let _currentSection = 'contact';
let _panelEl = null;

function rerenderCurrent() {
  if (!_panelEl || !_state) return;
  renderSectionInto(_panelEl, _currentSection);
}

function emitChange() {
  document.dispatchEvent(new CustomEvent('resume:changed'));
}

function renderSectionInto(panel, sectionKey) {
  panel.innerHTML = '';
  const renderer = SECTION_RENDERERS[sectionKey];
  if (!renderer) {
    panel.appendChild(el('p', { class: 'empty-note' }, 'Unknown section.'));
    return;
  }
  panel.appendChild(renderer(_state));
}

export function initEditor({ state, panelEl, navEl, onChange }) {
  _state = state;
  _panelEl = panelEl;
  if (onChange) document.addEventListener('resume:changed', onChange);

  const navItems = [
    ['contact', 'Contact'], ['summary', 'Summary'],
    ['experience', 'Experience'], ['education', 'Education'],
    ['skills', 'Skills'], ['projects', 'Projects'],
    ['certifications', 'Certifications'], ['languages', 'Languages'],
    ['awards', 'Awards'], ['volunteer', 'Volunteer'],
    ['publications', 'Publications'], ['memberships', 'Memberships'],
    ['references', 'References'], ['custom', 'Custom sections'],
    ['appearance', 'Appearance'], ['visibility', 'Section visibility'],
    ['reorder', 'Section order'],
  ];
  navEl.innerHTML = '';
  for (const [key, label] of navItems) {
    const btn = el('button', {
      type: 'button',
      class: 'section-nav__item' + (key === _currentSection ? ' section-nav__item--active' : ''),
      dataset: { section: key },
      onclick: () => {
        _currentSection = key;
        navEl.querySelectorAll('.section-nav__item').forEach((b) => {
          b.classList.toggle('section-nav__item--active', b.dataset.section === key);
        });
        renderSectionInto(panelEl, key);
      },
    }, label);
    navEl.appendChild(btn);
  }

  renderSectionInto(panelEl, _currentSection);
}

export function setResumeState(newState) {
  _state = newState;
  if (_panelEl) renderSectionInto(_panelEl, _currentSection);
}

export function setSection(section) {
  _currentSection = section;
  if (_panelEl) renderSectionInto(_panelEl, section);
}

export function getSectionLabels() { return { ...SECTION_LABELS }; }