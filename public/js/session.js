// Anonymous session management + API helper.
//
// The browser generates a 64-char hex token on first use and stores it in
// localStorage. Every API call includes it as X-Session-Token. The server
// HMACs the token before storing, so the raw token is never persisted.
//
// This is NOT authentication. It is an unguessable capability that grants
// access only to the resumes created with it in this browser.

const SESSION_KEY = 'kilab.session';

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getSessionToken() {
  try {
    let t = localStorage.getItem(SESSION_KEY);
    if (!t || !/^[a-f0-9]{64}$/.test(t)) {
      t = generateToken();
      localStorage.setItem(SESSION_KEY, t);
    }
    return t;
  } catch {
    // localStorage blocked (private mode with strict settings). Fall back to
    // an in-memory token for this page session — the user can still edit and
    // download, but saving across reloads won't work.
    if (!getSessionToken._mem) getSessionToken._mem = generateToken();
    return getSessionToken._mem;
  }
}

export async function apiFetch(path, options = {}) {
  const token = getSessionToken();
  const headers = new Headers(options.headers || {});
  headers.set('X-Session-Token', token);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  const res = await fetch(path, { ...options, headers });
  let payload = null;
  const ctype = res.headers.get('content-type') || '';
  if (ctype.includes('application/json')) {
    try { payload = await res.json(); } catch { /* ignore */ }
  }
  if (!res.ok) {
    const err = new Error((payload && payload.error && payload.error.message) || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = payload && payload.error ? payload.error.code : 'HTTP_ERROR';
    err.payload = payload;
    throw err;
  }
  return payload;
}