# AGENTS.md — WhereMarketsFail

## Project Overview
WhereMarketsFail is a live Metaculus prediction market blind spot 
detection system. It audits crowd forecasting accuracy, detects 
overconfidence patterns, and exposes a public API + web app 
showing which open questions the crowd is probably wrong about.

## Repository Structure
wheremarketsfail/
├── pipeline/           # Python data ingestion + calibration
│   ├── ingest.py       # Metaculus API → MongoDB
│   ├── calibrate.py    # Brier scoring + calibration curves
│   ├── redflag.py      # Red flag scorer for open questions
│   └── analogs.py      # Historical analog matcher
├── api/                # Express/TypeScript REST API
│   ├── src/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/           # Next.js 14 app
│   ├── app/
│   ├── components/
│   └── package.json
├── .github/
│   └── workflows/
│       ├── ingest.yml
│       └── deploy.yml
├── .do/
│   └── app.yaml
└── requirements.txt
## Stack
- Python 3.11 (pipeline)
- Motor 3.x (async MongoDB driver)
- MongoDB Atlas M10 (database)
- Express 4 + TypeScript (API, DigitalOcean App Platform)
- Next.js 14 App Router (frontend, Vercel)
- GitHub Actions (CI/CD + cron ingestion)

## Secrets (available as env vars)
- MONGODB_URI
- METACULUS_TOKEN
- OPENROUTER_API_KEY
- NEXT_PUBLIC_API_URL

## Working Agreements
- Run `npm test` after modifying any TypeScript files
- Run `pytest pipeline/` after modifying any Python files
- All DB writes must be upserts — pipelines must be idempotent
- Never commit secrets or .env files
- All API responses must include meta: { computed_at, version }
- Type hints required on all Python functions
- Zod validation required on all API request bodies
- Every new route needs an integration test

## Commands
- Start API dev: `cd api && npm run dev`
- Start frontend dev: `cd frontend && npm run dev`  
- Run pipeline: `python pipeline/ingest.py`
- Run tests: `cd api && npm test`
- Lint Python: `ruff pipeline/`
- Type check API: `cd api && npx tsc
