import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveStudent } from '@/lib/student';
import { masteryLevel } from '@/lib/bkt';

export const dynamic = 'force-dynamic';

/** GET /api/mastery — the demo student's full BKT state and attempt totals. */
export async function GET() {
  try {
    const student = await getActiveStudent();
    const [mastery, attemptStats] = await Promise.all([
      prisma.conceptMastery.findMany({
        where: { studentId: student.id },
        orderBy: { lastPracticedAt: 'desc' },
      }),
      prisma.questionAttempt.aggregate({
        where: { studentId: student.id },
        _count: true,
        _sum: { scoreAwarded: true, maxMarks: true },
      }),
    ]);
    return NextResponse.json({
      student: { name: student.name, grade: student.grade },
      totals: {
        attempts: attemptStats._count,
        marksEarned: attemptStats._sum.scoreAwarded ?? 0,
        marksPossible: attemptStats._sum.maxMarks ?? 0,
        conceptsTracked: mastery.length,
        conceptsMastered: mastery.filter((m) => m.pKnown >= 0.95).length,
      },
      concepts: mastery.map((m) => ({
        conceptKey: m.conceptKey,
        pKnown: m.pKnown,
        level: masteryLevel(m.pKnown),
        attempts: m.attempts,
        lastPracticedAt: m.lastPracticedAt,
      })),
    });
  } catch (error) {
    console.error('mastery GET error:', error);
    return NextResponse.json({ error: 'Failed to load mastery' }, { status: 500 });
  }
}
