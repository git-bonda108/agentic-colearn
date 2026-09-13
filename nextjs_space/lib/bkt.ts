/**
 * Bayesian Knowledge Tracing (BKT) — the diagnostic engine.
 *
 * Standard 4-parameter model (Corbett & Anderson, 1995):
 *   pKnown  — P(L): probability the student has mastered the concept
 *   pTransit— P(T): probability of learning the concept on each practice
 *   pSlip   — P(S): probability of answering wrong despite mastery
 *   pGuess  — P(G): probability of answering right without mastery
 *
 * Extended with partial-credit observations so subjective answers
 * (2/3/5-mark questions scored 0..1 by the Evaluation Agent) update the
 * knowledge state proportionally, not just binary right/wrong.
 */

export interface BKTParams {
  pInit: number; // P(L0)
  pTransit: number; // P(T)
  pSlip: number; // P(S)
  pGuess: number; // P(G)
}

export interface BKTState {
  pKnown: number;
  attempts: number;
}

/** Sensible literature-backed defaults; slip/guess kept within standard bounds. */
export const DEFAULT_PARAMS: BKTParams = {
  pInit: 0.25,
  pTransit: 0.2,
  pSlip: 0.1,
  pGuess: 0.2,
};

/** Question-type-aware guess probabilities (an MCQ is guessable; a 5-mark answer is not). */
export const GUESS_BY_TYPE: Record<string, number> = {
  mcq: 0.25,
  true_false: 0.5,
  fill_blank: 0.1,
  match: 0.15,
  assertion_reason: 0.25,
  vsa_2: 0.05,
  sa_3: 0.03,
  la_5: 0.02,
  la_7: 0.02,
  numerical: 0.05,
  case_study: 0.05,
  olympiad_mcq: 0.25,
  olympiad_reasoning: 0.25,
  olympiad_hots: 0.25,
};

export const MASTERY_THRESHOLD = 0.95;
export const DEVELOPING_THRESHOLD = 0.6;

export type MasteryLevel = 'mastered' | 'developing' | 'needs_work';

export function masteryLevel(pKnown: number): MasteryLevel {
  if (pKnown >= MASTERY_THRESHOLD) return 'mastered';
  if (pKnown >= DEVELOPING_THRESHOLD) return 'developing';
  return 'needs_work';
}

/** P(correct) prediction given current knowledge state. */
export function predictCorrect(pKnown: number, params: BKTParams): number {
  return pKnown * (1 - params.pSlip) + (1 - pKnown) * params.pGuess;
}

function posteriorGivenCorrect(pKnown: number, p: BKTParams): number {
  const num = pKnown * (1 - p.pSlip);
  const den = num + (1 - pKnown) * p.pGuess;
  return den === 0 ? pKnown : num / den;
}

function posteriorGivenIncorrect(pKnown: number, p: BKTParams): number {
  const num = pKnown * p.pSlip;
  const den = num + (1 - pKnown) * (1 - p.pGuess);
  return den === 0 ? pKnown : num / den;
}

/**
 * Update the knowledge estimate after an observation.
 *
 * @param pKnown       current P(L)
 * @param scoreFraction 0..1 — 1 for fully correct, 0 for wrong, in between for
 *                      partial credit on subjective answers. The posterior is a
 *                      score-weighted blend of the correct/incorrect posteriors.
 * @param questionType key into GUESS_BY_TYPE (falls back to default pGuess)
 */
export function bktUpdate(
  pKnown: number,
  scoreFraction: number,
  questionType?: string,
  overrides?: Partial<BKTParams>
): number {
  const params: BKTParams = {
    ...DEFAULT_PARAMS,
    ...(questionType && GUESS_BY_TYPE[questionType] !== undefined
      ? { pGuess: GUESS_BY_TYPE[questionType] }
      : {}),
    ...overrides,
  };
  const w = Math.max(0, Math.min(1, scoreFraction));
  const postCorrect = posteriorGivenCorrect(pKnown, params);
  const postIncorrect = posteriorGivenIncorrect(pKnown, params);
  const posterior = w * postCorrect + (1 - w) * postIncorrect;
  // Learning step: chance the concept was acquired during this practice
  const updated = posterior + (1 - posterior) * params.pTransit;
  return Math.max(0.001, Math.min(0.999, updated));
}

/**
 * Recommend what to practice next: lowest pKnown first, with a slight boost
 * for concepts never attempted (exploration) and a decay-based review nudge
 * for mastered concepts not seen recently.
 */
export interface ConceptSnapshot {
  conceptKey: string;
  pKnown: number;
  attempts: number;
  lastPracticedAt?: Date | null;
}

export interface Recommendation {
  conceptKey: string;
  priority: number; // higher = practice sooner
  reason: string;
}

export function recommendNext(concepts: ConceptSnapshot[], now = new Date()): Recommendation[] {
  return concepts
    .map((c) => {
      let priority = 1 - c.pKnown;
      let reason = 'Strengthen this concept';
      if (c.attempts === 0) {
        priority += 0.15;
        reason = 'Not yet attempted — take the diagnostic';
      } else if (c.pKnown >= MASTERY_THRESHOLD) {
        const days = c.lastPracticedAt
          ? (now.getTime() - new Date(c.lastPracticedAt).getTime()) / 86_400_000
          : 0;
        // Spaced-review nudge: mastered concepts resurface after ~a week
        priority = Math.min(0.3, days / 30);
        reason = days > 7 ? 'Review to retain mastery' : 'Mastered';
      } else if (c.pKnown < DEVELOPING_THRESHOLD) {
        reason = 'Weak area — focus here first';
      }
      return { conceptKey: c.conceptKey, priority, reason };
    })
    .sort((a, b) => b.priority - a.priority);
}

/** Pick the next question difficulty from the current knowledge state (simple ZPD targeting). */
export function targetDifficulty(pKnown: number): 'easy' | 'medium' | 'hard' {
  if (pKnown < 0.4) return 'easy';
  if (pKnown < 0.8) return 'medium';
  return 'hard';
}
