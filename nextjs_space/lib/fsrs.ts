/**
 * FSRS (Free Spaced Repetition Scheduler) — FSRS-4.5 with the open-source
 * default weights. Replaces SM-2: FSRS models memory with two state
 * variables (stability S = days for recall probability to fall to 90%,
 * difficulty D ∈ [1,10]) and consistently outperforms SM-2 on real review
 * logs. Deterministic, zero AI cost.
 *
 * Ratings: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy.
 */

export type FsrsRating = 1 | 2 | 3 | 4;

export interface FsrsState {
  stability: number;
  difficulty: number;
  lastReview: Date;
  due: Date;
}

/** FSRS-4.5 default parameters (open-spaced-repetition defaults; tunable per user later). */
const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461,
  2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
];

const DECAY = -0.5;
const FACTOR = 19 / 81; // so R(S, S) = 0.9
const REQUEST_RETENTION = 0.9;
const MAX_INTERVAL_DAYS = 365;

const clampD = (d: number) => Math.min(10, Math.max(1, d));

/** Probability of recall after `elapsedDays` given stability. */
export function retrievability(elapsedDays: number, stability: number): number {
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

function intervalDays(stability: number): number {
  const days = (stability / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(days)));
}

function initialStability(rating: FsrsRating): number {
  return Math.max(0.1, W[rating - 1]);
}

function initialDifficulty(rating: FsrsRating): number {
  return clampD(W[4] - (rating - 3) * W[5]);
}

function nextDifficulty(d: number, rating: FsrsRating): number {
  const dNew = d - W[6] * (rating - 3);
  // mean reversion toward the initial difficulty of a "Good" rating
  return clampD(W[7] * initialDifficulty(3) + (1 - W[7]) * dNew);
}

function stabilityAfterRecall(d: number, s: number, r: number, rating: FsrsRating): number {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;
  return (
    s *
    (1 +
      Math.exp(W[8]) *
        (11 - d) *
        Math.pow(s, -W[9]) *
        (Math.exp(W[10] * (1 - r)) - 1) *
        hardPenalty *
        easyBonus)
  );
}

function stabilityAfterForget(d: number, s: number, r: number): number {
  return Math.max(
    0.1,
    W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r))
  );
}

/**
 * Schedule a review. `prev` is null for the first FSRS review of a card
 * (including cards migrating from SM-2 — they start fresh, which is safe).
 */
export function fsrsReview(
  prev: { stability: number; difficulty: number; lastReview: Date } | null,
  rating: FsrsRating,
  now = new Date()
): FsrsState {
  let stability: number;
  let difficulty: number;

  if (!prev) {
    stability = initialStability(rating);
    difficulty = initialDifficulty(rating);
  } else {
    const elapsed = Math.max(0, (now.getTime() - prev.lastReview.getTime()) / 86_400_000);
    const r = retrievability(elapsed, prev.stability);
    difficulty = nextDifficulty(prev.difficulty, rating);
    stability =
      rating === 1
        ? stabilityAfterForget(prev.difficulty, prev.stability, r)
        : stabilityAfterRecall(prev.difficulty, prev.stability, r, rating);
  }

  const days = rating === 1 ? 0 : intervalDays(stability);
  const due =
    rating === 1
      ? new Date(now.getTime() + 10 * 60 * 1000) // relearn in ~10 minutes
      : new Date(now.getTime() + days * 86_400_000);

  return {
    stability: Math.round(stability * 100) / 100,
    difficulty: Math.round(difficulty * 100) / 100,
    lastReview: now,
    due,
  };
}

/** Map the legacy SM-2 quality slider (0-5) onto FSRS ratings. */
export function ratingFromSm2Quality(quality: number): FsrsRating {
  if (quality <= 2) return 1;
  if (quality === 3) return 2;
  if (quality === 4) return 3;
  return 4;
}
