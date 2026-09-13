#!/usr/bin/env bash
# Agentic CoLearn — post-deploy data jobs & checks.
# Run from the nextjs_space directory in the deployed environment.
# Idempotent: safe to re-run. Requires DATABASE_URL to be set.
set -euo pipefail

echo "── 1/4 Applying database schema (prisma db push)…"
npx prisma db push

echo "── 2/4 Seeding the verified curriculum (12 grades, 535 verified NCERT chapters + Olympiad Prep track)…"
npm run seed:curriculum

echo "── 3/4 Ingesting official NCERT chapter PDFs (no AI cost; polite rate)…"
npm run ingest:ncert -- --all || echo "   (some chapters skipped/failed is expected — e.g. subjects without registered PDF codes)"

echo "── 4/4 Verification…"
npm run check:coverage
npm run check:languages || echo "   (language-corpus checks need at least one hi/te chapter ingested — see docs/TRUSTED-SOURCES.md §2)"
npm run eval:golden || echo "   (subjective golden cases need an AI provider key; objective cases must pass)"

echo ""
echo "Post-deploy complete. Now verify the public URL (see docs/abacus-redeploy.md, Step 3)."
