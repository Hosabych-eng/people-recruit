# PeopleRecruit

Modern applicant tracking system (ATS) MVP — a recruiting module inspired by PeopleForce PeopleRecruit.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4, TypeScript |
| Backend | Next.js API Routes (unified monolith) |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Drag & Drop | @dnd-kit (Step 3) |
| Infrastructure | Docker Compose |

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Application structure | Next.js monolith (App Router + API routes) | Faster MVP delivery, single deploy unit, shared types between frontend and backend |
| Database | PostgreSQL | Relational integrity for jobs, stages, and candidates; enterprise-grade for HRIS |
| ORM | Prisma | Type-safe queries, migrations, seeding, excellent DX with TypeScript |
| Stage scoping | Per-job pipeline stages | Mirrors real ATS behavior; each requisition can have its own funnel |
| Stage ordering | `orderInPipeline` integer column | Simple, indexable ordering for Kanban columns |
| Candidate–Stage link | Foreign key with `Restrict` on delete | Prevents orphaned candidates when a stage is removed |
| Job–Stage link | Cascade delete | Removing a job cleans up its pipeline |
| Drag & drop library | `@dnd-kit` over `react-beautiful-dnd` | Actively maintained, accessible, works with React 19 |
| Local DB | Docker Compose | Consistent dev environment, no local PostgreSQL install required |
| ID strategy | CUID | URL-safe, sortable, no UUID collision concerns in distributed systems |

## Data Model

```
Job (1) ──< Stage (many) ──< Candidate (many)
  │
  └──< Candidate (many)
```

| Model | Key Fields | Notes |
|-------|------------|-------|
| **Job** | `title`, `description`, `status` (DRAFT/OPEN/CLOSED) | Top-level requisition |
| **Stage** | `name`, `orderInPipeline`, `jobId` | Kanban column, scoped to a job |
| **Candidate** | `name`, `email`, `phone`, `resumeLink`, `stageId`, `jobId` | Applicant card in pipeline |

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm

## Quick Start

### 1. Install dependencies

```bash
cd people-recruit
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Push schema & seed data

```bash
npm run db:push
npm run db:seed
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema to database (dev) |
| `npm run db:migrate` | Create & apply migration (prod-ready) |
| `npm run db:seed` | Seed sample jobs, stages, candidates |
| `npm run db:studio` | Open Prisma Studio GUI |
| `docker compose up -d` | Start PostgreSQL |
| `docker compose down` | Stop PostgreSQL |
| `docker compose down -v` | Stop and wipe database volume |

## Project Structure

```
people-recruit/
├── docker-compose.yml
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── api/                  # REST API routes
│   │   │   ├── jobs/
│   │   │   ├── candidates/
│   │   │   └── stages/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Pipeline Kanban view
│   │   └── globals.css
│   ├── components/
│   │   ├── candidate/            # Detail panel
│   │   ├── kanban/               # Board, columns, cards
│   │   ├── layout/               # Header, job selector
│   │   ├── pipeline/             # Main view orchestrator
│   │   └── ui/                   # Shared UI primitives
│   ├── lib/
│   │   ├── api/                  # Response helpers, validation, client
│   │   ├── pipeline-utils.ts     # DnD + optimistic update helpers
│   │   ├── prisma.ts
│   │   └── constants.ts
│   └── types/
│       └── index.ts
└── package.json
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/jobs` | List all jobs (with candidate/stage counts) |
| `POST` | `/api/jobs` | Create job + default pipeline stages |
| `GET` | `/api/jobs/:id` | Get job with stages |
| `PATCH` | `/api/jobs/:id` | Update job fields |
| `DELETE` | `/api/jobs/:id` | Delete job (cascades stages & candidates) |
| `GET` | `/api/jobs/:id/pipeline` | Full Kanban payload: job → stages → candidates |
| `GET` | `/api/candidates?jobId=` | List candidates (optional job filter) |
| `POST` | `/api/candidates` | Create candidate in a stage |
| `GET` | `/api/candidates/:id` | Get candidate with stage & job |
| `PATCH` | `/api/candidates/:id` | Update candidate (including `stageId` for drag-and-drop) |
| `DELETE` | `/api/candidates/:id` | Delete candidate |
| `GET` | `/api/stages?jobId=` | List stages for a job (with candidate counts) |

### Example requests

**Create a job:**
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"title":"Backend Engineer","description":"Node.js role","status":"OPEN"}'
```

**Fetch pipeline for Kanban:**
```bash
curl http://localhost:3000/api/jobs/<jobId>/pipeline
```

**Move candidate to a new stage (drag-and-drop):**
```bash
curl -X PATCH http://localhost:3000/api/candidates/<candidateId> \
  -H "Content-Type: application/json" \
  -d '{"stageId":"<newStageId>"}'
```

## Build Roadmap

- [x] **Step 1** — Initialization & Infrastructure
- [x] **Step 2** — Backend API (Jobs, Candidates, Stages CRUD + stage updates)
- [x] **Step 3** — Frontend Kanban board with drag-and-drop

## Frontend Features

| Feature | Implementation |
|---------|----------------|
| Job selector | Dropdown to switch between requisitions |
| Kanban board | `@dnd-kit` columns per pipeline stage |
| Drag & drop | Move candidates between stages with optimistic UI |
| Candidate detail | Slide-over panel on card click (email, phone, resume, stage) |
| Error handling | Rollback on failed stage update + retry banner |

## Environment Variables

Copy `.env.example` to `.env` (already provided for local dev):

```
DATABASE_URL="postgresql://recruit:recruit_dev@localhost:5432/people_recruit?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
