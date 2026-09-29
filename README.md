# smartscore

SmartScore scores how well a resume matches a job description, then tells you what is missing and what to fix. It runs entirely in your browser: no backend, no accounts, no API keys, and your resume is never uploaded.

## Why this

The owner is job hunting across several job boards and is building a separate application tracker (`infobase-application-tracker`). The tracker covers *where* you applied. The step before that, deciding whether a posting is worth applying to and tailoring the resume for it, is repetitive and hard to judge by eye. A resume/job match scorer fills that gap:

- **Useful on day one.** Paste two blocks of text and get a score and a to-do list, with no setup.
- **Private and free.** Resumes contain personal data. Scoring is deterministic and client-side, so nothing leaves the machine and there are no paid AI APIs.
- **Explainable.** Every point in the score comes from something you can see (a matched skill, a missing keyword, a years gap), so the advice can be acted on. It is not a black-box number.
- **Pairs with the tracker.** "Copy report" produces a short Markdown summary you can paste into application notes.

## Features

- **Match score (0-100)** with a verdict (Strong / Good / Partial / Weak) and a per-component breakdown:
  | Component | Base weight | What it measures |
  | --- | --- | --- |
  | Required skills | 50% | Share of the posting's required skills found in the resume |
  | Nice-to-have skills | 15% | Share of the preferred / "a plus" skills found |
  | Keyword coverage | 25% | Share of the posting's 15 most frequent meaningful terms present in the resume |
  | Experience | 10% | Resume years compared with the posting's "N+ years" requirement |

  If a posting has nothing to measure for a component (for example no years requirement), that component is dropped and the other weights are rescaled.
- **Skill detection** from a dictionary of 93 skills with aliases (for example `ReactJS`, `React.js`, and `React` all count as React; `k8s` counts as Kubernetes). Handles `C++`, `C#`, `.NET`, `Node.js`, and multi-word phrases, and avoids false positives such as Java in "JavaScript", SQL in "PostgreSQL", or the word "go".
- **Required vs. nice-to-have** split from section headings ("Requirements", "Nice to have", "Preferred qualifications") and inline cues ("GraphQL is a plus").
- **Experience estimate** from explicit claims ("6 years of experience") and dated roles ("Jan 2020 - Present"), with overlapping roles merged rather than double counted.
- **Keyword gaps**: frequent terms in the posting that your resume lacks, with stopwords, detected skills, and likely company names filtered out.
- **Prioritized suggestions**: missing required skills, experience gaps, missing nice-to-haves, keyword gaps, no quantified results, skills the posting stresses but you mention only once, and resume length.
- **Live scoring** as you type, a built-in fictional sample, and `.txt`/`.md` file import.
- **History** of saved analyses and an auto-saved draft, both stored in `localStorage` in this browser only.
- **Copy report** to the clipboard as Markdown.
- Responsive layout with light and dark themes.

SmartScore is a heuristic guide, not a prediction of hiring outcomes. Only claim skills you actually have.

## Getting started

Requires Node.js 20 or later.

```bash
npm install
npm run dev        # start the dev server at http://localhost:5173
```

Other scripts:

```bash
npm test           # run the unit and component tests once (Vitest + jsdom)
npm run test:watch # run tests in watch mode
npm run lint       # ESLint (typescript-eslint, react-hooks)
npm run typecheck  # TypeScript project build, no emit
npm run build      # type-check and build static files into dist/
npm run preview    # serve the production build locally
```

The build uses a relative base path, so `dist/` can be hosted from any static host or subfolder.

## Project structure

```
index.html                 App shell
public/favicon.svg         Icon
src/
  main.tsx                 React entry point
  App.tsx                  Page layout and state (inputs, live result, history)
  App.test.tsx             Component tests for the main flows
  styles.css               Styles with light/dark color tokens
  components/
    TextInput.tsx          Textarea with word count, clear, and file import
    ScoreGauge.tsx         Circular score gauge
    Results.tsx            Breakdown bars, suggestions, skill/keyword chips, copy report
    HistoryPanel.tsx       Saved analyses list
  lib/                     Framework-free core logic, fully unit tested
    skills.ts              Skill dictionary: ids, labels, categories, aliases
    text.ts                Normalization, tokenizing, stemming, stopwords
    extract.ts             Skill finding, required/preferred split, years, keywords
    score.ts               Weighted scoring, verdicts, suggestions
    report.ts              Markdown report formatter
    storage.ts             Defensive localStorage helpers for history and draft
    samples.ts             Fictional sample resume and job description
    *.test.ts              Unit tests
```

## How scoring works

1. Both texts are normalized: lowercased, with punctuation turned into spaces except the characters that matter in tech names (`+`, `#`, and dots inside tokens).
2. Each skill's aliases are matched with word-boundary rules, longest alias first.
3. The job description is read line by line. Headings switch between required and preferred sections, and a sentence with a cue such as "a plus" or "preferred" counts as preferred. A skill that appears in both sections counts as required.
4. Keywords are the most frequent job-description terms after removing stopwords, posting boilerplate, detected skills, and likely proper nouns. Matching uses a light stemmer, so "dashboards" matches "dashboard".
5. Component scores are combined with the weights above, rescaled over the components that apply, and rounded to 0-100.

The same inputs always produce the same score.

## Extending

- **Add a skill:** add an entry to `SKILLS` in `src/lib/skills.ts`. The label is matched automatically; add aliases for other spellings. Pass `false` as the last argument when the label is an ambiguous word (as with C, R, and Go).
- **Tune weights:** change `BASE_WEIGHTS` in `src/lib/score.ts`.
