# Adaptive Tutoring Engine — Engineering Reference

Practical reference for implementing the student-modeling and answer-evaluation layer in TypeScript. Covers: Bayesian Knowledge Tracing (BKT), IRT/Elo as an alternative, LLM rubric grading of free-text exam answers, and embedding-similarity pre-checks.

---

## 1. Bayesian Knowledge Tracing (BKT)

### 1.1 Model

BKT (Corbett & Anderson, 1995) models each **skill** as a two-state HMM: the student either knows the skill (latent state L) or doesn't. Four parameters per skill:

| Param | Symbol | Meaning |
|-------|--------|---------|
| Init | `p(L0)` | Probability the student already knows the skill before any practice |
| Transit | `p(T)` | Probability of learning the skill at each practice opportunity (unknown → known) |
| Slip | `p(S)` | Probability of answering **incorrectly** despite knowing the skill |
| Guess | `p(G)` | Probability of answering **correctly** despite not knowing the skill |

Standard BKT assumes **no forgetting** (`p(F) = 0`): mastery is absorbing. pyBKT supports a `forgets` extension if you ever need decay.

### 1.2 Exact update equations

State: `pL` = current P(known) for this (student, skill). One update per graded observation (question attempt), binary correct/incorrect.

**Predicted probability of a correct answer (before observing):**

```
p(correct) = pL * (1 - pS) + (1 - pL) * pG
```

**Step 1 — Bayesian evidence update (posterior given the observation):**

If the answer was **correct**:

```
pL_given_obs = pL * (1 - pS) / (pL * (1 - pS) + (1 - pL) * pG)
```

If the answer was **incorrect**:

```
pL_given_obs = pL * pS / (pL * pS + (1 - pL) * (1 - pG))
```

**Step 2 — Learning transition (applied after every observation, right or wrong):**

```
pL_next = pL_given_obs + (1 - pL_given_obs) * pT
```

`pL_next` becomes the new prior for the next opportunity.

**TypeScript implementation:**

```ts
export interface BKTParams {
  pInit: number;    // p(L0)
  pTransit: number; // p(T)
  pSlip: number;    // p(S)
  pGuess: number;   // p(G)
}

const EPS = 1e-9;
const clamp = (x: number) => Math.min(1 - EPS, Math.max(EPS, x));

/** Probability the student answers the next item correctly. */
export function predictCorrect(pL: number, p: BKTParams): number {
  return pL * (1 - p.pSlip) + (1 - pL) * p.pGuess;
}

/** One BKT update. `score` in [0,1]; treat >= 0.5 as correct for binary items,
 *  or see "partial credit" note below for rubric scores. */
export function bktUpdate(pL: number, correct: boolean, p: BKTParams): number {
  const { pSlip, pGuess, pTransit } = p;
  const posterior = correct
    ? (pL * (1 - pSlip)) / clamp(pL * (1 - pSlip) + (1 - pL) * pGuess)
    : (pL * pSlip) / clamp(pL * pSlip + (1 - pL) * (1 - pGuess));
  return clamp(posterior + (1 - posterior) * pTransit);
}
```

**Partial credit** (rubric scores in [0,1]): standard BKT is binary. Two safe options: (a) threshold — count score ≥ 0.6 (or your pass mark) as "correct"; (b) linear interpolation of the two posteriors, `posterior = s * posteriorCorrect + (1 - s) * posteriorIncorrect` — a pragmatic industry hack, not canonical BKT, but monotone and well-behaved. Prefer (a) unless you have a reason.

### 1.3 Sensible default parameters

When you have no fitted data (cold start), values in this range are standard in the literature and pyBKT examples:

```ts
export const DEFAULT_BKT: BKTParams = {
  pInit: 0.25,   // 0.1–0.4 typical; use 0.4+ for review topics, 0.1 for brand-new
  pTransit: 0.2, // 0.1–0.3 typical (pyBKT algebra examples use ~0.3)
  pSlip: 0.1,    // keep ≤ 0.1 (Corbett & Anderson bound)
  pGuess: 0.2,   // ≤ 0.3; for 4-option MCQ use 0.25; for free-text use ~0.05–0.1
};
```

- pyBKT's worked examples for algebra skills use `prior=0.08, learn=0.3, guess=0.15, slip=0.05, forget=0` — fine defaults for well-scaffolded skills ([pyBKT paper](https://arxiv.org/pdf/2105.00385), [repo](https://github.com/CAHLR/pyBKT)).
- Corbett & Anderson's original Cognitive Tutor work bounded `p(G) ≤ 0.3` and `p(S) ≤ 0.1` to prevent degenerate fits; the [standard-bkt reference implementation](https://iedms.github.io/standard-bkt/) similarly caps slip/guess at 0.3 by default.
- Set `pGuess` from item format: free-text short answers ⇒ low guess (0.05–0.1); 4-choice MCQ ⇒ 0.25.
- If you later have logs (~hundreds of attempts per skill), fit per-skill parameters offline with [pyBKT](https://github.com/CAHLR/pyBKT) (EM) and ship them as JSON to the TS runtime. Don't fit online in TS.

### 1.4 Mastery threshold

Convention from Cognitive Tutor / Corbett & Anderson: a skill is **mastered when `pL ≥ 0.95`**. Practical policy:

- `pL ≥ 0.95` → mastered; stop drilling, move on (avoid "over-practice").
- `0.7 ≤ pL < 0.95` → developing; keep practicing at moderate difficulty.
- `pL < 0.7` → weak; remediate (easier items, worked examples, re-teach).
- Optionally require **N consecutive correct** (2–3) in addition to the threshold, which guards against a lucky-guess path to 0.95.

### 1.5 Pitfalls

1. **Identifiability / degeneracy** (Beck & Chang 2007; van de Sande 2013): multiple parameter sets produce identical predicted behavior. Classic degenerate fit: high slip + high guess ("knows it but fails, doesn't know it but succeeds"). This is why you clamp `pS ≤ 0.1` (or at worst ≤ 0.3) and `pG ≤ 0.3`. A model where `pS + pG > ~0.5` is unusable — validate params at load time.
2. **Degeneracy tests**: predicted p(correct) must increase with pL — i.e. `1 - pS > pG` must hold. Assert it.
3. **Skill granularity**: BKT tracks one binary skill. Map each question to exactly one (or a small set of) skill tags; if a question exercises several skills, update each tagged skill with the same observation (the standard, if imperfect, practice).
4. **Absorbing mastery**: with `p(F)=0`, pL only goes up over time in expectation and never decays across sessions. For long-horizon retention, either add a small forget probability applied per elapsed day, or schedule spaced review independently of BKT.
5. **Order matters, single stream**: BKT assumes a sequence of opportunities on one skill. Interleaving is fine; just keep per-skill state and update the right one.
6. **Don't update on hint-assisted or revealed-answer attempts** as plain "correct" — either skip the update or count them incorrect (Cognitive Tutor counts a hint request as an error).
7. **Floating point**: clamp pL to [ε, 1−ε] so a long streak can't pin it to exactly 1 and freeze the model.

---

## 2. IRT (1PL/Rasch) and Elo as an alternative

### 2.1 When to prefer IRT/Elo over BKT

| | BKT | IRT/Elo |
|---|---|---|
| Models | per-skill mastery (binary latent) | continuous student ability θ + per-item difficulty d |
| Item difficulty | ignored (all items on a skill are equal) | first-class |
| Learning over time | explicit (p(T)) | implicit (rating drifts up) |
| Best for | fine-grained skill mastery decisions, "has the student mastered topic X?" | item selection/calibration, heterogeneous item pools, placement, ranking |
| Cold start | needs per-skill params | self-calibrating from data |

Practical answer for a tutor: **use both** — BKT for the per-topic mastery meter and pedagogy decisions; an Elo-style rating per (student, subject) and per item to pick appropriately difficult questions. Pelánek's survey of Elo in education concludes Elo variants match more complex models in accuracy while being trivially online and O(1) per update ([Applications of the Elo rating system in adaptive educational systems](https://www.sciencedirect.com/science/article/abs/pii/S036013151630080X)).

### 2.2 The 1PL (Rasch) model

Probability a student with ability θ answers an item with difficulty d correctly:

```
P(correct) = 1 / (1 + exp(-(θ - d)))          // logistic, natural units
```

(Chess-style base-10/400 scaling is the same model reparameterized; use natural units in code.)

### 2.3 Online Elo update (the practical estimator)

After each attempt, with `actual` ∈ {0, 1} (or a partial-credit score in [0,1]):

```
expected  = 1 / (1 + exp(-(theta - d)))
theta'    = theta + K_student * (actual - expected)
d'        = d     - K_item    * (actual - expected)   // item gets harder if answered wrong? No:
                                                      // item difficulty moves OPPOSITE the student:
                                                      // correct answer ⇒ item was easier than thought ⇒ d decreases
```

**K-factor conventions.** Fixed K ≈ 0.3–0.4 (natural-logistic units) works; better is the **uncertainty function** used by Pelánek et al. in adaptive-practice systems, which decays K with the number of prior updates n:

```
K(n) = a / (1 + b * n)     // typical a = 1.0, b = 0.05
```

so early attempts move the estimate a lot and it stabilizes over time ([Elo-based learner modeling for the adaptive practice of facts](https://link.springer.com/article/10.1007/s11257-016-9185-7)). Freeze (or use a very small K for) item difficulties once an item has a few hundred attempts. Dynamic-K remains an active research topic ([dynamic K study, 2025](https://link.springer.com/article/10.1007/s11257-025-09439-z)).

```ts
export interface EloState { rating: number; n: number } // n = attempt count

const kFactor = (n: number, a = 1.0, b = 0.05) => a / (1 + b * n);

export function eloUpdate(student: EloState, item: EloState, score: number) {
  const expected = 1 / (1 + Math.exp(-(student.rating - item.rating)));
  const ks = kFactor(student.n);
  const ki = kFactor(item.n);
  return {
    student: { rating: student.rating + ks * (score - expected), n: student.n + 1 },
    item:    { rating: item.rating    - ki * (score - expected), n: item.n + 1 },
    expected, // useful for logging/calibration
  };
}
```

Initialize `rating = 0` for students; seed item difficulty from authored level (e.g. easy = −1, medium = 0, hard = +1). **Item selection**: pick items where `expected` ≈ 0.6–0.8 — challenging but winnable (adaptive-practice systems commonly target ~75% success). Note Duolingo solves the *retention* half of this with half-life regression rather than Elo — a trainable spaced-repetition model predicting recall probability as a function of lag time ([Settles & Meeder, ACL 2016](https://research.duolingo.com/papers/settles.acl16.pdf)); that's the model to borrow if you add review scheduling.

**Caveat**: unlike chess, students learn — a student's rating rise conflates ability drift and estimation noise; that's expected and fine for item selection, but don't read absolute Elo as "mastery". Keep BKT for that claim.

---

## 3. LLM rubric evaluation of free-text answers (2/5-mark questions)

### 3.1 Core design: decomposed rubric, not holistic scoring

The consistent finding across LLM-as-judge literature: **holistic 0–5 scoring is unstable; binary/per-criterion rubric verdicts are far more reliable** ([survey: From Holistic Evaluation to Structured Criteria](https://arxiv.org/html/2606.08625v2); [Rubric Is All You Need — question-specific rubrics beat generic ones for code grading, ICER 2025](https://dl.acm.org/doi/10.1145/3702652.3744220)).

Design rules:

1. **Author a rubric per question** at content-creation time (LLM-drafted, human-reviewed): 2-mark question → 2 criteria × 1 mark (or 4 × 0.5); 5-mark question → 4–6 criteria with weights summing to 5. Each criterion is a *single verifiable proposition* ("states that osmosis moves water from low to high solute concentration"), not a vague quality ("shows understanding").
2. **Grade each criterion as awarded / partial / not-awarded** with a fixed partial fraction (0.5), then sum weighted marks in *your* code. Never let the model do the arithmetic — recompute `totalScore` server-side from the per-criterion verdicts and treat a mismatch as a validation error.
3. **Chain-of-thought before verdict**: require reasoning fields *before* score fields in the JSON schema (generation order matters for autoregressive models — the model that must first quote evidence and reason grades more accurately than one that emits the score first).
4. **Evidence extraction**: for each criterion, require a verbatim quote from the student's answer (or `null` if absent). This (a) grounds the verdict, (b) makes the grade auditable/displayable to the student, (c) sharply reduces hallucinated credit. Validate server-side that the quote is actually a substring (after whitespace normalization) of the student answer; if not, flag for re-grade.
5. **Calibrate against the model answer**: include the question, the model/reference answer, and the rubric in the grader prompt. Optionally include 1–2 pre-graded example answers (one full-credit, one partial) as few-shot anchors — the biggest single win for agreement with human graders.
6. **Temperature 0 / low**, and pin the model version. For high-stakes marks, grade twice (or with two models) and flag disagreements > 20% of max marks for human review. Track judge–human agreement (Cohen's κ or exact-mark agreement) on a labeled sample before trusting it ([LLM-as-a-Judge overview](https://futureagi.com/blog/llm-as-a-judge/)).

### 3.2 Bias pitfalls

- **Verbosity bias**: judges reward longer answers. Mitigation: per-criterion binary verdicts tied to quoted evidence (length can't earn marks that criteria don't grant); instruct explicitly "do not reward length or fluency; award marks only for rubric content."
- **Position bias**: mainly a pairwise-comparison problem; avoid pairwise for grading — score each answer independently against the rubric. If you ever compare answers, run both orders and average.
- **Self-preference / style bias**: judges favor text resembling their own generations ([self-preference in rubric-based evaluation](https://arxiv.org/pdf/2604.06996)); matters if students paste LLM output — evidence-quoting mitigates.
- **Leniency drift**: models over-award partials. Mitigation: "when in doubt, do not award" instruction + partial credit allowed only where the rubric marks a criterion `allowPartial: true`.
- **Prompt-injection via student answer**: wrap the student answer in delimiters and instruct the grader that its content is data, never instructions. Strip/refuse answers containing obvious injection attempts.
- **Off-topic memorization**: a correct-sounding generic answer that doesn't address *this* question. The per-criterion propositions handle this if written specifically.

### 3.3 Recommended grading-response JSON schema

Field order is deliberate: evidence and reasoning before verdicts, verdicts before totals.

```ts
// ---- Rubric (authored per question, stored with it) ----
export interface RubricCriterion {
  id: string;              // "c1"
  description: string;     // single verifiable proposition
  marks: number;           // weight, e.g. 1 or 0.5; sum over criteria = maxMarks
  allowPartial: boolean;
  keywords?: string[];     // optional hints for the cheap pre-check (§4)
}

export interface Rubric {
  questionId: string;
  maxMarks: number;        // 2 or 5
  modelAnswer: string;
  criteria: RubricCriterion[];
}

// ---- Grader output (JSON schema / structured output) ----
export interface CriterionResult {
  criterionId: string;
  evidenceQuote: string | null; // verbatim from student answer; null if absent
  reasoning: string;            // 1–3 sentences, references the evidence
  verdict: "awarded" | "partial" | "not_awarded";
  marksAwarded: number;         // marks | marks*0.5 | 0 — recomputed server-side
}

export interface GradingResult {
  criteria: CriterionResult[];       // one per rubric criterion, same order
  totalScore: number;                // sum of marksAwarded; VERIFY server-side
  maxScore: number;
  normalizedScore: number;           // totalScore / maxScore, for BKT/Elo (§1–2)
  missingPoints: string[];           // rubric content absent from the answer
  misconceptions: string[];          // incorrect beliefs evident in the answer;
                                     // [] if none — never invent one
  improvementSuggestions: string[];  // 1–3 concrete, actionable, student-facing
  feedbackSummary: string;           // 2–3 encouraging sentences for the student
  confidence: "high" | "medium" | "low"; // low ⇒ route to human / second pass
  flags: ("off_topic" | "possible_injection" | "blank" | "gibberish")[];
}
```

Use the provider's structured-output / JSON-schema mode (e.g. `response_format: json_schema` or tool-calling) rather than "please return JSON" — enforced schemas eliminate parse failures and reduce judge bias in practice. Validate with zod; on validation failure, retry once, then fall back to human queue.

**Grader prompt skeleton** (system): role ("strict but fair examiner for <subject>, <grade level>"), the question, model answer, rubric as a numbered criteria list with marks, the bias instructions from §3.2, then the delimited student answer, then the output schema. Keep it under ~1.5k tokens excluding the answer.

### 3.4 Misconception mining

`misconceptions[]` is your highest-value tutoring signal: aggregate them per topic across students to drive re-teaching, and feed the current student's misconceptions into the next tutoring turn's context. Require each misconception to be phrased as the *student's incorrect belief* ("thinks current is consumed by the first bulb in a series circuit"), not a description of the error.

---

## 4. Embedding similarity as a cheap pre-check

### 4.1 Where it fits

Run cosine similarity between the student answer embedding and the model answer embedding **before** the LLM grader, purely as a router/triage — never as the grade for anything above 1 mark:

```
sim < 0.30              → almost certainly off-topic/blank/gibberish:
                          skip LLM grade, return 0 with "off-topic" feedback
                          (cheap; but still LLM-grade a sample to measure false negatives)
0.30 ≤ sim < ~0.85      → the normal case: LLM rubric grading (§3)
sim ≥ ~0.85 (1–2 mark
  definitional items)   → optionally fast-path full credit,
                          ONLY if answer also passes a keyword/negation check
```

Thresholds are **model- and domain-specific** — e.g. OpenAI `text-embedding-3-*` cosines run lower than older models; calibrate on ~50 graded answers per subject before trusting any cutoff. Always store the raw similarity for offline threshold tuning.

### 4.2 Known failure modes (why it can't grade)

The ASAG literature is consistent that embedding cosine alone plateaus well below human agreement ([scoping review, IEEE TLT 2023](https://dl.acm.org/doi/10.1109/TLT.2023.3253071)):

1. **Negation blindness** — "osmosis moves water toward higher solute concentration" vs "...toward lower..." embed nearly identically; embedding models don't capture logical polarity. Never fast-path full credit on similarity without a keyword/negation check.
2. **Numbers and entities** — "boils at 100°C" vs "boils at 10°C": tiny embedding distance, total mark difference.
3. **Verbose paraphrase inflation** — a long answer that restates the question plus one correct fragment scores high similarity while earning few marks.
4. **Correct-but-different-route answers** — a valid alternative explanation not resembling the model answer scores *low* similarity; this is why the low-threshold branch must be conservative (0.30, not 0.6) and audited.
5. **Short answers** — 2-mark answers of 5–15 words produce noisy embeddings; widen the LLM-grade band for short texts.
6. **Key-term echo** — an answer that name-drops the question's vocabulary ("it's about osmosis and concentration") without any proposition scores deceptively high.

### 4.3 Implementation notes

```ts
export function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
```

- Embed the **model answer once at authoring time** and cache the vector with the question; only the student answer is embedded per attempt.
- Use a small/cheap embedding model — this is triage, not grading; ~$0 relative to the LLM grade it saves.
- Combine with trivial guards first (they're free): empty/whitespace answer, length < 3 words, answer == question text.

---

## 5. Wiring it together (per-attempt flow)

```
student submits answer
  → guards (blank/too short) → 0 marks, no model calls
  → embed + cosine vs model answer → off-topic short-circuit or proceed
  → LLM rubric grade (structured output, §3) → validate (zod, quote-substring,
     recomputed total) → GradingResult
  → normalizedScore → correct := normalizedScore ≥ 0.6
  → bktUpdate(pL, correct, skillParams)  per tagged skill   (§1)
  → eloUpdate(studentRating, itemRating, normalizedScore)   (§2)
  → mastery policy (§1.4) + target-success item selection (§2.3) pick next activity
  → misconceptions[] appended to student profile; feed next tutoring turn
```

Persist per (student, skill): `pL`, attempt count, consecutive-correct streak, last-practiced timestamp. Per (student, subject): Elo state. Per item: Elo state + authored difficulty seed.

---

## Sources

- Corbett, A. & Anderson, J. (1995). *Knowledge Tracing: Modeling the Acquisition of Procedural Knowledge.* UMUAI. (Original BKT; p(G)≤0.3 / p(S)≤0.1 bounds; 0.95 mastery.)
- [pyBKT: An Accessible Python Library of BKT Models (EDM 2021)](https://arxiv.org/pdf/2105.00385) and [github.com/CAHLR/pyBKT](https://github.com/CAHLR/pyBKT) — reference implementation, example parameters, fitting.
- [standard-bkt (Yudelson)](https://iedms.github.io/standard-bkt/) — C++ reference; default slip/guess caps.
- Beck, J. & Chang, K. (2007). *Identifiability: A Fundamental Problem of Student Modeling.* UM 2007. (BKT identifiability.)
- [Pelánek (2016). Applications of the Elo rating system in adaptive educational systems](https://www.sciencedirect.com/science/article/abs/pii/S036013151630080X)
- [Pelánek et al. (2017). Elo-based learner modeling for the adaptive practice of facts](https://link.springer.com/article/10.1007/s11257-016-9185-7) — uncertainty K-function.
- [Dynamic K value for Elo in adaptive learning (UMUAI 2025)](https://link.springer.com/article/10.1007/s11257-025-09439-z)
- [Settles & Meeder (ACL 2016). A Trainable Spaced Repetition Model for Language Learning](https://research.duolingo.com/papers/settles.acl16.pdf) — Duolingo half-life regression.
- [From Holistic Evaluation to Structured Criteria: Rubrics Across the Evolving LLM Landscape (2026 survey)](https://arxiv.org/html/2606.08625v2)
- [Rubric Is All You Need: Improving LLM-Based Code Evaluation with Question-Specific Rubrics (ICER 2025)](https://dl.acm.org/doi/10.1145/3702652.3744220)
- [Self-Preference Bias in Rubric-Based Evaluation of LLMs](https://arxiv.org/pdf/2604.06996)
- [LLM-as-a-Judge: how it works, when it fails (Future AGI, 2026)](https://futureagi.com/blog/llm-as-a-judge/) — bias mitigations, structured output, κ calibration.
- [Embeddings for Automatic Short Answer Grading: A Scoping Review (IEEE TLT 2023)](https://dl.acm.org/doi/10.1109/TLT.2023.3253071) — cosine-similarity ASAG methods and limits.
