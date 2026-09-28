# SmartScore

Build scored assessments, publish them to a shareable link, and read the results.
Respondents answer without an account, every submission is scored the moment it
arrives, and the answer key never leaves the server.

## What it does

- **Author assessments** with three question types:
  - *Single choice* — one correct option, full points or nothing.
  - *Multiple choice* — partial credit; each correct option selected earns its
    share of the points, each incorrect one cancels a share out, floored at zero.
  - *Numeric* — correct when the value falls within a tolerance you set (or an
    exact match when you leave the tolerance blank).
- **Weight each question** by points, and set a pass mark as a percentage.
- **Publish to a link** (`/a/<assessment-id>`). No sign-up for respondents.
- **Score on submission**, and show the respondent their own result.
- **Review results** per assessment: response count, average score, pass rate,
  and every submission with its points breakdown.

## Stack

| Piece | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript, strict |
| Styling | Tailwind CSS 4 (CSS-first `@theme` tokens) |
| Data & auth | Supabase (Postgres + Auth) with Row Level Security |
| Validation | Zod |
| Tests | Node's built-in test runner — no test framework dependency |

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project and apply the schema

Run `supabase/migrations/0001_init.sql` against your project — paste it into the
SQL editor, or use the CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

The migration creates the tables, the `updated_at` and new-user triggers, and
all Row Level Security policies.

### 3. Configure the environment

```bash
cp .env.example .env.local
```

Fill in the four values. `SUPABASE_SERVICE_ROLE_KEY` is server-only — it
bypasses Row Level Security, so keep it out of the browser and out of git.

### 4. Run it

```bash
npm run dev
```

Open http://localhost:3000, create an account, and add your first assessment.

> If email confirmation is on for your Supabase project (it is by default),
> confirm the address before signing in, or turn confirmation off under
> **Authentication → Sign In / Providers** while developing.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (`eslint-config-next` flat config) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests for the scoring and option-parsing logic |

All four run on every pull request and on pushes to `main`, via
`.github/workflows/ci.yml`.

## How the security model works

There are two Supabase clients, and the split is the whole design:

- `src/lib/supabase/server.ts` — the request-scoped client. It carries the
  signed-in user's cookies, so **Row Level Security** decides what is visible.
  Every policy in the migration is owner-scoped: you reach only your own
  assessments, questions, options and submissions.
- `src/lib/supabase/admin.ts` — the service-role client. It bypasses RLS and is
  marked `server-only`.

The service-role client exists for exactly one job: the public take flow.
Respondents are not signed in, so there is no session for RLS to check, and
`options.is_correct` must not reach the browser. So the server reads the
questions, **strips the answer key** before rendering
(`src/server/public-data.ts`), and scores the submission itself
(`src/server/take.ts`). On submit the assessment is re-read server-side — the
client is not trusted to say whether it is still published.

That is also why the migration grants the `anon` role no policies at all.

## Project layout

```
src/
  app/
    (app)/dashboard/      Authenticated area: list, editor, results
    a/[id]/               Public take flow and the respondent's result page
    login/                Email + password sign in and sign up
    auth/signout/         POST route that clears the session
  components/ui/          Button, Card, Field, Badge, EmptyState
  lib/
    scoring.ts            Pure scoring engine (unit-tested)
    options.ts            Option shorthand parser (unit-tested)
    supabase/             Browser, server and service-role clients
    types.ts              Row types, including the answer-key-free PublicQuestion
  server/
    assessments.ts        Server Actions for authoring
    take.ts               Server Action for submitting and scoring
    public-data.ts        Render-time loaders for the public pages
supabase/migrations/      SQL schema, triggers and RLS policies
```

## Notes on a few decisions

- **Scoring lives in a pure function.** `scoreSubmission` takes plain data and
  returns plain data, so the rules are covered by unit tests with no database
  and no HTTP. That is where the partial-credit and tolerance behaviour is
  pinned down.
- **Options use a shorthand** instead of a dynamic row editor: one option per
  line, `*` marks the correct one. It keeps the authoring form free of
  client-side list state.
- **Loaders are not Server Actions.** Every export of a `"use server"` module is
  reachable as an endpoint, so the read-only loaders sit in a plain
  `server-only` module instead.
- **Row types are hand-written** in `src/lib/types.ts`. Once the schema settles,
  `supabase gen types typescript` is the natural replacement.

## Possible next steps

- Reorder questions (the `position` column is already there).
- Per-question analytics on the results page — the `answers` table records
  `awarded_points` and `correct` per question.
- Time limits, or one-submission-per-email enforcement.
- CSV export of submissions.
