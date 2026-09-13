import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveStudent } from '@/lib/student';
import { masteryLevel } from '@/lib/bkt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard — everything the dashboard shows, resolved server-side:
 * mastery with human-readable chapter names, weekly activity, recent
 * attempts, and agent telemetry counts. All numbers come from persisted rows.
 */
export async function GET() {
  try {
    const student = await getActiveStudent();
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);

    const [masteries, attemptStats, recentAttempts, weekAttempts, agentEvents, corpusStats] =
      await Promise.all([
        prisma.conceptMastery.findMany({
          where: { studentId: student.id },
          orderBy: { lastPracticedAt: 'desc' },
        }),
        prisma.questionAttempt.aggregate({
          where: { studentId: student.id },
          _count: true,
          _sum: { scoreAwarded: true, maxMarks: true },
        }),
        prisma.questionAttempt.findMany({
          where: { studentId: student.id },
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: {
            question: {
              select: {
                type: true,
                prompt: true,
                chapter: {
                  select: {
                    id: true,
                    number: true,
                    title: true,
                    subject: { select: { name: true, grade: { select: { number: true } } } },
                  },
                },
              },
            },
          },
        }),
        prisma.questionAttempt.count({
          where: { studentId: student.id, createdAt: { gte: weekAgo } },
        }),
        prisma.agentEvent.groupBy({ by: ['kind'], _count: true }),
        prisma.contentChunk.groupBy({ by: ['chapterId'], _count: true }),
      ]);

    // Resolve chapter-level concept keys to chapters for readable mastery rows.
    const chapterKeys = masteries.filter((m) => /\.(?:[a-z0-9-]+-)?ch-\d+$/.test(m.conceptKey));
    const resolved = [];
    for (const m of chapterKeys) {
      const parsed = m.conceptKey.match(/^g(\d+)\.([a-z0-9-]+)\.((?:[a-z0-9-]+-)?ch-\d+)$/);
      if (!parsed) continue;
      const chapter = await prisma.curriculumChapter.findFirst({
        where: {
          slug: parsed[3],
          subject: { slug: parsed[2], grade: { number: parseInt(parsed[1], 10) } },
        },
        select: {
          id: true,
          number: true,
          title: true,
          subject: { select: { name: true, grade: { select: { number: true } } } },
        },
      });
      if (!chapter) continue;
      resolved.push({
        chapterId: chapter.id,
        grade: chapter.subject.grade.number,
        subject: chapter.subject.name,
        chapter: `Ch ${chapter.number}: ${chapter.title}`,
        pKnown: m.pKnown,
        level: masteryLevel(m.pKnown),
        attempts: m.attempts,
        lastPracticedAt: m.lastPracticedAt,
      });
    }

    return NextResponse.json({
      student: { name: student.name, grade: student.grade },
      totals: {
        attempts: attemptStats._count,
        weekAttempts,
        marksEarned: Math.round((attemptStats._sum.scoreAwarded ?? 0) * 10) / 10,
        marksPossible: attemptStats._sum.maxMarks ?? 0,
        conceptsTracked: masteries.length,
        mastered: masteries.filter((m) => masteryLevel(m.pKnown) === 'mastered').length,
        developing: masteries.filter((m) => masteryLevel(m.pKnown) === 'developing').length,
        needsWork: masteries.filter((m) => masteryLevel(m.pKnown) === 'needs_work').length,
      },
      chapters: resolved,
      recentAttempts: recentAttempts.map((a) => ({
        id: a.id,
        when: a.createdAt,
        type: a.question.type,
        promptPreview: a.question.prompt.slice(0, 70),
        score: a.scoreAwarded,
        maxMarks: a.maxMarks,
        chapterId: a.question.chapter.id,
        where: `G${a.question.chapter.subject.grade.number} ${a.question.chapter.subject.name} · Ch ${a.question.chapter.number}`,
      })),
      system: {
        groundedChapters: corpusStats.length,
        agentEvents: Object.fromEntries(agentEvents.map((e) => [e.kind, e._count])),
      },
    });
  } catch (error) {
    console.error('dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
