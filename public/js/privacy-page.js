// Client logic for the privacy page's "delete my data" control.
//
// Steps:
//   1. Confirm with the user (native confirm dialog — a modal is nicer but
//      the semantics are identical).
//   2. Call DELETE /api/resumes — server soft-deletes every resume for this
//      token.
//   3. Clear every kilab.* localStorage key.
//   4. Rotate the session token so nothing can correlate past activity with
//      future activity from this browser.
//   5. Update the page with the outcome (count, timestamp).

import { apiFetch, clearAllLocalKilabKeys, rotateSessionToken } from './session.js';

export function wireDeleteMyData() {
  const btn = document.querySelector('[data-action="delete-my-data"]');
  const status = document.querySelector('[data-delete-status]');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    const ok = confirm(
      'Delete all resume data saved by this browser?\n\n' +
      'This will remove every resume associated with this browser\'s anonymous ' +
      'session token, clear all local drafts, and issue a new session token. ' +
      'It cannot be undone.'
    );
    if (!ok) return;

    btn.disabled = true;
    btn.textContent = 'Deleting…';
    if (status) { status.hidden = true; status.textContent = ''; }

    let serverCount = 0;
    let serverErr = null;
    try {
      const res = await apiFetch('/api/resumes', { method: 'DELETE' });
      serverCount = res.deletedCount || 0;
    } catch (err) {
      serverErr = err;
    }

    // Local cleanup runs regardless of server outcome so the user is never
    // left with data on this device after requesting deletion.
    clearAllLocalKilabKeys();
    rotateSessionToken();

    btn.disabled = false;
    btn.textContent = 'Delete my data';

    if (!status) return;
    status.hidden = false;
    if (serverErr) {
      status.textContent =
        `Local data cleared. Server deletion failed (${serverErr.message}). ` +
        `Your server copy will expire under the operator's retention policy.`;
      status.dataset.kind = 'warn';
    } else {
      status.textContent =
        `Done. Deleted ${serverCount} resume${serverCount === 1 ? '' : 's'} on the server ` +
        `and cleared all local drafts. A new anonymous session was issued.`;
      status.dataset.kind = 'ok';
    }
  });
}