import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/curriculum — all grades with subject and chapter counts. */
export async function GET() {
  try {
    const grades = await prisma.curriculumGrade.findMany({
      orderBy: { number: 'asc' },
      include: {
        subjects: {
          orderBy: { orderIndex: 'asc' },
          include: { _count: { select: { chapters: true } } },
        },
      },
    });
    return NextResponse.json({
      grades: grades.map((g) => ({
        number: g.number,
        stage: g.stage,
        displayName: g.displayName,
        subjectCount: g.subjects.length,
        chapterCount: g.subjects.reduce((s, x) => s + x._count.chapters, 0),
        subjects: g.subjects.map((s) => ({
          name: s.name,
          slug: s.slug,
          icon: s.icon,
          color: s.color,
          stream: s.stream,
          chapterCount: s._count.chapters,
        })),
      })),
    });
  } catch (error) {
    console.error('curriculum GET error:', error);
    return NextResponse.json({ error: 'Failed to load curriculum' }, { status: 500 });
  }
}
