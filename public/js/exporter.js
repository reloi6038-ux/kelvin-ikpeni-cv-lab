// Client-side PDF + DOCX export.
//
// PDF: renders the resume into a hidden iframe using the same
// renderResumePreview function as the live preview, waits for fonts + images,
// then calls iframe.contentWindow.print(). The browser's "Save as PDF" dialog
// produces a pixel-accurate, multi-page PDF.
//
// DOCX: POSTs to /api/resumes/:id/export/docx and triggers a blob download.
// Both require the resume to be saved (have an id); the caller must guard.

import { renderResumePreview } from './template-samples.js';
import { apiFetch } from './session.js';

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

export function exportPdf(resume, { filenameBase = 'Resume' } = {}) {
  return new Promise((resolve, reject) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.title = 'Resume print';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(buildPrintHtml());
      doc.close();

      const host = doc.querySelector('[data-print-host]');
      renderResumePreview(host, resume, resume.templateId);
      applyThemeVars(host, resume);

      // Wait for fonts, images, and layout to settle, then print.
      waitForReady(iframe).then(() => {
        const w = iframe.contentWindow;
        // Some browsers fire print synchronously; wait one frame.
        setTimeout(() => {
          try {
            w.focus();
            w.print();
          } catch (err) {
            cleanup();
            reject(err);
            return;
          }
          // Give the print dialog time to grab the content, then clean up.
          setTimeout(() => {
            cleanup();
            resolve({ filenameBase });
          }, 30000);
        }, 100);
      }).catch((err) => {
        cleanup();
        reject(err);
      });

      function cleanup() {
        try { iframe.remove(); } catch { /* ignore */ }
      }
    } catch (err) {
      reject(err);
    }
  });
}

function applyThemeVars(host, resume) {
  const doc = host.firstElementChild;
  if (!doc || !resume.theme) return;
  if (resume.theme.accentColor) doc.style.setProperty('--doc-accent', resume.theme.accentColor);
  if (resume.theme.fontFamily) doc.style.setProperty('--doc-font', `'${resume.theme.fontFamily}', ui-sans-serif, system-ui, sans-serif`);
  if (resume.theme.fontSize) doc.style.setProperty('--doc-fs', `${resume.theme.fontSize}pt`);
  if (resume.theme.spacing) doc.style.setProperty('--doc-space', String(resume.theme.spacing));
}

function waitForReady(iframe) {
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  const fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
  const images = Array.from(doc.images || []).filter((img) => !img.complete);
  const imagesReady = Promise.all(images.map((img) => new Promise((res) => {
    img.addEventListener('load', res, { once: true });
    img.addEventListener('error', res, { once: true });
    // Cap the wait so a slow image host doesn't hang the dialog.
    setTimeout(res, 4000);
  })));
  return Promise.all([fontsReady, imagesReady]);
}

function buildPrintHtml() {
  const origin = window.location.origin;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Resume</title>
  <link rel="stylesheet" href="${origin}/static/css/main.css" />
  <link rel="stylesheet" href="${origin}/static/templates/preview.css" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" />
  <style>
    /* Print tuning */
    @page { size: A4; margin: 0; }
    html, body { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
    body > * { box-shadow: none !important; }
    [data-print-host] { padding: 0; }
    .doc {
      box-shadow: none !important;
      margin: 0 !important;
      width: 210mm !important;
      max-width: 210mm !important;
      min-height: 297mm !important;
    }
    /* Hide the site header/footer chrome if the shared.js ever injects here;
       harmless in the current build since only the doc is injected. */
    .site-header, .site-footer, .skip-link { display: none !important; }
    /* Prevent orphan section headings at page breaks */
    .doc-h2 { break-after: avoid; page-break-after: avoid; }
    .doc-entry { break-inside: avoid; page-break-inside: avoid; }
    .doc-bullets li { break-inside: avoid; }
  </style>
</head>
<body>
  <div data-print-host></div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------

export async function exportDocx(resumeId) {
  if (!resumeId) throw new Error('Save the resume first to download a DOCX.');
  const res = await fetch(`/api/resumes/${resumeId}/export/docx`, {
    method: 'POST',
    headers: {
      'X-Session-Token': (await import('./session.js')).getSessionToken(),
      Accept: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const payload = await res.json();
      if (payload && payload.error) message = payload.error.message || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  const filename = extractFilename(res.headers.get('Content-Disposition')) || 'Resume.docx';
  const blob = await res.blob();
  triggerDownload(blob, filename);
  return { filename };
}

function extractFilename(disposition) {
  if (!disposition) return null;
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return m ? decodeURIComponent(m[1]) : null;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    try { a.remove(); } catch { /* ignore */ }
  }, 1000);
}