# BH-ATS Engineering Guide

A plain-English reference for how we build the ByteHint ATS. Every pattern here is already in the codebase — not an aspiration. If you change a pattern in code, update this doc in the same PR.

**Stack**: Next.js 15 (App Router, React 19) · TypeScript strict · Supabase (Postgres + Auth + RLS) · Tailwind CSS v4 · Zod · ZeptoMail · Sentry

---

## 1 — The Big Picture

Requests travel in one direction. Nothing skips steps. Here is the full path:

```
Browser ──▶ Page (server, auth + fetch) ──▶ lib/db (queries only) ──▶ Supabase (RLS enforced)
   │
   └──▶ Client Component ──▶ Actions (validate + write) ──▶ lib/db ┘
```

- **Reads**: Page → `lib/db` → Supabase.
- **Writes**: Client component → Actions → `lib/db` → Supabase.
- **External callers (cron/webhooks)**: skip the page and go straight to route handlers under `app/api/`.

---

## 2 — Non-Negotiables

Read these even if you read nothing else:

1. **Only `lib/db/**` touches Supabase.** Pages and actions call db functions. They never write queries inline themselves. (One exception: a few actions run privileged one-off queries with the service-role client — see Section 5.)
2. **Never `select('*')`.** Always list exactly the columns you need. Keeps payloads small and makes column dependencies visible.
3. **Every admin page starts with `requireStaff()` or `requireUser()`.** Auth is the very first line of every page under `app/(admin)/`.
4. **Types live in `*-types.ts` files**, next to their db module. Client components can import them safely without pulling in server-only code.
5. **No `console.log`, no `any`.** ESLint fails the build on both. Route real errors through `handleError()`.
6. **Server actions return `{ success: boolean; error?: string; data?: T }`.** Client code always branches on `result.success`.

---

## 3 — Folder Structure

Three top-level areas, each with one job:

| Folder | Job |
| --- | --- |
| `app/` | Routing layer — server-first pages, layouts, route handlers |
| `components/` | Presentation layer — all React UI, grouped by feature |
| `lib/` | Logic & integration — db queries, server actions, utils, auth |
| `supabase/` | SQL migrations, RLS policies, seed data |

### Route groups
Parentheses like `(admin)`, `(auth)`, `(public)` are route groups. They organize files and share layouts without appearing in the URL. So `app/(admin)/jobs/page.tsx` serves `/jobs`, not `/admin/jobs`.

| Group | Who sees it | Guard |
| --- | --- | --- |
| `(admin)` | Internal staff only | `requireStaff()` on every page |
| `(public)` | Candidates, unauthenticated | Signed tokens or Turnstile |
| `(auth)` | Sign-in, OAuth callback | None — this is where login happens |

### Where does a new file go?

| Adding… | Put it in… |
| --- | --- |
| A new screen / URL | `app/<group>/<route>/page.tsx` |
| A DB query for a new domain | `lib/db/<domain>.ts` + `lib/db/<domain>-types.ts` |
| A user-triggered write / mutation | `lib/actions/<domain>.ts` (starts with `'use server'`) |
| An interactive widget for one screen | `components/<area>/<domain>/<Name>.tsx` |
| A reusable design-system primitive | `components/ui/<Name>.tsx` |
| A cron / webhook endpoint | `app/api/<name>/route.ts` + register in `vercel.json` |
| A pure helper (no React, no DB) | `lib/utils/<name>.ts` |
| A DB schema change | `supabase/migrations/<timestamp>_<name>.sql` |

> [!NOTE]
> **Grouping rule**: Components are grouped by feature first, not by type. Everything for jobs lives in `components/admin/jobs/`. Only genuinely shared primitives go in `components/ui/`.

---

## 4 — Naming Conventions

### Files

| Kind | Format | Example |
| --- | --- | --- |
| React component file | `PascalCase.tsx` | `JobDetailsDrawer.tsx` |
| DB / action / util module | `kebab-case.ts` | `magic-links.ts` |
| Type companion file | `<module>-types.ts` | `jobs-types.ts` |
| Route file | lowercase reserved name | `page.tsx`, `layout.tsx`, `route.ts` |
| Dynamic route segment | `[param]` | `jobs/edit/[id]/` |
| SQL migration | `<UTC-timestamp>_<desc>.sql` | `20260620000000_hrms_tables.sql` |

### Symbols in code

| Symbol | Case | Example |
| --- | --- | --- |
| Component function | `PascalCase` | `export default function JobsListClient()` |
| Regular function / variable | `camelCase` | `listJobsWithMetadata`, `getMagicLink` |
| React hooks | `useX` | `useSearchParams`, `useJobState` |
| Type / interface | `PascalCase` | `JobWithMetadata`, `AuthContext` |
| Module-level constant | `SCREAMING_SNAKE` | `STAGE_ORDER`, `ITEMS_PER_PAGE` |
| DB tables & columns | `snake_case` | `hiring_manager_id`, `job_questions` |
| Server actions | `camelCase` + `Action` suffix | `createJobAction`, `publishJobAction` |

### Component suffix cheatsheet

- `…Client`: `'use client'` island that receives server-fetched data as props.
- `…Container`: Owns the form/wizard state for a whole screen + calls the server action.
- `…Section`: One slice of a bigger form — receives values + change handlers as props.
- `…Card` / `…Row` / `…Table`: Presentational list/detail primitives.
- `…Modal` / `…Drawer`: Overlay UI.
- `Step1…` `Step4…`: One step in a multi-step wizard.

### The `*-types.ts` split — why it matters
Every domain in `lib/db` ships a pair of files: `jobs.ts` (queries) and `jobs-types.ts` (type definitions only).
- **Client-safe imports**: The types file has zero runtime code that touches `next/headers`, cookies, or the Supabase server client. A client component can import just the types without pulling server-only modules into the browser bundle.
- **No circular deps**: Actions, db, and components all import the same types without creating `A → B → A` loops.

> [!NOTE]
> **Convention**: The query module re-exports its types so server code has one import site. Client components import from the `-types` file directly.

---

## 5 — Data Layer

- **`lib/db` — Queries only**: Pure database wrappers. Selects, inserts, updates, deletes, joins. This is the only layer that imports a Supabase client.
  1. Create the Supabase client per-call: `const supabase = await createServerSupabaseClient();`
  2. Never `select('*')`. Always list columns explicitly.
  3. No authorization, no audit logging, no emails, no redirects inside db functions.
  4. Return shape: return domain objects or `null`/`false` on failure, not `{ success }` envelopes.
  5. On a failed read: log via `console.error` (add the `// eslint-disable-next-line no-console` comment) and return a safe empty value (`[]` / `null`).
  6. Always stamp `updated_at: new Date().toISOString()` on updates.

- **`lib/actions` — The write entry point**: The controller. This is what a client button calls. Every file starts with `'use server'` at the top.
  1. Authorize — call `requireStaff()` / `requireUser()` (or verify magic-token).
  2. Validate inputs — use Zod or explicit checks. Validation lives here, never in the db.
  3. Call `lib/db` functions — or run a privileged query with the service-role client.
  4. Audit log — `await logAudit(action, entity, entityId, meta)` on success.
  5. Side effects — send email via `lib/utils/mailer`, etc.
  6. Return the envelope — `{ success: boolean; error?: string; data?: T }`.

---

## 6 — Security & Auth

Security is layered — defense in depth.

| Layer | Where | What it does |
| --- | --- | --- |
| 1. Edge middleware | `proxy.ts` | Refreshes session. Redirects signed-out users off non-public paths. |
| 2. Page guard | `lib/auth/guard.ts` | `requireStaff()` / `requireUser()` — first line of every admin page. |
| 3. Postgres RLS | `supabase/migrations/` | The real backstop — enforced even if app code is wrong. |

### Secrets — the config split

- `config.public.ts`: `NEXT_PUBLIC_*` values only — Supabase URL, anon key, Sentry DSN. Imported anywhere.
- `config.server.ts`: Real secrets — service-role key, SMTP credentials, cron secrets. Server code ONLY.

---

## 7 — Styling

Tailwind CSS v4 with custom tokens. Style with semantic tokens, never raw hex or arbitrary pixels.

| Concern | Use | Not |
| --- | --- | --- |
| Color | `bg-primary`, `text-on-surface` | `bg-[#8d3f90]`, `text-black` |
| Spacing | `gap-md`, `px-lg`, `py-xs` (8px grid) | `p-[13px]` |
| Typography | `font-headline-lg`, `font-body-md` | `text-[28px]` |
| Radius | `rounded-xl` (cards), `rounded-sm` (tags) | `rounded-[12px]` |

### Visual rules
- **Light mode only**: Pure white background; surface grays for sidebars/containers.
- **No drop shadows**: Depth comes from tonal layering + 1px outlines.
- **No gradients / glassmorphism**: The aesthetic is precise and data-dense — think Linear or Ashby.
- **Font**: Hanken Grotesk (weights 400 / 500 / 600 only).

---

## 8 — Coding Standards

- **TypeScript**: `strict: true` everywhere — no implicit `any`, strict null checks on. Import types with `import type { }`. Path alias `@/*` maps to the repo root.
- **ESLint rules**: Enforce `no-console` and `@typescript-eslint/no-explicit-any` as hard errors.
- **Error handling**: App errors use the typed `AppError` with an `ErrorCode`. `handleError(err, ctx)` normalizes any thrown value and reports to Sentry in production.
