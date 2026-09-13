import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveStudent } from '@/lib/student';
import { masteryLevel } from '@/lib/bkt';

export const dynamic = 'force-dynamic';

/** GET /api/curriculum/[gradeNumber] — subjects with chapters and per-chapter mastery. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { gradeNumber: string } }
) {
  try {
    const number = parseInt(params.gradeNumber, 10);
    if (!Number.isInteger(number) || number < 1 || number > 12) {
      return NextResponse.json({ error: 'Invalid grade' }, { status: 400 });
    }
    const grade = await prisma.curriculumGrade.findUnique({
      where: { number },
      include: {
        subjects: {
          orderBy: { orderIndex: 'asc' },
          include: {
            chapters: {
              // Group multi-book subjects (SST, English readers, Physics parts)
              // by book, then by the official chapter number within each book.
              orderBy: [{ textbook: 'asc' }, { number: 'asc' }],
              include: {
                outcomes: true,
                _count: { select: { questions: true } },
              },
            },
          },
        },
      },
    });
    if (!grade) return NextResponse.json({ error: 'Grade not found' }, { status: 404 });

    const student = await getActiveStudent();
    const conceptKeys = grade.subjects.flatMap((s) =>
      s.chapters.flatMap((c) => [
        `g${number}.${s.slug}.${c.slug}`,
        ...c.outcomes.map((o) => o.conceptKey),
      ])
    );
    const mastery = await prisma.conceptMastery.findMany({
      where: { studentId: student.id, conceptKey: { in: conceptKeys } },
    });
    const masteryByKey = new Map(mastery.map((m) => [m.conceptKey, m]));

    return NextResponse.json({
      grade: { number: grade.number, stage: grade.stage, displayName: grade.displayName },
      subjects: grade.subjects.map((s) => ({
        name: s.name,
        slug: s.slug,
        icon: s.icon,
        color: s.color,
        stream: s.stream,
        chapters: s.chapters.map((c) => {
          const keys = [
            `g${number}.${s.slug}.${c.slug}`,
            ...c.outcomes.map((o) => o.conceptKey),
          ];
          const states = keys
            .map((k) => masteryByKey.get(k))
            .filter((m): m is NonNullable<typeof m> => Boolean(m));
          const pKnown =
            states.length > 0
              ? states.reduce((sum, m) => sum + m.pKnown, 0) / states.length
              : null;
          return {
            id: c.id,
            number: c.number,
            title: c.title,
            summary: c.summary,
            textbook: c.textbook,
            questionCount: c._count.questions,
            outcomeCount: c.outcomes.length,
            hasLesson: c.contentCache !== null,
            pKnown,
            masteryLevel: pKnown === null ? null : masteryLevel(pKnown),
          };
        }),
      })),
    });
  } catch (error) {
    console.error('grade GET error:', error);
    return NextResponse.json({ error: 'Failed to load grade' }, { status: 500 });
  }
}
