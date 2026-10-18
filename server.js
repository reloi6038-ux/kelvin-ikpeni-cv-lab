'use strict';

// -----------------------------------------------------------------------------
// Kelvin Ikpeni CV Lab — Express application.
// Phase 9: real CSP, robots.txt, sitemap.xml, noindex on /builder, cache headers.
// -----------------------------------------------------------------------------

const path = require('path');
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');

const env = require('./config/env');
const db = require('./config/db');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const templatesRouter = require('./routes/api/templates');
const resumesRouter = require('./routes/api/resumes');

const app = express();
const PUBLIC_DIR = path.join(__dirname, 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(compression());

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'"],
        'frame-src': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'self'"],
        'upgrade-insecure-requests': [],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (env.ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Session-Token'],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(mongoSanitize({ replaceWith: '_' }));

app.use(
  '/static',
  express.static(PUBLIC_DIR, {
    maxAge: env.isProd ? '365d' : 0,
    immutable: env.isProd,
    fallthrough: true,
    index: false,
  })
);

app.get('/healthz', (_req, res) => {
  const dbOk = db.isHealthy();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'kelvin-ikpeni-cv-lab',
    env: env.NODE_ENV,
    db: dbOk ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /$',
      'Allow: /templates',
      'Allow: /help',
      'Allow: /privacy',
      'Allow: /terms',
      'Allow: /static/',
      'Disallow: /builder',
      'Disallow: /api/',
      '',
      'Sitemap: /sitemap.xml',
      '',
    ].join('\n')
  );
});

function publicOrigin(req) {
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host');
  return `${proto}://${host}`;
}

app.get('/sitemap.xml', (req, res) => {
  const origin = publicOrigin(req);
  const pages = [
    { path: '/',          changefreq: 'weekly',  priority: '1.0' },
    { path: '/templates', changefreq: 'weekly',  priority: '0.9' },
    { path: '/help',      changefreq: 'monthly', priority: '0.6' },
    { path: '/privacy',   changefreq: 'yearly',  priority: '0.3' },
    { path: '/terms',     changefreq: 'yearly',  priority: '0.3' },
  ];
  const urls = pages.map((p) => `
    <url>
      <loc>${origin}${p.path}</loc>
      <changefreq>${p.changefreq}</changefreq>
      <priority>${p.priority}</priority>
    </url>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;
  res.type('application/xml').send(xml);
});

app.use('/api/templates', templatesRouter);
app.use('/api/resumes', resumesRouter);

function sendPage(filename, { cache = 'public, max-age=300, must-revalidate', extraHeaders = {} } = {}) {
  const filePath = path.join(PAGES_DIR, filename);
  return (req, res, next) => {
    res.set('Cache-Control', cache);
    for (const [h, v] of Object.entries(extraHeaders)) res.set(h, v);
    res.sendFile(filePath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') return next();
        return next(err);
      }
    });
  };
}

app.get('/', sendPage('home.html'));
app.get('/templates', sendPage('templates.html'));
app.get('/help', sendPage('help.html'));
app.get('/privacy', sendPage('privacy.html'));
app.get('/terms', sendPage('terms.html'));

app.get(
  '/builder',
  sendPage('builder.html', {
    cache: 'no-store',
    extraHeaders: { 'X-Robots-Tag': 'noindex, nofollow' },
  })
);

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await db.connect();
    try { await db.mongoose.syncIndexes(); }
    catch (idxErr) { console.warn('[db] syncIndexes warning:', idxErr.message); }

    const port = env.PORT;
    const server = app.listen(port, () => {
      console.log(`[kelvin-ikpeni-cv-lab] http://localhost:${port} (env=${env.NODE_ENV})`);
    });

    const shutdown = async (sig) => {
      console.log(`[kelvin-ikpeni-cv-lab] ${sig} received, closing…`);
      server.close(async () => {
        try { await db.disconnect(); } finally { process.exit(0); }
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[kelvin-ikpeni-cv-lab] failed to start:', err.message);
    process.exit(1);
  }
}

if (require.main === module) start();

module.exports = { app, start };