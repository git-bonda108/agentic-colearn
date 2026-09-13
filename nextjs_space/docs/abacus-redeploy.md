# Redeploy runbook — agentic-colearn.abacusai.app

Use this when the hosted deployment at https://agentic-colearn.abacusai.app
is serving an older build than the repository. The host builds from the
connected GitHub repository — it does not see local code — so the sequence
is: push → rebuild → data jobs → verify.

## Step 0 — Push the current code

```bash
git push origin master
```

## Step 1 — Rebuild on the host

In the hosting console, redeploy the app from the latest commit on `master`
of the connected repository `git-bonda108/agentic-colearn`, deploying the
repository exactly as pushed (no code generation or modification), with:

- App root directory: `nextjs_space`
- Install: `npm install --legacy-peer-deps`
- Build: `npm run build`
- Start: `npm run start`
- Node 18 or newer

Environment variables (keep the existing `DATABASE_URL` after rotating its
password):

- `DATABASE_URL` = the rotated Postgres connection string
- One or more AI provider keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
  `GEMINI_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY` — any single one
  activates the full system
- `DAILY_LLM_CALL_CAP` = `500`

**Important, before or during this step:** rotate the database password in
the hosting console (Database → credentials). The old password was committed
to the public repository's history and must be treated as compromised.

## Step 2 — Data jobs

From a shell in the deployed environment, in the `nextjs_space` directory:

```bash
bash scripts/post-deploy.sh
```

The script applies the schema, seeds the verified curriculum (including the
Olympiad Prep track for grades 1–10), ingests the official NCERT chapter
PDFs (no AI cost), and runs the verification suite. It is idempotent — safe
to re-run.

Optional but recommended — ingest the official Hindi/Telugu editions for the
chapters you care about (native-language grounding instead of labelled
translation):

```bash
npm run ingest:ncert -- --grade 10 --subject science --lang hi
npm run ingest:ncert -- --grade 6 --subject science --lang te
```

## Step 3 — Verify the live app

Visit https://agentic-colearn.abacusai.app and check:

1. The landing page says **"Agentic CoLearn — Every chapter. Every child."**
   (not the old persona page).
2. `/learn` → any grade → any chapter opens the five-tab workspace
   (Learn · Practice · Mock Test · Ask · My Progress).
3. `/dashboard`, `/parent`, `/knowledge-graph`, `/profiles` all load.
4. Generate a lesson on an ingested chapter — it should show the green
   "Grounded in the official NCERT chapter text" badge with a "See It
   Visually" section.
5. `/olympiad` → any class → an exam workspace shows the official format,
   NCERT-linked syllabus, and Olympiad-pattern practice; the chapter
   workspace's Learn tab shows the English/हिन्दी/తెలుగు toggle.

Or run the automated check from any machine:

```bash
bash scripts/verify-live.sh https://agentic-colearn.abacusai.app
```
