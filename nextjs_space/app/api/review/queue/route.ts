import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveStudent } from '@/lib/student';
import { masteryLevel } from '@/lib/bkt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/review/queue — today's unified review session:
 *  - flashcards due under FSRS (fsrsDue <= now, or never reviewed)
 *  - weak concepts (BKT below 0.6) and stale mastered concepts (>7 days),
 *    each linked to its chapter so one tap lands in Practice.
 */
export async function GET(_req: NextRequest) {
  try {
    const now = new Date();
    const student = await getActiveStudent();

    const [dueCards, newCards, masteries] = await Promise.all([
      prisma.flashcard.findMany({
        where: { fsrsDue: { lte: now } },
        orderBy: { fsrsDue: 'asc' },
        take: 20,
        select: { id: true, front: true, subject: true, fsrsDue: true, fsrsStability: true },
      }),
      prisma.flashcard.findMany({
        where: { fsrsDue: null },
        orderBy: { createdAt: 'asc' },
        take: 10,
        select: { id: true, front: true, subject: true, fsrsDue: true, fsrsStability: true },
      }),
      prisma.conceptMastery.findMany({
        where: { studentId: student.id },
        orderBy: { pKnown: 'asc' },
      }),
    ]);

    const weakKeys = masteries.filter((m) => m.pKnown < 0.6).slice(0, 10);
    const staleKeys = masteries.filter(
      (m) =>
        m.pKnown >= 0.95 &&
        m.lastPracticedAt &&
        now.getTime() - m.lastPracticedAt.getTime() > 7 * 86_400_000
    );

    // Resolve chapter-level concept keys (g{n}.{subject}.{chapterSlug}) to chapters.
    const resolveConcept = async (conceptKey: string) => {
      const m = conceptKey.match(/^g(\d+)\.([a-z0-9-]+)\.((?:[a-z0-9-]+-)?ch-\d+)/);
      if (!m) return null;
      const chapter = await prisma.curriculumChapter.findFirst({
        where: {
          slug: m[3],
          subject: { slug: m[2], grade: { number: parseInt(m[1], 10) } },
        },
        select: { id: true, number: true, title: true, subject: { select: { name: true } } },
      });
      return chapter;
    };

    const concepts = [];
    for (const m of [...weakKeys, ...staleKeys.slice(0, 5)]) {
      const chapter = await resolveConcept(m.conceptKey);
      if (!chapter) continue;
      concepts.push({
        conceptKey: m.conceptKey,
        pKnown: m.pKnown,
        level: masteryLevel(m.pKnown),
        reason:
          m.pKnown < 0.6
            ? `Mastery is ${Math.round(m.pKnown * 100)}% — below the 60% developing threshold`
            : `Mastered, but last practiced ${Math.round(
                (now.getTime() - (m.lastPracticedAt?.getTime() ?? now.getTime())) / 86_400_000
              )} days ago — due for spaced review`,
        chapter: {
          id: chapter.id,
          number: chapter.number,
          title: chapter.title,
          subject: chapter.subject.name,
        },
      });
    }

    return NextResponse.json({
      generatedAt: now.toISOString(),
      flashcards: {
        due: dueCards,
        fresh: newCards,
        total: dueCards.length + newCards.length,
      },
      concepts,
      summary: `${dueCards.length + newCards.length} flashcards and ${concepts.length} concepts to review today`,
    });
  } catch (error) {
    console.error('review queue error:', error);
    return NextResponse.json({ error: 'Failed to build review queue' }, { status: 500 });
  }
}
