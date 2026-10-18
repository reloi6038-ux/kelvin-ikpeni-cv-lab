'use strict';

// -----------------------------------------------------------------------------
// Kelvin Ikpeni CV Lab — Express application.
// Phase 2 responsibilities:
//   - Load env, connect to MongoDB (with retry)
//   - Security middleware (helmet, cors, sanitize, rate limits)
//   - Serve static HTML pages from public/pages/
//   - REST API at /api/templates and /api/resumes
//   - Graceful shutdown (close HTTP server, then DB)
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

// Render (and most PaaS) put the real client IP in X-Forwarded-For.
// trust proxy must be set so express-rate-limit keys correctly.
app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(compression());
app.use(
  helmet({
    // Full CSP is enabled in Phase 9 once inline scripts are removed from HTML.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
);
app.use(morgan(env.isProd ? 'combined' : 'dev'));

// CORS — allow the configured origins only. Same-origin requests are
// unaffected by this middleware.
app.use(
  cors({
    origin(origin, cb) {
      // Allow non-browser clients (curl, tests) that send no Origin.
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

// Static assets
app.use(
  '/static',
  express.static(PUBLIC_DIR, {
    maxAge: env.isProd ? '7d' : 0,
    fallthrough: true,
    index: false,
  })
);

// Health check — includes DB status.
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

// API routes
app.use('/api/templates', templatesRouter);
app.use('/api/resumes', resumesRouter);

// HTML page helper
function sendPage(filename, { cache = 'public, max-age=300, must-revalidate' } = {}) {
  const filePath = path.join(PAGES_DIR, filename);
  return (req, res, next) => {
    res.set('Cache-Control', cache);
    res.sendFile(filePath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') return next();
        return next(err);
      }
    });
  };
}

// Public pages
app.get('/', sendPage('home.html'));
app.get('/templates', sendPage('templates.html'));
app.get('/builder', sendPage('builder.html'));
app.get('/help', sendPage('help.html'));
app.get('/privacy', sendPage('privacy.html'));
app.get('/terms', sendPage('terms.html'));

// 404 + errors (order matters: after all routes)
app.use(notFound);
app.use(errorHandler);

// Startup ---------------------------------------------------------------
async function start() {
  try {
    await db.connect();
    // Ensure indexes are synced (safe on an existing DB; creates missing ones).
    try {
      await db.mongoose.syncIndexes();
    } catch (idxErr) {
      // eslint-disable-next-line no-console
      console.warn('[db] syncIndexes warning:', idxErr.message);
    }
    const port = env.PORT;
    const server = app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`[kelvin-ikpeni-cv-lab] http://localhost:${port} (env=${env.NODE_ENV})`);
    });

    const shutdown = async (sig) => {
      // eslint-disable-next-line no-console
      console.log(`[kelvin-ikpeni-cv-lab] ${sig} received, closing…`);
      server.close(async () => {
        try { await db.disconnect(); } finally { process.exit(0); }
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[kelvin-ikpeni-cv-lab] failed to start:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start };