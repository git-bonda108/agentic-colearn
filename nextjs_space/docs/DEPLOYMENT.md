# Deploying Agentic CoLearn

The prototype deployment serves at **https://agentic-colearn.abacusai.app**
(a managed Node hosting platform building from this repository). The app is a
standard Next.js 14 application and deploys to any Node 18+ host with a
PostgreSQL database; the flow is always the same: push → build → run the data
jobs → verify.

## 0. Security first (one-time, before anything else)

- **Rotate the leaked database credential.** An earlier public version of
  this repository committed a `.env` containing a live Postgres URL. Rotate
  that password at the database host; the old value must be treated as
  public.
- `.env` is git-ignored at the repo root. Never commit it. `.env.example`
  documents every variable.

## 1. Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | any one | Provider chain (first choice in all tiers) |
| `ANTHROPIC_API_KEY` | of these | Claude models (reasoning/standard/fast tiers) |
| `GEMINI_API_KEY` | five is | Gemini 2.5 Pro/Flash |
| `GROQ_API_KEY` | enough | Llama fallbacks |
| `DEEPSEEK_API_KEY` |  | DeepSeek fallback |
| `TAVILY_API_KEY` | no | Approved-domain web search only |
| `DAILY_LLM_CALL_CAP` | no | Hard daily ceiling on LLM calls (default 500; 0 disables) |
| `ADVERSARIAL_VERIFY` | no | Set `0` to disable the verifier's LLM pass |

Adding **any one** provider key activates the whole app; the router skips
providers without keys. MCQs, BKT/IRT/FSRS, mock-test grading of objective
questions, the parent report, the study plan, and the dashboard all work with
**zero** keys.

## 2. Build & release

```bash
cd nextjs_space
npm install --legacy-peer-deps
npx prisma generate
npm run build          # runs prisma generate && next build
```

On the host: set the app root to `nextjs_space`, build command
`npm run build`, start command `npm run start`, Node 18 or newer.

## 3. Data jobs (run once against the production DB, in this order)

```bash
npx prisma db push                 # apply schema (idempotent)
npm run seed:curriculum            # 12 grades / 535 verified chapters / LOs / starter questions
npm run ingest:ncert -- --all      # download+parse official NCERT chapter PDFs (no AI cost)
```

`ingest:ncert` is polite (400 ms between requests) and refuses to store
anything that fails validation; re-run it any time — it replaces chunks
transactionally. Expect some skips (subjects without registered PDF codes,
e.g. Hindi/Sanskrit/Arts).

Optional — ingest the official Hindi/Telugu editions for native-language
grounding instead of labelled translation:

```bash
npm run ingest:ncert -- --grade 10 --subject science --lang hi
npm run ingest:ncert -- --grade 6 --subject science --lang te
```

Or run the whole sequence with the idempotent post-deploy script:

```bash
bash scripts/post-deploy.sh
```

## 4. Post-deploy verification

```bash
npm run check:coverage             # every chapter resolves to an official PDF URL
npm run check:languages            # multilingual grounding checks (offline)
npm run eval:golden                # examiner regression (needs one provider key for full run)
bash scripts/verify-live.sh https://agentic-colearn.abacusai.app
```

Then in the browser: `/learn` → any grade → chapter → all five tabs
(Learn / Practice / Mock Test / Ask / My Progress), `/dashboard`, `/parent`,
`/knowledge-graph`, `/profiles`, `/olympiad`.

## 5. Operational notes

- **Cost control:** the daily LLM cap is in-memory per server process — on a
  multi-instance deploy each instance counts separately. Production
  follow-up: move the counter to the DB (one row, atomic increment).
- **Provider health:** every response records which provider served it;
  fallback cascades are logged to `AgentEvent` (`kind: model_fallback`).
- **Cloud-synced working copies:** avoid keeping `node_modules`/`.next`
  inside a file-provider-synced directory (e.g. iCloud Drive) — sync engines
  corrupt heavy file churn and can serve stale content to child processes
  such as `prisma generate`. Develop from a plain local path.
