// ---------------------------------------------------------------------------
// Template gallery page controller.
// Loads templates from /api/templates, renders cards with live previews,
// wires search + category filters, and provides a preview modal + "Use
// template" flow that carries the selection into the builder.
// ---------------------------------------------------------------------------

import { SAMPLE_RESUME, renderResumePreview } from './template-samples.js';

const CATEGORIES = [
  'All', 'Modern', 'Minimalist', 'Executive', 'Corporate', 'Creative',
  'Graduate', 'Academic', 'Technical', 'Business', 'ATS', 'Traditional', 'International',
];

const state = {
  templates: [],
  category: 'All',
  query: '',
  openTemplateId: null,
};

const els = {};
let lastFocused = null;

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function cacheEls() {
  els.grid = document.querySelector('[data-template-grid]');
  els.filters = document.querySelector('[data-filter-bar]');
  els.search = document.querySelector('[data-search]');
  els.count = document.querySelector('[data-result-count]');
  els.empty = document.querySelector('[data-empty]');
  els.modal = document.querySelector('[data-preview-modal]');
  els.modalBody = document.querySelector('[data-preview-body]');
  els.modalTitle = document.querySelector('[data-preview-title]');
  els.modalClose = document.querySelector('[data-preview-close]');
  els.modalUse = document.querySelector('[data-preview-use]');
}

async function fetchTemplates() {
  try {
    const res = await fetch('/api/templates', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.templates = Array.isArray(data.templates) ? data.templates : [];
  } catch (err) {
    console.error('Failed to load templates:', err);
    state.templates = [];
  }
}

function filterTemplates() {
  const q = state.query.trim().toLowerCase();
  return state.templates.filter((t) => {
    if (state.category !== 'All' && t.category !== state.category) return false;
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  });
}

function renderCard(t) {
  const card = document.createElement('article');
  card.className = 'template-card';
  card.dataset.templateId = t.id;

  const badges = [
    t.premium ? '<span class="badge badge--premium">Premium</span>' : '<span class="badge badge--free">Free</span>',
    t.atsCompatible ? '<span class="badge badge--ats">ATS</span>' : '',
  ].filter(Boolean).join('');

  card.innerHTML = `
    <div class="template-card__thumb" aria-hidden="true">
      <div class="template-card__thumb-inner" data-thumb></div>
    </div>
    <div class="template-card__body">
      <div class="template-card__head">
        <h3 class="template-card__name">${escapeHtml(t.name)}</h3>
        <span class="template-card__category">${escapeHtml(t.category)}</span>
      </div>
      <p class="template-card__desc">${escapeHtml(t.description)}</p>
      <div class="template-card__badges">${badges}</div>
      <div class="template-card__actions">
        <button type="button" class="btn btn--secondary" data-action="preview">Preview</button>
        <button type="button" class="btn btn--primary" data-action="use">Use template</button>
      </div>
    </div>`;

  const thumbHost = card.querySelector('[data-thumb]');
  const preview = renderResumePreview(thumbHost, SAMPLE_RESUME, t.id);
  if (preview) preview.classList.add('doc--thumb');

  card.querySelector('[data-action="preview"]').addEventListener('click', () => openPreview(t.id));
  card.querySelector('[data-action="use"]').addEventListener('click', () => useTemplate(t.id));

  return card;
}

function renderGrid() {
  if (!els.grid) return;
  const items = filterTemplates();
  els.grid.innerHTML = '';
  if (!items.length) {
    if (els.empty) els.empty.hidden = false;
    if (els.count) els.count.textContent = 'No templates match your search.';
    return;
  }
  if (els.empty) els.empty.hidden = true;
  if (els.count) els.count.textContent = `${items.length} template${items.length === 1 ? '' : 's'}`;

  const frag = document.createDocumentFragment();
  items.forEach((t) => frag.appendChild(renderCard(t)));
  els.grid.appendChild(frag);
}

function renderFilters() {
  if (!els.filters) return;
  els.filters.innerHTML = CATEGORIES.map((cat) => (
    `<button type="button" class="chip${cat === state.category ? ' chip--active' : ''}" data-category="${escapeHtml(cat)}" aria-pressed="${cat === state.category}">${escapeHtml(cat)}</button>`
  )).join('');

  els.filters.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    state.category = btn.dataset.category;
    els.filters.querySelectorAll('[data-category]').forEach((el) => {
      const active = el.dataset.category === state.category;
      el.classList.toggle('chip--active', active);
      el.setAttribute('aria-pressed', String(active));
    });
    renderGrid();
  });
}

function wireSearch() {
  if (!els.search) return;
  els.search.addEventListener('input', (e) => {
    state.query = e.target.value;
    renderGrid();
  });
}

function useTemplate(id) {
  try {
    localStorage.setItem('kilab.pendingTemplateId', id);
  } catch { /* localStorage may be blocked; builder falls back to default */ }
  window.location.href = `/builder?template=${encodeURIComponent(id)}`;
}

// --- Preview modal -------------------------------------------------------

function openPreview(templateId) {
  const t = state.templates.find((x) => x.id === templateId);
  if (!t || !els.modal) return;

  state.openTemplateId = templateId;
  els.modalTitle.textContent = `${t.name} — ${t.category}`;
  renderResumePreview(els.modalBody, SAMPLE_RESUME, templateId);
  els.modalUse.onclick = () => useTemplate(templateId);

  lastFocused = document.activeElement;
  els.modal.hidden = false;
  els.modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  const focusable = els.modal.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
  if (focusable) focusable.focus();

  document.addEventListener('keydown', trapEscape);
  els.modal.addEventListener('keydown', trapTab);
}

function closePreview() {
  if (!els.modal) return;
  state.openTemplateId = null;
  els.modal.hidden = true;
  els.modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', trapEscape);
  els.modal.removeEventListener('keydown', trapTab);
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
}

function trapEscape(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closePreview();
  }
}

function trapTab(e) {
  if (e.key !== 'Tab') return;
  const focusable = els.modal.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function wireModal() {
  if (!els.modal) return;
  els.modalClose.addEventListener('click', closePreview);
  els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) closePreview();
  });
}

// --- Boot ---------------------------------------------------------------

async function boot() {
  cacheEls();
  renderFilters();
  wireSearch();
  wireModal();
  await fetchTemplates();
  renderGrid();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}