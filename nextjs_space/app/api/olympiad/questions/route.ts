import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateQuestions } from '@/lib/question-generator';
import { getChapterContext, formatSourceBlock } from '@/lib/corpus';
import { verifyQuestion } from '@/lib/verifier';
import { OLYMPIAD_EXAMS, olympiadFormat, syllabusSubjectsFor } from '@/lib/olympiad-data';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SECTION_TYPES: Record<string, 'olympiad_mcq' | 'olympiad_reasoning' | 'olympiad_hots'> = {
  subject: 'olympiad_mcq',
  reasoning: 'olympiad_reasoning',
  hots: 'olympiad_hots',
};

/**
 * Olympiad practice questions — same engine as school practice
 * (generate → adversarially verify → store; keys never leave the server).
 *
 * GET  ?grade=N&exam=slug&section=subject|reasoning|hots → stored questions
 * POST { grade, exam, section, count? } → generate a fresh practice round:
 *   - subject/HOTS sections anchor to one of the class's real NCERT chapters
 *     (preferring chapters whose official text is ingested → grounded MCQs);
 *   - reasoning anchors to the class's "Olympiad Prep · Logical Reasoning"
 *     chapter (reasoning is syllabus-independent by design — see
 *     lib/olympiad-data.ts).
 */

async function resolveContext(gradeNumber: number, examSlug: string, section: string) {
  const exam = OLYMPIAD_EXAMS.find((e) => e.slug === examSlug);
  if (!exam) return { error: `Unknown exam: ${examSlug}` };
  if (gradeNumber < exam.minClass || gradeNumber > exam.maxClass) {
    return { error: `${exam.abbrev} is not conducted for Class ${gradeNumber}` };
  }
  if (!exam.practiceable) {
    return { error: `${exam.abbrev} is not an MCQ exam — in-app practice does not apply` };
  }
  if (!SECTION_TYPES[section]) return { error: `Unknown section: ${section}` };

  const subjectSlugs =
    section === 'reasoning' ? ['olympiad'] : syllabusSubjectsFor(exam, gradeNumber);
  const anchorSlugs = subjectSlugs.length > 0 ? subjectSlugs : ['olympiad'];

  const subjects = await prisma.curriculumSubject.findMany({
    where: { grade: { number: gradeNumber }, slug: { in: anchorSlugs } },
    include: {
      grade: true,
      chapters: { orderBy: { number: 'asc' }, include: { outcomes: true } },
    },
  });
  const chapters = subjects.flatMap((s) =>
    s.chapters
      // Reasoning anchors to "Logical Reasoning" (ch 1); a syllabus-less
      // subject/HOTS request anchors to "Higher Order Thinking" (ch 2).
      .filter((c) =>
        s.slug !== 'olympiad' ? true : section === 'reasoning' ? c.number === 1 : c.number === 2
      )
      .map((c) => ({ ...c, subject: s }))
  );
  if (chapters.length === 0) {
    return { error: `No syllabus chapters found for ${exam.abbrev} Class ${gradeNumber}` };
  }
  return { exam, chapters };
}

export async function GET(req: NextRequest) {
  try {
    const gradeNumber = parseInt(req.nextUrl.searchParams.get('grade') ?? '', 10);
    const examSlug = req.nextUrl.searchParams.get('exam') ?? '';
    const section = req.nextUrl.searchParams.get('section') ?? '';
    if (!Number.isInteger(gradeNumber)) {
      return NextResponse.json({ error: 'grade required' }, { status: 400 });
    }
    const resolved = await resolveContext(gradeNumber, examSlug, section);
    if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: 400 });

    const questions = await prisma.question.findMany({
      where: {
        type: SECTION_TYPES[section],
        chapterId: { in: resolved.chapters.map((c) => c.id) },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        type: true,
        marks: true,
        difficulty: true,
        prompt: true,
        options: true,
        source: true,
        chapter: { select: { title: true, subject: { select: { name: true } } } },
      },
    });
    return NextResponse.json({ questions });
  } catch (error) {
    console.error('olympiad questions GET error:', error);
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { grade, exam: examSlug, section, count = 5 } = await req.json();
    const gradeNumber = parseInt(String(grade), 10);
    if (!Number.isInteger(gradeNumber) || !examSlug || !section) {
      return NextResponse.json({ error: 'grade, exam and section required' }, { status: 400 });
    }
    const resolved = await resolveContext(gradeNumber, String(examSlug), String(section));
    if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: 400 });
    const { exam, chapters } = resolved;
    const type = SECTION_TYPES[String(section)];

    // Prefer an anchor chapter with ingested official text → grounded MCQs.
    const ingested = await prisma.contentChunk.groupBy({
      by: ['chapterId'],
      where: { chapterId: { in: chapters.map((c) => c.id) } },
    });
    const ingestedSet = new Set(ingested.map((r) => r.chapterId));
    const pool = chapters.filter((c) => ingestedSet.has(c.id));
    const pick = (arr: typeof chapters) => arr[Math.floor(Math.random() * arr.length)];
    const chapter = pool.length > 0 && section !== 'reasoning' ? pick(pool) : pick(chapters);

    const corpus =
      section === 'reasoning'
        ? { chunks: [], totalChunks: 0, sourceUrl: null }
        : await getChapterContext(chapter.id, undefined, 18_000);

    const { questions, provider, model } = await generateQuestions(
      {
        gradeNumber,
        subjectName:
          chapter.subject.slug === 'olympiad' ? exam.name : chapter.subject.name,
        chapterTitle:
          chapter.subject.slug === 'olympiad'
            ? `${exam.abbrev} ${chapter.title} — Class ${gradeNumber}`
            : chapter.title,
        textbook: chapter.textbook,
        outcomes: chapter.outcomes.map((o) => ({ code: o.code, description: o.description })),
        sourceBlock: corpus.chunks.length > 0 ? formatSourceBlock(corpus.chunks) : null,
      },
      type,
      Math.min(Math.max(1, count), 5)
    );

    // Same adversarial gate as school practice: solve-and-refute before storing.
    const verifyCtx = {
      gradeNumber,
      subjectName: chapter.subject.name,
      chapterTitle: chapter.title,
    };
    const verified = await Promise.all(
      questions.map(async (q) => ({
        q,
        verification: await verifyQuestion(q, corpus.chunks, verifyCtx),
      }))
    );
    const dropped = verified.filter((v) => v.verification.verdict === 'block');
    for (const d of dropped) {
      await prisma.agentEvent.create({
        data: {
          kind: 'question_dropped',
          chapterId: chapter.id,
          payload: JSON.parse(
            JSON.stringify({
              exam: exam.slug,
              section,
              prompt: d.q.prompt.slice(0, 200),
              verification: d.verification,
            })
          ),
        },
      });
    }
    const accepted = verified.filter((v) => v.verification.verdict !== 'block');
    if (accepted.length === 0) {
      return NextResponse.json(
        {
          error:
            'The adversarial verifier rejected every generated question. Nothing was stored — please regenerate.',
        },
        { status: 502 }
      );
    }

    const created = [];
    for (const { q, verification } of accepted) {
      const row = await prisma.question.create({
        data: {
          chapterId: chapter.id,
          type: q.type,
          marks: q.marks,
          difficulty: q.difficulty,
          prompt: q.prompt,
          options: q.options ?? undefined,
          correctAnswer: q.correctAnswer ?? null,
          modelAnswer: q.modelAnswer ?? null,
          source: 'generated',
          verification: JSON.parse(JSON.stringify(verification)),
        },
        select: {
          id: true,
          type: true,
          marks: true,
          difficulty: true,
          prompt: true,
          options: true,
          source: true,
        },
      });
      created.push(row);
    }

    return NextResponse.json({
      questions: created,
      anchoredTo: {
        subject: chapter.subject.name,
        chapter: chapter.title,
        grounded: corpus.chunks.length > 0,
      },
      format: olympiadFormat(gradeNumber),
      generatedBy: `${provider}/${model}`,
      verifierDropped: dropped.length,
    });
  } catch (error: any) {
    console.error('olympiad question generation error:', error);
    const message = String(error?.message ?? '');
    const status = message.includes('No API keys configured') ? 503 : 500;
    return NextResponse.json(
      {
        error:
          status === 503
            ? 'No AI provider key is configured. Add OPENAI_API_KEY (or Anthropic/Gemini/Groq/DeepSeek) to .env to generate questions.'
            : 'Failed to generate questions',
      },
      { status }
    );
  }
}
