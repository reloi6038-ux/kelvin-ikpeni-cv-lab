// Manages saved resumes for the current anonymous session.
// The active resume is tracked via kilab.activeResumeId in localStorage.

import { apiFetch } from './session.js';

const ACTIVE_KEY = 'kilab.activeResumeId';

export async function listResumes() {
  const data = await apiFetch('/api/resumes');
  return data.resumes || [];
}

export async function duplicateResume(id) {
  const data = await apiFetch(`/api/resumes/${id}/duplicate`, { method: 'POST' });
  return data.resume;
}

export async function renameResume(id, newTitle) {
  const data = await apiFetch(`/api/resumes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: newTitle }),
  });
  return data.resume;
}

export async function deleteResume(id) {
  await apiFetch(`/api/resumes/${id}`, { method: 'DELETE' });
}

export function getActiveResumeId() {
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

export function setActiveResumeId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch { /* ignore */ }
}

export function clearAllLocalDraftsFor(id) {
  try { localStorage.removeItem('kilab.draft.' + id); } catch { /* ignore */ }
}