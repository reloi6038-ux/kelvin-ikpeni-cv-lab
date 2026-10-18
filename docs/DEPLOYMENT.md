# Deployment — Kelvin Ikpeni CV Lab

## Live URL
https://kelvin-ikpeni-cv-lab.onrender.com

## Platform
Render Web Service (Free tier). Single service serves HTML, static assets, and API.

## Build & start
- Build: `npm ci`
- Start: `npm start`
- Health: `/healthz` (returns 200 only when MongoDB is connected)

## Required environment variables
| Key | Notes |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas connection string with password |
| `SESSION_PEPPER` | 96-char hex, secret, not committed |
| `ALLOWED_ORIGINS` | `https://kelvin-ikpeni-cv-lab.onrender.com` |

## Free tier limitations (accepted)
- Spins down after 15 min idle; cold start ~1 min [citation:4][citation:11]
- 512 MB RAM / 0.1 CPU
- Ephemeral filesystem — do not rely on local disk for uploads
- 750 instance hours / month [citation:11]

## Rollback
Dashboard → Deploys → find last good deploy → Redeploy.