// Shared site chrome (header + footer) + accessibility enhancements.
// - Injects a skip link, header, footer, and #kilab-live live region.
// - Marks the active nav link.
// - Wires theme toggle and mobile menu.
// - Moves focus to the page <h1> on load (unless URL has a hash).
// - Listens for 'kilab:announce' to read messages to screen readers.

(function () {
  'use strict';

  const NAV_ITEMS = [
    { href: '/',          label: 'Home' },
    { href: '/templates', label: 'Templates' },
    { href: '/builder',   label: 'Builder' },
    { href: '/help',      label: 'Help' },
  ];

  const BRAND = { name: 'Kelvin Ikpeni', suffix: 'CV Lab' };

  function svgMoon() {
    return '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
  function svgSun() {
    return '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  }
  function svgMenu() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>';
  }

  function buildHeader() {
    const path = window.location.pathname;
    const links = NAV_ITEMS.map((item) => {
      const active = path === item.href || (item.href !== '/' && path.startsWith(item.href));
      return `<a href="${item.href}"${active ? ' aria-current="page"' : ''}>${item.label}</a>`;
    }).join('');

    return `
<header class="site-header" role="banner">
  <div class="container site-header__inner">
    <a class="brand" href="/" aria-label="Kelvin Ikpeni CV Lab home">
      <span class="brand__mark" aria-hidden="true">K</span>
      <span class="brand__name"><strong>${BRAND.name}</strong>&nbsp;${BRAND.suffix}</span>
    </a>
    <nav class="nav" id="primary-nav" aria-label="Primary">
      ${links}
    </nav>
    <div class="header__actions">
      <button class="theme-toggle" type="button" id="theme-toggle" aria-label="Toggle dark mode" aria-pressed="false">
        ${svgMoon()}
        ${svgSun()}
      </button>
      <a class="btn btn--primary" href="/builder">Create a resume</a>
      <button class="menu-toggle" type="button" id="menu-toggle" aria-label="Open menu" aria-controls="primary-nav" aria-expanded="false">
        ${svgMenu()}
      </button>
    </div>
  </div>
</header>`;
  }

  function buildFooter() {
    const year = new Date().getFullYear();
    return `
<footer class="site-footer" role="contentinfo">
  <div class="container">
    <div class="footer__grid">
      <div class="footer__brand">
        <a class="brand" href="/">
          <span class="brand__mark" aria-hidden="true">K</span>
          <span class="brand__name"><strong>${BRAND.name}</strong>&nbsp;${BRAND.suffix}</span>
        </a>
        <p>A premium, privacy-conscious resume and CV builder. Create, customize, and download professional documents without creating an account.</p>
      </div>
      <div class="footer__col">
        <h4>Product</h4>
        <ul>
          <li><a href="/templates">Templates</a></li>
          <li><a href="/builder">Builder</a></li>
          <li><a href="/help">Help</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <h4>Legal</h4>
        <ul>
          <li><a href="/privacy">Privacy</a></li>
          <li><a href="/terms">Terms</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <h4>About</h4>
        <ul>
          <li><span style="color:var(--color-muted)">No signup required</span></li>
          <li><span style="color:var(--color-muted)">PDF &amp; DOCX downloads</span></li>
          <li><span style="color:var(--color-muted)">Anonymous storage</span></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <span>&copy; ${year} Kelvin Ikpeni CV Lab. All rights reserved.</span>
      <span>Built for clarity, speed, and privacy.</span>
    </div>
  </div>
</footer>`;
  }

  function injectLayout() {
    const body = document.body;
    if (!body) return;

    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#main';
    skip.textContent = 'Skip to content';
    body.insertBefore(skip, body.firstChild);

    body.insertAdjacentHTML('afterbegin', buildHeader());
    body.insertAdjacentHTML('beforeend', buildFooter());

    const main = document.querySelector('main');
    if (main && !main.id) main.id = 'main';

    if (!document.getElementById('kilab-live')) {
      const live = document.createElement('div');
      live.id = 'kilab-live';
      live.className = 'sr-only';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      body.appendChild(live);
      document.addEventListener('kilab:announce', (e) => {
        const t = e && e.detail && e.detail.text;
        if (!t) return;
        live.textContent = '';
        setTimeout(() => { live.textContent = t; }, 50);
      });
    }
  }

  const THEME_KEY = 'kilab.theme';
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }
  function initTheme() {
    let stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(stored || (prefersDark ? 'dark' : 'light'));
  }
  function wireThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
    });
  }
  function wireMenuToggle() {
    const btn = document.getElementById('menu-toggle');
    const nav = document.getElementById('primary-nav');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => {
      const isOpen = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', String(!isOpen));
      btn.setAttribute('aria-expanded', String(!isOpen));
      btn.setAttribute('aria-label', !isOpen ? 'Close menu' : 'Open menu');
    });
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        nav.setAttribute('data-open', 'false');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function focusHeading() {
    if (window.location.hash) return;
    const h1 = document.querySelector('main h1, main .section__header h1, h1');
    if (!h1) return;
    if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
    try { h1.focus({ preventScroll: true }); } catch { /* ignore */ }
  }

  initTheme();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectLayout();
      wireThemeToggle();
      wireMenuToggle();
      focusHeading();
    });
  } else {
    injectLayout();
    wireThemeToggle();
    wireMenuToggle();
    focusHeading();
  }
})();