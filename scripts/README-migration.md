# PeopleForce → PeopleRecruit migration

Autonomous one-off import of vacancies/jobs and candidates (with CV files) from PeopleForce API v3 into this app’s Prisma DB + Supabase Storage.

**Do not run against production until you intentionally set real credentials and remove `--dry-run`.**

## Prerequisites

1. `.env` in the repo root with at least:
   - `PEOPLEFORCE_API_KEY` — PeopleForce public API key (`X-API-KEY`)
   - `DATABASE_URL` / `DIRECT_URL` — target Postgres
   - `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — for CV upload (falls back to local `storage/uploads` if unset)
   - Optional: `SUPABASE_BUCKET_CANDIDATE_DOCS` (default `candidate-documents`)
   - Optional: `PEOPLEFORCE_API_BASE` (default `https://app.peopleforce.io/api/public/v3`)

2. Dependencies installed (`npm install`) and Prisma client generated.

## Commands

Dry run (no creates; logs what would happen), first 10 candidates:

```bash
npx tsx --env-file=.env scripts/migrate-peopleforce.ts --dry-run --limit=10
```

Full migration:

```bash
npx tsx --env-file=.env scripts/migrate-peopleforce.ts
```

## Behaviour

- Fetches vacancies + pipelines, then paginates `GET /recruitment/candidates` with **250ms** delay between pages/detail calls.
- Upserts by **email** (case-insensitive), else by **name** — re-runs do not create duplicates.
- For each candidate with `resume_url` / `resume.url`: downloads the CV (API key header), uploads to the candidate-documents bucket, writes `CandidateDocument` + durable `resumeLink`.
- Progress is logged to stdout; failures append to **`migration-errors.json`** in the repo root (gitignored if you add it locally).

## Safety

- Missing `PEOPLEFORCE_API_KEY` → script exits immediately (no API / DB writes).
- Prefer `--dry-run --limit=10` first on a staging DB.
