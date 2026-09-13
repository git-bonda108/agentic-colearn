# Architecture

This document describes the system as it exists in the code. Paths are relative
to `nextjs_space/` unless noted.

## 1. System overview

Agentic CoLearn is a Next.js 14 (App Router) application. There is no separate
backend service: 32 API route handlers under `app/api/` are the backend, and a
`lib/` layer of ~4,500 lines of TypeScript holds the engine. PostgreSQL
(via Prisma) is the only datastore.

The codebase contains two generations, both present and honest about their roles:

1. **The CoLearn spine** (current): the curriculum-grounded platform —
   `/learn`, `/olympiad`, `/dashboard`, `/parent`, and the `lib/` modules
   described below. This is where all recent engineering lives.
2. **A legacy prototype layer**: keyword-routed subject tutors
   (`lib/agent-router.ts`, `lib/agent-types.ts`), scientist personas
   (`lib/personas.ts`), a hardcoded biology context-pack lesson generator
   (`lib/context-packs.ts`, `lib/teaching-agents.ts`, `/api/teach/generate`),
   and a 3-tier image fallback (`lib/image-generator.ts`). Persona chat was
   deliberately removed from navigation — the design decision (recorded in
   `docs/ENHANCEMENTS.md`, Batch 4) is that companion voices are a flavour
   layer, never a content source.

## 2. Component map

| Concern | Module(s) | Notes |
|---|---|---|
| Model routing | `lib/model-router.ts` | 3 task tiers, 5-provider fallback chains, per-call timeout, JSON-mode validation, daily call cap |
| Grounding corpus | `lib/corpus.ts`, `lib/ncert-codes.ts`, `scripts/ingest-ncert.ts` | official NCERT PDF ingestion (en/hi/te editions), chapter-scoped lexical retrieval |
| Lesson generation | `app/api/lesson/route.ts` | grounded generation, citation validation, Mermaid diagram sanitization, per-language cache, verify-then-cache |
| Doubt answering | `app/api/ask/route.ts` | chapter-grounded Q&A, age-calibrated voice, out-of-scope admission, injection guard |
| Question authoring | `lib/question-generator.ts`, `app/api/questions/generate/route.ts`, `app/api/olympiad/questions/route.ts` | CBSE 2025-26 typology + Olympiad sections, rubric normalization, sanitization |
| Adversarial verification | `lib/verifier.ts` | deterministic checks + refute-prompted independent model; verdicts pass/flag/block/unverified |
| Grading | `lib/evaluation.ts`, `app/api/evaluate/route.ts` | deterministic key match; rubric-LLM examiner with server-side guards |
| Student modeling | `lib/bkt.ts`, `lib/irt.ts`, `scripts/calibrate-irt.ts` | BKT with partial credit; 2-PL IRT with honest data gates |
| Spaced repetition | `lib/fsrs.ts`, `app/api/flashcards/review/route.ts`, `app/api/review/queue/route.ts` | FSRS-4.5 scheduling; unified daily review queue |
| Test assembly | `app/api/test/assemble/route.ts` | CBSE-blueprint mock test (Sections A–E, 25 marks) and 5-question diagnostic probe |
| Planning | `app/api/study-plan/route.ts` | deterministic 7-day planner; optional LLM coaching note only |
| Reporting | `app/api/parent/report/route.ts`, `app/api/dashboard/route.ts` | computed 100% from persisted rows; no LLM in the parent report |
| Knowledge map | `app/api/knowledge-graph/route.ts` | nodes = real chapters with live BKT mastery; edges = official chapter sequence |
| Identity | `lib/student.ts` | cookie-selected family profiles; deliberate no-password prototype scoping |
| Web search | `lib/approved-search.ts` | hard allow-list of 5 official domains, re-enforced on every result |
| Telemetry | `AgentEvent` model (`prisma/schema.prisma`) | verifier verdicts, blocked content, provider fallback cascades |

## 3. Orchestration analysis

### 3.1 The generator–critic pipeline (lessons)

`POST /api/lesson` is the clearest expression of the system's pattern:

```
retrieve corpus (24k-char budget, document order)
  → generate lesson (standard tier, grounded prompt, per-section citations)
  → adversarial verify (reasoning tier, prompted to REFUTE against excerpts)
      verdict block → log AgentEvent, regenerate ONCE with the verifier's
                      objections appended to the prompt
      still block   → 502 with the issues; nothing is cached
      pass / flag   → server-side citation filtering, diagram sanitization,
                      cache per language, log AgentEvent
```

Sequential by necessity: the critic needs the generator's output, and the
retry needs the critic's objections. The retry is bounded at one — a
deliberate cost/latency ceiling visible in the route.

### 3.2 Question generation

Same shape, applied per question: deterministic checks first (free — answer
key ∈ options, rubric sums to the marks), then the LLM verifier, which for
objective types must independently *solve* the question blind and agree with
the stated key. Blocked questions are dropped before storage; each dropped or
verified question is logged to `AgentEvent`.

### 3.3 Grading

`POST /api/evaluate` is deterministic-first:

1. Objective types → normalized string match against the key. No LLM, no cost.
2. Subjective types → empty/trivial answers short-circuit to 0 without an LLM
   call; otherwise a reasoning-tier examiner grades against the stored
   per-question rubric.
3. Server-side guards on the LLM result: criteria matched to the rubric **by
   name** (two-pass, index fallback) so a reordered response cannot put marks
   on the wrong criterion; per-criterion awards clamped to criterion maxima;
   evidence quotes verified as substrings of the student answer (unverifiable
   quotes are kept but flagged); the total is recomputed server-side and
   rounded to the half mark — model arithmetic is never trusted.
4. The attempt is persisted with full structured feedback, then BKT updates
   run for the chapter concept and the tagged learning-outcome concept.

### 3.4 What runs in parallel

- The legacy `/teach` generator: content generation first (other agents need
  it), then visuals, video curation, real-world connections, and assessment
  in a `Promise.all` fan-out, each wrapped so one failure degrades that
  feature instead of the lesson.
- Read paths batch their DB reads with `Promise.all`
  (`/api/review/queue`, `/api/dashboard`).
- Provider fallback is intentionally **sequential**: the router walks the
  tier's chain one provider at a time (60 s abort each), because the second
  provider should only pay its cost when the first has actually failed.

### 3.5 Async boundaries

Everything is request-scoped; there are no queues or background workers.
Long-running generation routes raise `maxDuration` (60–120 s current routes;
300 s legacy teach). The offline jobs (ingestion, IRT calibration, seeding)
are CLI scripts, not web requests.

## 4. State and context engineering

### 4.1 Durable state (Postgres)

- **Curriculum spine:** `CurriculumGrade → CurriculumSubject →
  CurriculumChapter → LearningOutcome`, seeded from verified NCERT chapter
  lists (535 chapters across all 12 grades; multi-book subjects use
  book-prefixed slugs like `history-ch-1`).
- **Grounding corpus:** `ContentChunk` — ~1,400-char passages of official
  chapter PDFs, unique per (chapter, language, idx), with source URL and page.
  The `embedding` column exists but stays null: ranking is lexical today.
- **Student model:** `ConceptMastery` (one BKT state per student × concept
  key; keys are slug-based, `g{grade}.{subjectSlug}.{chapterSlug}` and
  outcome-level variants), `QuestionAttempt` (answer, score, full feedback
  JSON, evaluator identity).
- **Assessment bank:** `Question` rows carry the rubric, model answer,
  verification verdict JSON, and 2-PL IRT parameters with the sample size
  they were calibrated from.
- **Caches:** generated lessons live in `CurriculumChapter.contentCache` as a
  per-language map (`{ en: …, hi: …, te: … }`); legacy single-lesson caches
  are read as English.
- **Telemetry:** `AgentEvent` rows record why content was accepted, rejected,
  or served by a fallback provider — "why did the system do X" is answerable
  from the database.

### 4.2 Context assembly

Context for generation is engineered, not dumped:

- **Bounded:** lessons get a 24,000-character corpus budget; doubt answering
  gets 14,000 with query-relevance ranking. Chunk selection stops at the
  budget; selected chunks are re-sorted into document order because models
  write better from sequential text and citation indices stay meaningful.
- **Structured:** excerpts are numbered (`[idx] (p.N) text`); prompts require
  per-section `sourceChunks` citations, which the server filters against the
  actually-provided indices — a model cannot cite what it was not given.
- **Language-honest:** requesting Hindi/Telugu grounds in that edition's
  chunks when ingested; otherwise the system grounds in English and instructs
  faithful translation only, and the response labels the source language.
- **Injection-guarded:** student answers and questions are wrapped in data
  envelopes (`<student_answer>`, `<student_question>`) with explicit
  treat-as-data instructions, and the golden eval suite includes an injection
  attempt that must score ~0.

### 4.3 Session state

There is no conversational memory in the CoLearn routes — each request is
self-contained against the corpus and the student model, which is the point:
mastery state, not chat history, is the personalization signal. The legacy
chat persists `ChatSession`/`Message` rows and replays the transcript from
the client.

## 5. Design decisions and trade-offs (as visible in the code)

- **Lexical retrieval over embeddings.** Retrieval is chapter-scoped
  (10–80 chunks), so an in-process tf–idf-style ranker is deterministic, free,
  and works before any provider key exists. The trade-off — no semantic
  paraphrase matching — is smallest exactly when the corpus is this small.
  The schema reserves the upgrade path.
- **Deterministic core, LLM shell.** Everything that owns a number (BKT, IRT,
  FSRS, mark totals, the study-plan schedule, the parent report) is pure
  TypeScript. LLMs generate prose and propose per-criterion awards; servers
  clamp, recompute, and verify. This is the single most consistent principle
  in the codebase.
- **Refuse rather than degrade silently.** Ingestion refuses non-PDF or
  implausibly short downloads; the verifier's "unverified" verdict is
  labelled, never disguised as "pass"; unseeded grades show "Chapters being
  added" instead of invented chapter lists; mock-test assembly reports
  question-bank shortfalls explicitly.
- **Multi-provider by default.** The tier chains make no provider a hard
  dependency; the daily call cap (`DAILY_LLM_CALL_CAP`, default 500) bounds
  worst-case spend. The cap is in-memory per process — a documented prototype
  simplification (see `docs/DEPLOYMENT.md`) with a stated production fix
  (single DB row, atomic increment).
- **Honest identity scoping.** Profiles are cookie-selected with no
  passwords, and the code says so out loud (`lib/student.ts`) rather than
  simulating security. All rows are already keyed by profile, so real auth
  replaces the cookie without touching the data model. NextAuth is installed
  but not wired.
- **Partial-credit BKT is a pragmatic blend.** The score-weighted mix of the
  correct/incorrect posteriors is monotone and well-behaved but not canonical
  BKT; `docs/adaptive-engine-reference.md` documents the alternatives and the
  literature.
- **IRT calibration is honest about data.** Items keep default parameters
  below 10 graded attempts, every stored parameter records its sample size,
  and degenerate response patterns get conservative shifts instead of clamp
  walks. Current limitation, noted in the calibration script: θ per attempt
  uses the student's *current* mastery as a proxy for ability at attempt time.

## 6. Extending this system

Grounded next steps the current architecture makes cheap:

1. **Semantic retrieval, additively.** `ContentChunk.embedding` and the
   corpus module's ranking seam already exist. Embedding chunks at ingest
   time and blending cosine scores with the lexical ranker would improve
   doubt-answering recall on paraphrased questions — without touching any
   route, because `getChapterContext()` is the single retrieval entry point.
2. **Per-attempt ability history for IRT.** `QuestionAttempt` already stores
   everything except θ-at-attempt-time. Persisting the BKT estimate alongside
   each attempt (one column) would let `calibrate-irt.ts` fit against true
   longitudinal ability instead of the current-mastery proxy, and unlock
   max-information adaptive selection (`orderByInformation()` is already
   written and waiting for calibrated items).
3. **Misconception aggregation.** The examiner already extracts structured
   `misconceptions[]` per attempt into `QuestionAttempt.feedback`. A grouping
   query per chapter across students would turn that into a re-teaching
   signal for lessons ("this cohort confuses X with Y") — the data is being
   collected today and read by nobody.
4. **Move the cost cap and rate limiting into Postgres.** The in-memory daily
   cap breaks under multi-instance deployment; the documented fix (one row,
   atomic increment) also creates the natural place for per-student rate
   limits, which do not exist yet.
5. **Telugu Grades 9–12 via the SCERT pathway.** The ingest pipeline is
   source-agnostic given a code registry; `docs/TRUSTED-SOURCES.md` already
   names the official SCERT Telangana / Andhra Pradesh e-book sources. Wiring
   them into `ncert-codes.ts`-style registries extends native-language
   grounding to the grades that currently fall back to labelled translation.
