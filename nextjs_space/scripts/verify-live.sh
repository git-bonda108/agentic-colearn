#!/usr/bin/env bash
# Agentic CoLearn — live-deployment smoke test.
# Usage: bash scripts/verify-live.sh https://agentic-colearn.abacusai.app
set -uo pipefail
BASE="${1:?usage: verify-live.sh <base-url>}"
fail=0

check() { # path, expected-code, grep-for (optional)
  local path="$1" want="$2" needle="${3:-}"
  local body code
  body=$(curl -sL --max-time 60 "$BASE$path")
  code=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 60 "$BASE$path")
  if [ "$code" != "$want" ]; then echo "  ✗ $path → $code (wanted $want)"; fail=1; return; fi
  if [ -n "$needle" ] && ! grep -q "$needle" <<<"$body"; then
    echo "  ✗ $path → $code but missing \"$needle\""; fail=1; return
  fi
  echo "  ✓ $path → $code${needle:+ (contains \"$needle\")}"
}

echo "Verifying $BASE"
check "/"                          200 "Every chapter"
check "/learn"                     200 "Choose Your"
check "/dashboard"                 200
check "/parent"                    200
check "/knowledge-graph"           200
check "/profiles"                  200
check "/api/curriculum/10"         200 "Chemical Reactions"
check "/api/dashboard"             200 "conceptsTracked"
check "/api/parent/report"         200 "dataNote"
check "/api/review/queue"          200 "flashcards"
check "/api/curriculum/99"         400
check "/olympiad"                  200 "Indian Talent Olympiad"
check "/api/olympiad"              200 "International Maths Olympiad"
check "/api/olympiad?grade=6"      200 "Logical Reasoning"
check "/api/olympiad?grade=99"     400
echo ""
if [ "$fail" = 0 ]; then echo "ALL LIVE CHECKS PASSED — this is the tested app."; else echo "SOME CHECKS FAILED — the deployment is not serving the new build correctly."; exit 1; fi
