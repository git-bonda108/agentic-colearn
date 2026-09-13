import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveStudent } from '@/lib/student';
import { masteryLevel } from '@/lib/bkt';

export const dynamic = 'force-dynamic';

/**
 * POST /api/diagnostic/complete { chapterId }
 *
 * Called after a diagnostic entry test. Sets the BKT prior for the chapter
 * concept directly from diagnostic performance instead of letting it drift
 * from the flat 0.25 default. Only applies while the concept has few
 * attempts (≤ 8, i.e. essentially just the diagnostic) — once real practice
 * history exists, BKT's own updates are the truth and the prior is left alone.
 */
export async function POST(req: NextRequest) {
  try {
    const { chapterId } = await req.json();
    if (!chapterId) return NextResponse.json({ error: 'chapterId required' }, { status: 400 });

    const chapter = await prisma.curriculumChapter.findUnique({
      where: { id: chapterId },
      include: { subject: { include: { grade: true } } },
    });
    if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });

    const student = await getActiveStudent();
    const chapterKey = `g${chapter.subject.grade.number}.${chapter.subject.slug}.${chapter.slug}`;

    // Diagnostic performance = the student's recent attempts on this chapter.
    const attempts = await prisma.questionAttempt.findMany({
      where: { studentId: student.id, question: { chapterId } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    if (attempts.length === 0) {
      return NextResponse.json({ error: 'No attempts to diagnose from' }, { status: 400 });
    }

    const totalAwarded = attempts.reduce((s, a) => s + a.scoreAwarded, 0);
    const totalMax = attempts.reduce((s, a) => s + a.maxMarks, 0);
    const scoreFraction = totalMax > 0 ? totalAwarded / totalMax : 0;

    // Map performance → prior, kept inside (0.1, 0.9): a diagnostic is
    // evidence, not proof, so it never claims mastery or total ignorance.
    const prior = Math.min(0.9, Math.max(0.1, 0.15 + 0.7 * scoreFraction));

    const existing = await prisma.conceptMastery.findUnique({
      where: { studentId_conceptKey: { studentId: student.id, conceptKey: chapterKey } },
    });
    const applied = !existing || existing.attempts <= 8;
    if (applied) {
      await prisma.conceptMastery.upsert({
        where: { studentId_conceptKey: { studentId: student.id, conceptKey: chapterKey } },
        update: { pKnown: prior, lastPracticedAt: new Date() },
        create: {
          studentId: student.id,
          conceptKey: chapterKey,
          pKnown: prior,
          attempts: attempts.length,
        },
      });
      await prisma.agentEvent.create({
        data: {
          kind: 'diagnostic_prior_set',
          chapterId,
          payload: JSON.parse(
            JSON.stringify({
              conceptKey: chapterKey,
              scoreFraction: Math.round(scoreFraction * 100) / 100,
              prior,
              attemptsUsed: attempts.length,
            })
          ),
        },
      });
    }

    return NextResponse.json({
      applied,
      conceptKey: chapterKey,
      scoreFraction: Math.round(scoreFraction * 100) / 100,
      prior: applied ? prior : (existing?.pKnown ?? prior),
      level: masteryLevel(applied ? prior : (existing?.pKnown ?? prior)),
      reason: applied
        ? `Starting level set from your diagnostic: ${Math.round(scoreFraction * 100)}% across ${attempts.length} questions`
        : 'You already have practice history here — the diagnostic did not override it',
    });
  } catch (error) {
    console.error('diagnostic complete error:', error);
    return NextResponse.json({ error: 'Failed to apply diagnostic' }, { status: 500 });
  }
}
