# Kelvin Ikpeni CV Lab

A production-ready, anonymous-access resume & CV builder.
Node.js · Express · MongoDB · Static HTML · Vanilla JS.

## Local development
1. Copy `.env.example` → `.env` and fill values.
2. `npm install`
3. `npm run dev` → http://localhost:3000

## Health check
`GET /healthz` → `{ "status": "ok" }`

## Structure
- `server.js` — Express app, static HTML routing, error handling.
- `public/pages/` — static HTML pages served by Express.
- `public/css/`, `public/js/`, `public/img/` — static assets under `/static/*`.
- `config/env.js` — env loader & validation.

## Deployment
See `docs/DEPLOYMENT.md`.