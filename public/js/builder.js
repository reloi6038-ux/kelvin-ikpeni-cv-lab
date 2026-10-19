// ---------------------------------------------------------------------------
// Kelvin Ikpeni CV Lab — Builder page controller.
// ---------------------------------------------------------------------------

import { apiFetch } from './session.js';
import { renderResumePreview } from './template-samples.js';
import { initEditor, createEmptyResume, getSectionLabels } from './editor.js';
import { createHistory } from './history.js';
import {
  listResumes, duplicateResume, deleteResume as deleteResumeById,
  getActiveResumeId, setActiveResumeId, clearAllLocalDraftsFor,
} from './resume-manager.js';
import { exportPdf, exportDocx } from './exporter.js';

const DRAFT_PREFIX = 'kilab.draft.';
const PENDING_TEMPLATE_KEY = 'kilab.pendingTemplateId';

const els = {};
const state = {
  resume: null,
  resumeId: null,
  isSaving: false,
  isDirty: false,
  isExporting: false,
  history: null,
};

const templatesById = new Map();
let savedResumes = [];

function cacheEls() {
  els.title = document.querySelector('[data-resume-title]');
  els.templateSelect = document.querySelector('[data-template-select]');
  els.saveBtn = document.querySelector('[data-action="save"]');
  els.deleteBtn = document.querySelector('[data-action="delete"]');
  els.resumeBtn = document.querySelector('[data-action="resumes"]');
  els.resumeMenu = document.querySelector('[data-resume-menu]');
  els.resumeList = document.querySelector('[data-resume-list]');
  els.undoBtn = document.querySelector('[data-action="undo"]');
  els.redoBtn = document.querySelector('[data-action="redo"]');
  els.downloadBtn = document.querySelector('[data-action="download"]');
  els.downloadMenu = document.querySelector('[data-download-menu]');
  els.statusEl = document.querySelector('[data-save-status]');
  els.completionEl = document.querySelector('[data-completion]');
  els.completionValueEl = document.querySelector('[data-completion-value]');
  els.warnEl = document.querySelector('[data-template-warn]');
  els.panel = document.querySelector('[data-editor-panel]');
  els.nav = document.querySelector('[data-section-nav]');
  els.previewHost = document.querySelector('[data-preview-host]');
  els.toast = document.querySelector('[data-toast]');
  els.mobileToggle = document.querySelector('[data-mobile-toggle]');
  els.workspace = document.querySelector('[data-workspace]');
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return iso; }
}

function announce(text) {
  if (!text) return;
  document.dispatchEvent(new CustomEvent('kilab:announce', { detail: { text } }));
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

function draftKey() { return DRAFT_PREFIX + (state.resumeId || 'new'); }
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

function readPendingTemplateId() {
  const q = new URLSearchParams(window.location.search).get('template');
  if (q) return q;
  try { return localStorage.getItem(PENDING_TEMPLATE_KEY); } catch { return null; }
}

async function loadTemplates() {
  try {
    const res = await fetch('/api/templates', { headers: { Accept: 'application/json' } });
    const data = await res.json();
    (data.templates || []).forEach((t) => templatesById.set(t.id, t));
    if (els.templateSelect) {
      els.templateSelect.innerHTML = (data.templates || [])
        .map((t) => `<option value="${t.id}">${t.name} — ${t.category}</option>`)
        .join('');
    }
  } catch (err) {
    console.error('Failed to load templates:', err);
  }
}

function checkTemplateSupport() {
  if (!els.warnEl) return;
  const template = templatesById.get(state.resume.templateId);
  if (!template) { els.warnEl.hidden = true; return; }

  const supported = new Set(template.supportedSections || []);
  const visible = state.resume.sectionVisibility || {};
  const missing = [];

  for (const [key, on] of Object.entries(visible)) {
    if (!on) continue;
    if (key === 'contact') continue;
    if (!supported.has(key)) {
      const hasData = Array.isArray(state.resume[key])
        ? state.resume[key].some((e) => Object.values(e).some((v) => v && v !== e.id))
        : !!state.resume[key];
      if (hasData) missing.push(key);
    }
  }

  if (!missing.length) { els.warnEl.hidden = true; return; }

  const labels = getSectionLabels();
  els.warnEl.hidden = false;
  els.warnEl.textContent =
    `This template doesn't render: ${missing.map((k) => labels[k] || k).join(', ')}. ` +
    `Switch templates or hide those sections in Section visibility.`;
}

function computeCompletion() {
  const r = state.resume;
  const checks = [
    !!r.contact?.fullName,
    !!r.contact?.email,
    !!r.summary && r.summary.length >= 60,
    (r.experience || []).some((e) => e.jobTitle && e.employer),
    (r.education || []).some((e) => e.degree || e.institution),
    (r.skills || []).length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function renderCompletion() {
  if (!els.completionEl || !els.completionValueEl) return;
  const pct = computeCompletion();
  els.completionValueEl.textContent = `${pct}%`;
  els.completionEl.style.setProperty('--progress', `${pct}%`);
  els.completionEl.setAttribute('aria-label', `Resume completion: ${pct}%`);
}

// --- PHASE 11.1: pass supportedSections to renderer ---
function renderPreview() {
  if (!els.previewHost || !state.resume) return;

  const tpl = templatesById.get(state.resume.templateId);
  const supported = tpl ? tpl.supportedSections : null;

  renderResumePreview(els.previewHost, state.resume, state.resume.templateId, supported);

  const doc = els.previewHost.firstElementChild;
  if (doc && state.resume.theme) {
    if (state.resume.theme.accentColor) doc.style.setProperty('--doc-accent', state.resume.theme.accentColor);
    if (state.resume.theme.fontFamily) doc.style.setProperty('--doc-font', `'${state.resume.theme.fontFamily}', ui-sans-serif, system-ui, sans-serif`);
    if (state.resume.theme.fontSize) doc.style.setProperty('--doc-fs', `${state.resume.theme.fontSize}pt`);
    if (state.resume.theme.spacing) doc.style.setProperty('--doc-space', String(state.resume.theme.spacing));
  }
}

let saveTimer = null;
let historyCommitTimer = null;

function onResumeChanged() {
  renderPreview();
  renderCompletion();
  checkTemplateSupport();
  setStatus('Unsaved changes', 'dirty');
  state.isDirty = true;

  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveDraft();
    setStatus('Draft saved locally', 'ok');
  }, 1200);

  clearTimeout(historyCommitTimer);
  historyCommitTimer = setTimeout(() => {
    if (state.history) {
      state.history.push(state.resume);
      updateUndoRedoButtons();
    }
  }, 600);
}

function updateUndoRedoButtons() {
  if (!state.history) return;
  if (els.undoBtn) els.undoBtn.disabled = !state.history.canUndo();
  if (els.redoBtn) els.redoBtn.disabled = !state.history.canRedo();
}

function applyHistorySnapshot(snapshot) {
  if (!snapshot) return;
  state.resume = snapshot;
  if (els.title) els.title.value = state.resume.title || '';
  if (els.templateSelect) els.templateSelect.value = state.resume.templateId || 'modern-professional';
  document.dispatchEvent(new CustomEvent('resume:changed'));
  renderPreview();
  renderCompletion();
  checkTemplateSupport();
  updateUndoRedoButtons();
  setStatus('Reverted — unsaved changes', 'dirty');
  state.isDirty = true;
}

function undo() {
  if (!state.history) return;
  const s = state.history.undo();
  if (s) { applyHistorySnapshot(s); announce('Undone.'); }
}
function redo() {
  if (!state.history) return;
  const s = state.history.redo();
  if (s) { applyHistorySnapshot(s); announce('Redone.'); }
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

    const res = state.resumeId
      ? await apiFetch(`/api/resumes/${state.resumeId}`, { method: 'PATCH', body: JSON.stringify(payload) })
      : await apiFetch('/api/resumes', { method: 'POST', body: JSON.stringify(payload) });

    state.resumeId = res.resume.id;
    state.resume = { ...state.resume, id: res.resume.id };
    setActiveResumeId(state.resumeId);
    saveDraft();
    state.isDirty = false;
    setStatus('Saved', 'ok');
    toast('Resume saved', 'ok');
    announce('Resume saved.');
    updateDownloadMenuState();
  } catch (err) {
    console.error('Save failed:', err);
    setStatus('Save failed — draft kept locally', 'error');
    toast('Could not save to server. Your draft is safe locally.', 'error');
    announce('Save failed. Your draft is kept locally.');
  } finally {
    state.isSaving = false;
    if (els.saveBtn) els.saveBtn.disabled = false;
  }
}

async function handleDeleteCurrent() {
  if (!state.resumeId) { toast('Nothing to delete yet.', 'info'); return; }
  if (!confirm('Delete this saved resume? Your local draft will also be cleared.')) return;
  try {
    await deleteResumeById(state.resumeId);
    clearDraft();
    clearAllLocalDraftsFor(state.resumeId);
    setActiveResumeId(null);
    state.resumeId = null;
    toast('Resume deleted.', 'ok');
    announce('Resume deleted.');
    setStatus('Not saved', 'idle');
    updateDownloadMenuState();
  } catch (err) {
    console.error(err);
    toast('Delete failed: ' + err.message, 'error');
    announce('Delete failed.');
  }
}

async function refreshSavedResumes() {
  try { savedResumes = await listResumes(); }
  catch (err) { console.error('List resumes failed:', err); savedResumes = []; }
  renderResumeMenu();
}

function renderResumeMenu() {
  if (!els.resumeList) return;
  if (!savedResumes.length) {
    els.resumeList.innerHTML = '<li class="resume-menu__empty">No saved resumes yet.</li>';
    return;
  }
  els.resumeList.innerHTML = savedResumes.map((r) => `
    <li class="resume-menu__item${r.id === state.resumeId ? ' resume-menu__item--active' : ''}" data-id="${r.id}">
      <div class="resume-menu__title">${escapeHtml(r.title || 'Untitled Resume')}</div>
      <div class="resume-menu__meta">Updated ${formatDate(r.updatedAt)}</div>
      <div class="resume-menu__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-act="open">Open</button>
        <button type="button" class="btn btn--ghost btn--sm" data-act="dup">Duplicate</button>
        <button type="button" class="btn btn--ghost btn--sm" data-act="del">Delete</button>
      </div>
    </li>
  `).join('');
}

async function handleResumeMenuClick(e) {
  const item = e.target.closest('[data-id]');
  if (!item) return;
  const id = item.dataset.id;
  const act = e.target.dataset.act;
  if (!act) return;

  if (act === 'open') {
    if (!confirm('Open this resume? Unsaved changes to the current one will be lost.')) return;
    try {
      const data = await apiFetch(`/api/resumes/${id}`);
      state.resumeId = id;
      state.resume = normalizeResume(data.resume);
      setActiveResumeId(id);
      state.history = createHistory(state.resume);
      if (els.title) els.title.value = state.resume.title;
      if (els.templateSelect) els.templateSelect.value = state.resume.templateId;
      initEditor({ state, panelEl: els.panel, navEl: els.nav, onChange: onResumeChanged });
      renderPreview();
      renderCompletion();
      checkTemplateSupport();
      updateUndoRedoButtons();
      setStatus('Loaded', 'ok');
      hideResumeMenu();
      updateDownloadMenuState();
      announce('Resume loaded.');
    } catch (err) {
      toast('Open failed: ' + err.message, 'error');
    }
  } else if (act === 'dup') {
    try {
      const copy = await duplicateResume(id);
      toast('Duplicated: ' + copy.title, 'ok');
      announce('Resume duplicated.');
      await refreshSavedResumes();
    } catch (err) { toast('Duplicate failed: ' + err.message, 'error'); }
  } else if (act === 'del') {
    if (!confirm('Delete this saved resume?')) return;
    try {
      await deleteResumeById(id);
      if (id === state.resumeId) { state.resumeId = null; setActiveResumeId(null); updateDownloadMenuState(); }
      toast('Deleted.', 'ok');
      announce('Resume deleted.');
      await refreshSavedResumes();
    } catch (err) { toast('Delete failed: ' + err.message, 'error'); }
  }
}

function toggleResumeMenu() {
  if (!els.resumeMenu) return;
  if (!els.resumeMenu.hidden) { hideResumeMenu(); return; }
  els.resumeMenu.hidden = false;
  refreshSavedResumes();
}
function hideResumeMenu() { if (els.resumeMenu) els.resumeMenu.hidden = true; }

function updateDownloadMenuState() {
  if (!els.downloadMenu) return;
  const docxBtn = els.downloadMenu.querySelector('[data-export="docx"]');
  if (docxBtn) {
    const canDocx = !!state.resumeId;
    docxBtn.disabled = !canDocx;
    docxBtn.title = canDocx ? 'Download as DOCX' : 'Save the resume first to enable DOCX';
  }
}

function toggleDownloadMenu() {
  if (!els.downloadMenu) return;
  if (!els.downloadMenu.hidden) { hideDownloadMenu(); return; }
  updateDownloadMenuState();
  els.downloadMenu.hidden = false;
}
function hideDownloadMenu() { if (els.downloadMenu) els.downloadMenu.hidden = true; }

async function handleDownloadClick(e) {
  const btn = e.target.closest('[data-export]');
  if (!btn) return;
  const kind = btn.dataset.export;
  if (state.isExporting) return;

  state.isExporting = true;
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = kind === 'pdf' ? 'Preparing PDF…' : 'Preparing DOCX…';

  try {
    if (kind === 'pdf') {
      await exportPdf(state.resume);
      toast('Print dialog opened — choose "Save as PDF".', 'info');
      announce('Print dialog opened. Choose Save as PDF.');
    } else if (kind === 'docx') {
      await exportDocx(state.resumeId);
      toast('DOCX download started.', 'ok');
      announce('DOCX download started.');
    }
    hideDownloadMenu();
  } catch (err) {
    console.error('Export failed:', err);
    toast('Export failed: ' + err.message, 'error');
    announce('Export failed. ' + err.message);
  } finally {
    state.isExporting = false;
    btn.disabled = false;
    btn.textContent = original;
    updateDownloadMenuState();
  }
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

async function init() {
  cacheEls();
  await loadTemplates();

  const pendingTpl = readPendingTemplateId();
  const activeId = getActiveResumeId();

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
  state.history = createHistory(state.resume);

  if (els.title) {
    els.title.value = state.resume.title || 'Untitled Resume';
    els.title.addEventListener('input', (e) => {
      state.resume.title = e.target.value.slice(0, 200);
      onResumeChanged();
    });
  }

  if (els.templateSelect) {
    if (state.resume.templateId) els.templateSelect.value = state.resume.templateId;
    els.templateSelect.addEventListener('change', (e) => {
      state.resume.templateId = e.target.value;
      renderPreview();
      checkTemplateSupport();
      onResumeChanged();
    });
  }

  if (els.saveBtn) els.saveBtn.addEventListener('click', manualSave);
  if (els.deleteBtn) els.deleteBtn.addEventListener('click', handleDeleteCurrent);
  if (els.resumeBtn) els.resumeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleResumeMenu(); });
  if (els.resumeList) els.resumeList.addEventListener('click', handleResumeMenuClick);
  if (els.undoBtn) els.undoBtn.addEventListener('click', undo);
  if (els.redoBtn) els.redoBtn.addEventListener('click', redo);
  if (els.downloadBtn) els.downloadBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleDownloadMenu(); });
  if (els.downloadMenu) els.downloadMenu.addEventListener('click', handleDownloadClick);

  document.addEventListener('click', (e) => {
    if (els.resumeMenu && !els.resumeMenu.hidden &&
        !els.resumeMenu.contains(e.target) && e.target !== els.resumeBtn) {
      hideResumeMenu();
    }
    if (els.downloadMenu && !els.downloadMenu.hidden &&
        !els.downloadMenu.contains(e.target) && e.target !== els.downloadBtn) {
      hideDownloadMenu();
    }
  });

  if (els.mobileToggle) {
    els.mobileToggle.addEventListener('click', () => {
      els.workspace.classList.toggle('workspace--show-preview');
    });
  }

  initEditor({ state, panelEl: els.panel, navEl: els.nav, onChange: onResumeChanged });

  renderPreview();
  renderCompletion();
  checkTemplateSupport();
  updateUndoRedoButtons();
  updateDownloadMenuState();

  window.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); manualSave(); }
    else if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    else if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); redo(); }
    else if (e.key === 'Escape') {
      if (els.resumeMenu && !els.resumeMenu.hidden) hideResumeMenu();
      if (els.downloadMenu && !els.downloadMenu.hidden) hideDownloadMenu();
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.isDirty) { e.preventDefault(); e.returnValue = ''; }
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