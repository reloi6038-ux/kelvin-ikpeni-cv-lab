// ---------------------------------------------------------------------------
// Builder page controller.
//
// Responsibilities:
//  - Figure out initial templateId (query → pendingTemplateId → active → default).
//  - Load existing resume (from ?id= or kilab.activeResumeId) or start fresh.
//  - Restore local draft from localStorage.
//  - Initialize the editor and preview.
//  - Wire Save (POST/PATCH) and Delete.
//  - Debounced autosave to localStorage.
//  - Template switching.
//  - Export stubs (Phase 7 fills them in).
// ---------------------------------------------------------------------------

import { apiFetch } from './session.js';
import { renderResumePreview } from './template-samples.js';
import { initEditor, createEmptyResume } from './editor.js';

const DRAFT_PREFIX = 'kilab.draft.';
const ACTIVE_KEY = 'kilab.activeResumeId';
const PENDING_TEMPLATE_KEY = 'kilab.pendingTemplateId';

const els = {};
const state = {
  resume: null,
  resumeId: null,
  isSaving: false,
  isDirty: false,
  lastSavedAt: null,
};

function cacheEls() {
  els.title = document.querySelector('[data-resume-title]');
  els.templateSelect = document.querySelector('[data-template-select]');
  els.saveBtn = document.querySelector('[data-action="save"]');
  els.deleteBtn = document.querySelector('[data-action="delete"]');
  els.statusEl = document.querySelector('[data-save-status]');
  els.panel = document.querySelector('[data-editor-panel]');
  els.nav = document.querySelector('[data-section-nav]');
  els.previewHost = document.querySelector('[data-preview-host]');
  els.toast = document.querySelector('[data-toast]');
  els.mobileToggle = document.querySelector('[data-mobile-toggle]');
  els.workspace = document.querySelector('[data-workspace]');
}

function setStatus(text, kind = 'idle') {
  if (!els.statusEl) return;
  els.statusEl.textContent = text;
  els.statusEl.dataset.kind = kind;
}

function toast(msg, kind = 'info') {
  if (!els.toast) return;
  els.toast.textContent = msg;
  els.toast.hidden = false;
  els.toast.dataset.kind = kind;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { els.toast.hidden = true; }, 3500);
}

function readPendingTemplateId() {
  const q = new URLSearchParams(window.location.search).get('template');
  if (q) return q;
  try {
    const t = localStorage.getItem(PENDING_TEMPLATE_KEY);
    if (t) return t;
  } catch { /* ignore */ }
  return null;
}

function readActiveResumeId() {
  const q = new URLSearchParams(window.location.search).get('id');
  if (q) return q;
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

function draftKey() {
  return DRAFT_PREFIX + (state.resumeId || 'new');
}

function saveDraft() {
  try { localStorage.setItem(draftKey(), JSON.stringify(state.resume)); } catch { /* ignore */ }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(draftKey());
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearDraft() {
  try { localStorage.removeItem(draftKey()); } catch { /* ignore */ }
}

function normalizeResume(r) {
  const base = createEmptyResume(r.templateId || 'modern-professional');
  return {
    ...base,
    ...r,
    contact: { ...base.contact, ...(r.contact || {}) },
    theme: { ...base.theme, ...(r.theme || {}) },
  };
}

function renderPreview() {
  if (!els.previewHost || !state.resume) return;
  renderResumePreview(els.previewHost, state.resume, state.resume.templateId);
  const doc = els.previewHost.firstElementChild;
  if (doc && state.resume.theme) {
    if (state.resume.theme.accentColor) doc.style.setProperty('--doc-accent', state.resume.theme.accentColor);
    if (state.resume.theme.fontFamily) doc.style.setProperty('--doc-font', `'${state.resume.theme.fontFamily}', ui-sans-serif, system-ui, sans-serif`);
    if (state.resume.theme.fontSize) doc.style.setProperty('--doc-fs', `${state.resume.theme.fontSize}pt`);
    if (state.resume.theme.spacing) doc.style.setProperty('--doc-space', String(state.resume.theme.spacing));
  }
}

let saveTimer = null;
function scheduleSave() {
  setStatus('Unsaved changes', 'dirty');
  state.isDirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveDraft();
    setStatus('Draft saved locally', 'ok');
  }, 1200);
}

async function manualSave() {
  if (state.isSaving || !state.resume) return;
  state.isSaving = true;
  setStatus('Saving…', 'saving');
  if (els.saveBtn) els.saveBtn.disabled = true;
  try {
    const payload = JSON.parse(JSON.stringify(state.resume));
    delete payload._id; delete payload.id;
    delete payload.createdAt; delete payload.updatedAt;
    delete payload.ownerHash; delete payload.deletedAt;

    let res;
    if (state.resumeId) {
      res = await apiFetch(`/api/resumes/${state.resumeId}`, { method: 'PATCH', body: JSON.stringify(payload) });
    } else {
      res = await apiFetch('/api/resumes', { method: 'POST', body: JSON.stringify(payload) });
    }
    state.resumeId = res.resume.id;
    state.resume = { ...state.resume, id: res.resume.id };
    try { localStorage.setItem(ACTIVE_KEY, state.resumeId); } catch { /* ignore */ }
    saveDraft();
    state.isDirty = false;
    setStatus('Saved', 'ok');
    state.lastSavedAt = new Date();
    toast('Resume saved', 'ok');
  } catch (err) {
    console.error('Save failed:', err);
    setStatus('Save failed — draft kept locally', 'error');
    toast('Could not save to server. Your draft is safe locally.', 'error');
  } finally {
    state.isSaving = false;
    if (els.saveBtn) els.saveBtn.disabled = false;
  }
}

async function deleteResume() {
  if (!state.resumeId) { toast('Nothing to delete yet.', 'info'); return; }
  if (!confirm('Delete this saved resume? Your local draft will also be cleared.')) return;
  try {
    await apiFetch(`/api/resumes/${state.resumeId}`, { method: 'DELETE' });
    clearDraft();
    try { localStorage.removeItem(ACTIVE_KEY); } catch { /* ignore */ }
    state.resumeId = null;
    toast('Resume deleted.', 'ok');
    setStatus('Not saved', 'idle');
  } catch (err) {
    console.error(err);
    toast('Delete failed: ' + err.message, 'error');
  }
}

async function populateTemplateSelect() {
  if (!els.templateSelect) return;
  try {
    const res = await fetch('/api/templates', { headers: { Accept: 'application/json' } });
    const data = await res.json();
    const templates = data.templates || [];
    els.templateSelect.innerHTML = templates
      .map((t) => `<option value="${t.id}">${t.name} — ${t.category}</option>`)
      .join('');
  } catch (err) {
    console.error('Failed to load templates:', err);
  }
}

async function init() {
  cacheEls();
  await populateTemplateSelect();

  const pendingTpl = readPendingTemplateId();
  const activeId = readActiveResumeId();

  if (activeId) {
    state.resumeId = activeId;
    const localDraft = loadDraft();
    if (localDraft) {
      state.resume = normalizeResume(localDraft);
      setStatus('Loaded local draft', 'ok');
    } else {
      try {
        const res = await apiFetch(`/api/resumes/${activeId}`);
        state.resume = normalizeResume(res.resume);
        setStatus('Loaded from server', 'ok');
      } catch (err) {
        console.warn('Falling back to new resume:', err.message);
        state.resume = createEmptyResume(pendingTpl || 'modern-professional');
        state.resumeId = null;
      }
    }
  } else {
    const draft = loadDraft();
    if (draft) {
      state.resume = normalizeResume(draft);
      setStatus('Restored unsaved draft', 'ok');
    } else {
      state.resume = createEmptyResume(pendingTpl || 'modern-professional');
      setStatus('Ready', 'idle');
    }
  }

  if (pendingTpl) state.resume.templateId = pendingTpl;

  if (els.title) {
    els.title.value = state.resume.title || 'Untitled Resume';
    els.title.addEventListener('input', (e) => {
      state.resume.title = e.target.value.slice(0, 200);
      scheduleSave();
    });
  }

  if (els.templateSelect) {
    if (state.resume.templateId) els.templateSelect.value = state.resume.templateId;
    els.templateSelect.addEventListener('change', (e) => {
      state.resume.templateId = e.target.value;
      renderPreview();
      scheduleSave();
    });
  }

  if (els.saveBtn) els.saveBtn.addEventListener('click', manualSave);
  if (els.deleteBtn) els.deleteBtn.addEventListener('click', deleteResume);

  if (els.mobileToggle) {
    els.mobileToggle.addEventListener('click', () => {
      els.workspace.classList.toggle('workspace--show-preview');
    });
  }

  initEditor({
    state,
    panelEl: els.panel,
    navEl: els.nav,
    onChange: () => {
      renderPreview();
      scheduleSave();
    },
  });

  renderPreview();

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      manualSave();
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  try { localStorage.removeItem(PENDING_TEMPLATE_KEY); } catch { /* ignore */ }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export function getCurrentResume() { return state.resume; }
export function getCurrentResumeId() { return state.resumeId; }