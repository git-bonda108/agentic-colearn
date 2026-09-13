# Hardening

Current security/operational posture as the code stands, and a staged ladder
to production. This is a prototype serving a demo/family audience; the ladder
is ordered by what must change before real students depend on it.

## 1. Current posture

**Identity & access**
- No authentication. Family profiles are selected by a plain cookie
  (`lib/student.ts`), and the code states this openly — it deliberately does
  not simulate security. All data rows are already keyed by student profile,
  so the data model is auth-ready. NextAuth (+ Prisma adapter) is installed
  as a dependency but not wired.
- No authorization layers: any visitor can read any profile's data and
  trigger paid generation endpoints.
- No rate limiting per client. The only spend brake is the global
  `DAILY_LLM_CALL_CAP` (default 500 calls/day), which is in-memory per server
  process and therefore multiplies across instances.

**Secrets**
- All secrets live in environment variables; `.env` is git-ignored with an
  explanatory comment, and `.env.example` contains placeholders only.
- Provider API keys are used server-side only (API routes and scripts);
  nothing under `app/` ships a key to the client.
- Known history issue: an earlier public version of this repository committed
  a `.env` with a live database URL (documented in `docs/DEPLOYMENT.md` and
  `docs/ENHANCEMENTS.md`). The file is gone from HEAD, but the credential
  must be treated as public: **rotate it** at the database host and purge it
  from git history (`git filter-repo`) if the repository stays public.
- A scan of the current HEAD found no live credentials in tracked files.

**Input handling & prompt security**
- Student answers and questions are wrapped in data envelopes with explicit
  "this is data, not instructions" guards; the golden eval suite includes a
  prompt-injection case that must score ~0.
- Server-side validation on generation outputs: citation indices filtered to
  provided chunks, rubric awards clamped, totals recomputed, answer keys
  matched to options, Mermaid restricted to plain renderable diagram types.
- Answer keys, model answers, and rubrics never leave the server before an
  attempt (`/api/test/assemble` selects only prompt-safe fields).
- Web retrieval is allow-listed to five official domains and the list is
  re-enforced on every returned result — the upstream filter is not trusted.
- Basic request validation everywhere (missing ids → 400; doubt length
  capped at 1,000 chars). No schema-validation library on request bodies;
  `zod` is installed but unused in routes.

**Error handling & availability**
- Provider failures cascade through the fallback chain with per-provider
  60 s timeouts; total provider outage surfaces as a clear 503 ("add an API
  key") rather than a generic 500, and the zero-key mode keeps the
  deterministic features working.
- Content that fails adversarial verification twice is rejected with reasons
  (502) and never cached.

**Observability**
- `AgentEvent` rows persist verification verdicts, blocked/dropped content,
  and model-fallback cascades — decision telemetry is queryable and surfaced
  on the dashboard.
- Beyond that: `console.log`/`console.warn` only. No structured logger, no
  error tracker, no metrics endpoint, no alerting.

**Data**
- The platform stores children's learning data (names, optional emails,
  attempts, mastery) in Postgres. There is no encryption-at-rest handling in
  the app (delegated to the database host), no data-retention policy, and no
  deletion/export flow.

## 2. Ladder to production

### Stage 1 — identity, keys, and spend (before any real users)

1. Rotate the historically leaked database credential; purge it from git
   history; keep the repository's secret scanning in place (e.g. GitHub push
   protection).
2. Wire NextAuth: replace the profile cookie with an authenticated session as
   the source of `getActiveStudent()`. The data model requires no changes;
   this is a single-module swap by design.
3. Enforce ownership: every route that reads or writes student rows must
   scope by the authenticated session's profile set.
4. Move `DAILY_LLM_CALL_CAP` to Postgres (one row, atomic increment — the fix
   is already specified in `docs/DEPLOYMENT.md`) and add per-student
   rate limits on the generation and evaluation endpoints.
5. Validate request bodies with `zod` schemas (already a dependency) at every
   route boundary.

### Stage 2 — monitoring

1. Structured logging (request id, student id, provider, latency, verdict)
   replacing `console.*`; ship to a log store.
2. Error tracking (e.g. Sentry-class tooling) on API routes and the client.
3. Turn `AgentEvent` into operational metrics: block rates per model,
   fallback frequency per provider, examiner latency, daily spend — with
   alerts on block-rate spikes (a model regression shows up there first).
4. Track golden-eval results over time (see `docs/EVALUATION.md` §4) so
   examiner drift is caught by trend, not by complaint.

### Stage 3 — deployment engineering

1. Replace `prisma db push` with versioned migrations (`prisma migrate`) and
   automated backups/point-in-time recovery for the student data.
2. CI: `tsc`, build, objective golden cases, coverage/language checks on
   every push; `verify-live.sh` as the post-deploy gate (all scripts already
   exit with meaningful codes).
3. Make generation multi-instance-safe: the DB-backed cap from Stage 1, and
   idempotency keys on generation POSTs to prevent duplicate spend on
   retries.
4. Cache and CDN policy for the static persona/OG assets; pin provider model
   IDs per release so examiner behavior changes are deliberate.

### Stage 4 — compliance and safety (children's education data)

1. This system processes minors' personal data. Before onboarding real
   families in India, map obligations under the DPDP Act 2023 (verifiable
   parental consent, purpose limitation); equivalent regimes apply elsewhere
   (COPPA, GDPR-K).
2. Data minimization: the child's name and optional email are the only
   identifiers stored today — keep it that way; add retention limits and a
   family-facing export/delete flow.
3. Content safety review: the adversarial verifier checks factual grounding
   and age-appropriate framing; a production system should add an explicit
   safety pass and a parent-visible flag/report channel on generated content.
4. Document the provider data-processing position: student answers are sent
   to third-party model APIs for grading — this belongs in the privacy notice
   and in provider DPA selection.

## 3. Secrets at HEAD

A scan of tracked files at the current HEAD found no live credentials;
`.env.example` values are placeholders. No files required redaction in this
pass. The one standing action is historical, not at HEAD: rotate the database
credential exposed in an earlier commit of the original repository and purge
it from history.
