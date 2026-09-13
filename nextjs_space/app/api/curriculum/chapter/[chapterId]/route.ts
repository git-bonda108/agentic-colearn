import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveStudent } from '@/lib/student';
import { masteryLevel, recommendNext } from '@/lib/bkt';

export const dynamic = 'force-dynamic';

/** GET /api/curriculum/chapter/[chapterId] — full chapter detail for the learn/practice UI. */
export async function GET(
  req: NextRequest,
  { params }: { params: { chapterId: string } }
) {
  try {
    const chapter = await prisma.curriculumChapter.findUnique({
      where: { id: params.chapterId },
      include: {
        subject: { include: { grade: true } },
        outcomes: true,
        questions: {
          select: { id: true, type: true, marks: true, difficulty: true, source: true },
        },
      },
    });
    if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });

    const student = await getActiveStudent();
    const gradeNumber = chapter.subject.grade.number;
    const chapterKey = `g${gradeNumber}.${chapter.subject.slug}.${chapter.slug}`;
    const conceptKeys = [chapterKey, ...chapter.outcomes.map((o) => o.conceptKey)];

    const [mastery, attempts] = await Promise.all([
      prisma.conceptMastery.findMany({
        where: { studentId: student.id, conceptKey: { in: conceptKeys } },
      }),
      prisma.questionAttempt.findMany({
        where: {
          studentId: student.id,
          question: { chapterId: chapter.id },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          questionId: true,
          scoreAwarded: true,
          maxMarks: true,
          createdAt: true,
          question: { select: { type: true, prompt: true } },
        },
      }),
    ]);

    const masteryByKey = new Map(mastery.map((m) => [m.conceptKey, m]));
    const concepts = chapter.outcomes.map((o) => {
      const m = masteryByKey.get(o.conceptKey);
      return {
        code: o.code,
        description: o.description,
        conceptKey: o.conceptKey,
        pKnown: m?.pKnown ?? null,
        attempts: m?.attempts ?? 0,
        level: m ? masteryLevel(m.pKnown) : null,
        lastPracticedAt: m?.lastPracticedAt ?? null,
      };
    });

    const recommendations = recommendNext(
      concepts.map((c) => ({
        conceptKey: c.conceptKey,
        pKnown: c.pKnown ?? 0.25,
        attempts: c.attempts,
        lastPracticedAt: c.lastPracticedAt,
      }))
    ).slice(0, 3);

    const questionsByType: Record<string, number> = {};
    for (const q of chapter.questions) {
      questionsByType[q.type] = (questionsByType[q.type] ?? 0) + 1;
    }

    const chapterState = masteryByKey.get(chapterKey);

    // contentCache is a per-language lesson map { en: lesson, hi: lesson, … };
    // legacy caches are a single (English) lesson object with `.sections`.
    const rawCache = chapter.contentCache as any;
    const cacheMap: Record<string, any> =
      rawCache && typeof rawCache === 'object'
        ? rawCache.sections
          ? { en: rawCache }
          : rawCache
        : {};
    const requestedLang = req.nextUrl.searchParams.get('lang');
    const pref = requestedLang ?? student.preferredLanguages?.[0] ?? 'en';
    const lessonLang = cacheMap[pref] ? pref : 'en';

    return NextResponse.json({
      chapter: {
        id: chapter.id,
        number: chapter.number,
        title: chapter.title,
        summary: chapter.summary,
        textbook: chapter.textbook,
        lesson: cacheMap[lessonLang] ?? null,
        lessonLanguages: Object.keys(cacheMap),
        preferredLanguage: pref,
      },
      subject: {
        name: chapter.subject.name,
        slug: chapter.subject.slug,
        color: chapter.subject.color,
        icon: chapter.subject.icon,
      },
      grade: { number: gradeNumber, displayName: chapter.subject.grade.displayName },
      outcomes: concepts,
      chapterMastery: chapterState
        ? { pKnown: chapterState.pKnown, level: masteryLevel(chapterState.pKnown), attempts: chapterState.attempts }
        : null,
      questionsByType,
      totalQuestions: chapter.questions.length,
      recentAttempts: attempts.map((a) => ({
        id: a.id,
        questionId: a.questionId,
        type: a.question.type,
        promptPreview: a.question.prompt.slice(0, 120),
        scoreAwarded: a.scoreAwarded,
        maxMarks: a.maxMarks,
        createdAt: a.createdAt,
      })),
      recommendations: recommendations.map((r) => {
        const c = concepts.find((x) => x.conceptKey === r.conceptKey);
        return { ...r, code: c?.code, description: c?.description };
      }),
    });
  } catch (error) {
    console.error('chapter GET error:', error);
    return NextResponse.json({ error: 'Failed to load chapter' }, { status: 500 });
  }
}
