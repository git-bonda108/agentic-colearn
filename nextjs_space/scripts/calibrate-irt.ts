/**
 * IRT calibration job — fits 2-PL parameters for every question with enough
 * graded attempts, and stores them with the sample size used. Deterministic,
 * zero AI cost, idempotent. Run periodically (or after heavy practice):
 *
 *   npx tsx --require dotenv/config scripts/calibrate-irt.ts
 */
import { PrismaClient } from '@prisma/client';
import { calibrateItem, thetaFromMastery, MIN_ATTEMPTS_FOR_CALIBRATION } from '../lib/irt';

const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.question.findMany({
    include: {
      attempts: { orderBy: { createdAt: 'asc' } },
      chapter: { include: { subject: { include: { grade: true } } } },
    },
  });

  let calibrated = 0;
  let skipped = 0;

  for (const q of questions) {
    if (q.attempts.length < MIN_ATTEMPTS_FOR_CALIBRATION) {
      skipped++;
      continue;
    }
    const chapterKey = `g${q.chapter.subject.grade.number}.${q.chapter.subject.slug}.${q.chapter.slug}`;

    // θ per attempt: the student's chapter mastery at (approximately) attempt
    // time. We use current mastery as a proxy — refined per-attempt ability
    // history can come later; the regularizer keeps this stable.
    const observations = [];
    for (const a of q.attempts) {
      const mastery = await prisma.conceptMastery.findUnique({
        where: { studentId_conceptKey: { studentId: a.studentId, conceptKey: chapterKey } },
      });
      observations.push({
        scoreFraction: a.maxMarks > 0 ? a.scoreAwarded / a.maxMarks : 0,
        theta: thetaFromMastery(mastery?.pKnown ?? 0.25),
      });
    }

    const params = calibrateItem(observations);
    if (!params) {
      skipped++;
      continue;
    }
    await prisma.question.update({
      where: { id: q.id },
      data: {
        irtDifficulty: params.b,
        irtDiscrimination: params.a,
        irtSampleSize: observations.length,
      },
    });
    calibrated++;
    console.log(
      `  ✓ ${q.type} "${q.prompt.slice(0, 50)}…" → a=${params.a} b=${params.b} (n=${observations.length})`
    );
  }

  console.log(`\nCalibrated ${calibrated} questions; ${skipped} kept defaults (need ≥${MIN_ATTEMPTS_FOR_CALIBRATION} attempts).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
