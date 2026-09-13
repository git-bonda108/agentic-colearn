/**
 * Item Response Theory (2-PL) — question calibration and ability estimation.
 *
 * P(correct | θ) = 1 / (1 + exp(-a(θ - b)))
 *   θ = student ability, b = item difficulty, a = item discrimination.
 *
 * Calibration is honest about data sufficiency: an item keeps its defaults
 * until it has MIN_ATTEMPTS graded attempts, and every stored parameter
 * records the sample size it came from. All computation is deterministic
 * and free (no LLM).
 */

export const MIN_ATTEMPTS_FOR_CALIBRATION = 10;

export interface ItemParams {
  a: number; // discrimination
  b: number; // difficulty
}

export interface AttemptObs {
  /** Score fraction in [0,1]; thresholded at 0.5 into correct/incorrect for 2-PL. */
  scoreFraction: number;
  /** Ability estimate of the student at attempt time (θ). */
  theta: number;
}

export const DEFAULT_ITEM: ItemParams = { a: 1.0, b: 0.0 };

const CLAMP = { aMin: 0.3, aMax: 2.5, bMin: -3, bMax: 3 };

export function pCorrect(theta: number, item: ItemParams): number {
  return 1 / (1 + Math.exp(-item.a * (theta - item.b)));
}

/** Fisher information of an item at ability θ — used for adaptive selection. */
export function itemInformation(theta: number, item: ItemParams): number {
  const p = pCorrect(theta, item);
  return item.a * item.a * p * (1 - p);
}

/**
 * Map a BKT mastery estimate to an ability prior on the θ scale.
 * pKnown 0.5 ↦ θ 0; the logit transform keeps the two scales consistent.
 */
export function thetaFromMastery(pKnown: number): number {
  const p = Math.min(0.99, Math.max(0.01, pKnown));
  return Math.max(-3, Math.min(3, Math.log(p / (1 - p))));
}

/**
 * Estimate θ by maximum likelihood over a set of answered items
 * (Newton–Raphson on the log-likelihood; falls back to the prior when the
 * response pattern is degenerate, e.g. all correct).
 */
export function estimateAbility(
  responses: { item: ItemParams; correct: boolean }[],
  priorTheta = 0
): number {
  if (responses.length === 0) return priorTheta;
  let theta = priorTheta;
  for (let iter = 0; iter < 20; iter++) {
    let grad = 0;
    let hess = 0;
    for (const r of responses) {
      const p = pCorrect(theta, r.item);
      grad += r.item.a * ((r.correct ? 1 : 0) - p);
      hess -= r.item.a * r.item.a * p * (1 - p);
    }
    // Weak Gaussian prior N(priorTheta, 1) keeps degenerate patterns finite.
    grad -= theta - priorTheta;
    hess -= 1;
    const step = grad / hess;
    theta -= step;
    theta = Math.max(-3.5, Math.min(3.5, theta));
    if (Math.abs(step) < 1e-4) break;
  }
  return theta;
}

/**
 * Calibrate one item's (a, b) from observed attempts by gradient ascent on
 * the Bernoulli log-likelihood, with clamps and a pull toward defaults that
 * weakens as the sample grows. Returns null when there is not enough data —
 * callers must treat null as "keep defaults", never as (0, 0).
 */
export function calibrateItem(observations: AttemptObs[]): ItemParams | null {
  if (observations.length < MIN_ATTEMPTS_FOR_CALIBRATION) return null;
  const obs = observations.map((o) => ({ y: o.scoreFraction >= 0.5 ? 1 : 0, theta: o.theta }));

  // Degenerate: all same outcome → b is only bounded, not identified. Use a
  // conservative shift instead of running to the clamp.
  const successes = obs.reduce((s, o) => s + o.y, 0);
  if (successes === 0 || successes === obs.length) {
    const meanTheta = obs.reduce((s, o) => s + o.theta, 0) / obs.length;
    return {
      a: DEFAULT_ITEM.a,
      b: Math.max(CLAMP.bMin, Math.min(CLAMP.bMax, meanTheta + (successes === 0 ? 1 : -1))),
    };
  }

  let a = DEFAULT_ITEM.a;
  let b = DEFAULT_ITEM.b;
  const lr = 0.05;
  const priorWeight = MIN_ATTEMPTS_FOR_CALIBRATION / obs.length; // fades with data

  for (let iter = 0; iter < 300; iter++) {
    let gradA = 0;
    let gradB = 0;
    for (const o of obs) {
      const p = pCorrect(o.theta, { a, b });
      const err = o.y - p;
      gradA += err * (o.theta - b);
      gradB += err * -a;
    }
    // Regularize toward defaults so small samples don't produce wild items.
    gradA -= priorWeight * (a - DEFAULT_ITEM.a);
    gradB -= priorWeight * (b - DEFAULT_ITEM.b);

    a = Math.max(CLAMP.aMin, Math.min(CLAMP.aMax, a + lr * (gradA / obs.length)));
    b = Math.max(CLAMP.bMin, Math.min(CLAMP.bMax, b + lr * (gradB / obs.length)));
    if (Math.abs(gradA / obs.length) < 1e-4 && Math.abs(gradB / obs.length) < 1e-4) break;
  }
  return { a: Math.round(a * 100) / 100, b: Math.round(b * 100) / 100 };
}

/**
 * Order candidate questions by information at the student's ability —
 * the adaptive-selection core. Uncalibrated items use defaults, which makes
 * them mildly informative everywhere (they still get asked and thus gather
 * calibration data).
 */
export function orderByInformation<T extends { irtDifficulty?: number | null; irtDiscrimination?: number | null }>(
  questions: T[],
  theta: number
): T[] {
  return [...questions].sort((q1, q2) => {
    const i1 = itemInformation(theta, {
      a: q1.irtDiscrimination ?? DEFAULT_ITEM.a,
      b: q1.irtDifficulty ?? DEFAULT_ITEM.b,
    });
    const i2 = itemInformation(theta, {
      a: q2.irtDiscrimination ?? DEFAULT_ITEM.a,
      b: q2.irtDifficulty ?? DEFAULT_ITEM.b,
    });
    return i2 - i1;
  });
}
