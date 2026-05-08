# Email Marketing Automation Dashboard

A dark, professional SaaS dashboard for cold email outreach and recruiter/company automation. Manage leads, craft email templates with variable substitution, fire off campaigns with Resend, and track all results.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, path /api)
- `pnpm --filter @workspace/email-dashboard run dev` — run the frontend (Vite)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)
- Required env: `RESEND_API_KEY` — Resend API key for sending emails
- Optional env: `RESEND_FROM_EMAIL` — sender address (defaults to noreply@resend.dev)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, shadcn/ui, Tailwind CSS v4, TanStack Query, wouter
- API: Express 5, Orval-generated Zod validators + React Query hooks
- DB: PostgreSQL + Drizzle ORM
- Email: Resend SDK
- File parsing: xlsx (client-side Excel/CSV parsing)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas (server-side validation)
- `lib/db/src/schema/` — Drizzle table definitions
  - `leads.ts` — leads table
  - `email_templates.ts` — global email template
  - `email_logs.ts` — per-send email audit log
  - `activity_log.ts` — activity feed
- `artifacts/api-server/src/routes/` — Express route handlers
  - `leads.ts` — CRUD + bulk import
  - `templates.ts` — global template get/save
  - `emails.ts` — send, retry, logs
  - `dashboard.ts` — stats + activity feed
- `artifacts/api-server/src/lib/email.ts` — Resend integration + template rendering
- `artifacts/email-dashboard/src/pages/` — frontend pages (dashboard, leads, template, logs)
- `artifacts/email-dashboard/src/components/layout.tsx` — sidebar navigation layout

## Architecture decisions

- Single global email template stored in DB; auto-seeded on first request if empty
- Template variables rendered server-side using `{{name}}`, `{{company}}` etc.
- Excel/CSV files are parsed client-side using `xlsx` then POSTed as JSON to `/api/leads/import`
- Activity log is append-only; written on every send/import/add operation
- Email logs are separate from leads — each send attempt creates a log row for full audit trail
- `pnpm --filter @workspace/api-spec run codegen` patches `lib/api-zod/src/index.ts` after orval runs to fix a duplicate-export issue with split mode

## Product

- **Dashboard** — stats cards (total, sent, pending, failed, success rate, recently sent), activity feed, quick-add lead form
- **Leads** — searchable/filterable table with per-row actions (send, retry, delete), bulk Excel/CSV import via drag & drop
- **Template** — subject + body editor with `{{name}}` / `{{company}}` variable support, live preview
- **Logs** — paginated table of all email send attempts with status badges and error details

## User preferences

- Dark professional SaaS UI (Vercel/Linear aesthetic)
- No emojis in UI
- App always defaults to dark mode (no toggle)

## Gotchas

- After every OpenAPI spec change: run `pnpm --filter @workspace/api-spec run codegen` before using generated types
- The codegen script patches `lib/api-zod/src/index.ts` automatically (the `echo` step in the script) — this is intentional
- Resend `from` address must be a verified domain in your Resend account for production use; `noreply@resend.dev` works for testing only
- `RESEND_API_KEY` must be set or email sending routes will throw at runtime (leads can still be managed without it)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
