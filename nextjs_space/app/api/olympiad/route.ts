import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  OLYMPIAD_EXAMS,
  OLYMPIAD_SOURCES,
  examsForGrade,
  olympiadFormat,
  syllabusSubjectsFor,
} from '@/lib/olympiad-data';

export const dynamic = 'force-dynamic';

/**
 * GET /api/olympiad                 → exam registry + trusted sources
 * GET /api/olympiad?grade=N         → exams for that class, each with the
 *                                     official format and its syllabus mapped
 *                                     to the class's real NCERT chapters
 *                                     (which carry the lessons/visuals).
 */
export async function GET(req: NextRequest) {
  try {
    const gradeParam = req.nextUrl.searchParams.get('grade');
    if (!gradeParam) {
      return NextResponse.json({
        exams: OLYMPIAD_EXAMS.map((e) => ({
          slug: e.slug,
          abbrev: e.abbrev,
          name: e.name,
          description: e.description,
          minClass: e.minClass,
          maxClass: e.maxClass,
          practiceable: e.practiceable,
          color: e.color,
        })),
        sources: OLYMPIAD_SOURCES,
      });
    }

    const gradeNumber = parseInt(gradeParam, 10);
    if (!Number.isInteger(gradeNumber) || gradeNumber < 1 || gradeNumber > 12) {
      return NextResponse.json({ error: 'grade must be 1-12' }, { status: 400 });
    }

    const grade = await prisma.curriculumGrade.findUnique({
      where: { number: gradeNumber },
      include: {
        subjects: {
          orderBy: { orderIndex: 'asc' },
          include: {
            chapters: {
              orderBy: { number: 'asc' },
              select: {
                id: true,
                number: true,
                title: true,
                slug: true,
                textbook: true,
                contentCache: true,
              },
            },
          },
        },
      },
    });
    if (!grade) return NextResponse.json({ error: 'Grade not found' }, { status: 404 });

    // Which chapters have an ingested official corpus (grounded material)?
    const chapterIds = grade.subjects.flatMap((s) => s.chapters.map((c) => c.id));
    const ingested = await prisma.contentChunk.groupBy({
      by: ['chapterId'],
      where: { chapterId: { in: chapterIds } },
      _count: { _all: true },
    });
    const ingestedSet = new Set(ingested.map((r) => r.chapterId));

    const subjectsBySlug = new Map(grade.subjects.map((s) => [s.slug, s]));
    const olympiadAnchor = subjectsBySlug.get('olympiad');

    const exams = examsForGrade(gradeNumber).map((exam) => {
      const syllabus = syllabusSubjectsFor(exam, gradeNumber)
        .map((slug) => subjectsBySlug.get(slug))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .map((s) => ({
          slug: s.slug,
          name: s.name,
          icon: s.icon,
          color: s.color,
          chapters: s.chapters.map((c) => ({
            id: c.id,
            number: c.number,
            title: c.title,
            textbook: c.textbook,
            hasLesson: c.contentCache !== null,
            grounded: ingestedSet.has(c.id),
          })),
        }));
      return {
        slug: exam.slug,
        abbrev: exam.abbrev,
        name: exam.name,
        description: exam.description,
        practiceable: exam.practiceable,
        color: exam.color,
        format: olympiadFormat(gradeNumber),
        syllabus,
      };
    });

    return NextResponse.json({
      grade: { number: grade.number, displayName: grade.displayName },
      exams,
      anchors: olympiadAnchor
        ? {
            reasoningChapterId: olympiadAnchor.chapters.find((c) => c.number === 1)?.id ?? null,
            hotsChapterId: olympiadAnchor.chapters.find((c) => c.number === 2)?.id ?? null,
          }
        : { reasoningChapterId: null, hotsChapterId: null },
      sources: OLYMPIAD_SOURCES,
    });
  } catch (error) {
    console.error('olympiad GET error:', error);
    return NextResponse.json({ error: 'Failed to load olympiad data' }, { status: 500 });
  }
}
