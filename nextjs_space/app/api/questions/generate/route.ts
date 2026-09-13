import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateQuestions, QUESTION_TYPE_INFO } from '@/lib/question-generator';
import { targetDifficulty, DEFAULT_PARAMS } from '@/lib/bkt';
import { getActiveStudent } from '@/lib/student';
import { getChapterContext, formatSourceBlock } from '@/lib/corpus';
import { verifyQuestion } from '@/lib/verifier';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/questions/generate
 * { chapterId, type, count?, difficulty? } → generates CBSE-style questions
 * grounded in the chapter's learning outcomes and stores them.
 */
export async function POST(req: NextRequest) {
  try {
    const { chapterId, type, count = 3, difficulty } = await req.json();
    if (!chapterId || !type) {
      return NextResponse.json({ error: 'chapterId and type required' }, { status: 400 });
    }
    if (!QUESTION_TYPE_INFO[type]) {
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    const chapter = await prisma.curriculumChapter.findUnique({
      where: { id: chapterId },
      include: { subject: { include: { grade: true } }, outcomes: true },
    });
    if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });

    // Adaptive difficulty: when the caller doesn't pin one, aim at the
    // student's zone of proximal development from their BKT chapter mastery.
    let effectiveDifficulty = difficulty;
    if (!effectiveDifficulty) {
      const student = await getActiveStudent();
      const chapterKey = `g${chapter.subject.grade.number}.${chapter.subject.slug}.${chapter.slug}`;
      const mastery = await prisma.conceptMastery.findUnique({
        where: { studentId_conceptKey: { studentId: student.id, conceptKey: chapterKey } },
      });
      effectiveDifficulty = targetDifficulty(mastery?.pKnown ?? DEFAULT_PARAMS.pInit);
    }

    // Ground generation in the chapter's official NCERT text when ingested.
    const corpus = await getChapterContext(chapter.id, undefined, 18_000);

    const { questions, provider, model } = await generateQuestions(
      {
        gradeNumber: chapter.subject.grade.number,
        subjectName: chapter.subject.name,
        chapterTitle: chapter.title,
        textbook: chapter.textbook,
        outcomes: chapter.outcomes.map((o) => ({ code: o.code, description: o.description })),
        sourceBlock: corpus.chunks.length > 0 ? formatSourceBlock(corpus.chunks) : null,
      },
      type,
      Math.min(Math.max(1, count), 5),
      effectiveDifficulty
    );

    // ── Adversarial verification: solve-and-refute before storing ──
    const verifyCtx = {
      gradeNumber: chapter.subject.grade.number,
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
            JSON.stringify({ prompt: d.q.prompt.slice(0, 200), verification: d.verification })
          ),
        },
      });
    }
    const accepted = verified.filter((v) => v.verification.verdict !== 'block');
    if (accepted.length === 0) {
      return NextResponse.json(
        {
          error:
            'The adversarial verifier rejected every generated question (wrong or unsupported answer keys). Nothing was stored — please regenerate.',
        },
        { status: 502 }
      );
    }

    const created = [];
    for (const { q, verification } of accepted) {
      const outcome = q.outcomeCode
        ? chapter.outcomes.find((o) => o.code === q.outcomeCode)
        : undefined;
      const row = await prisma.question.create({
        data: {
          chapterId: chapter.id,
          outcomeId: outcome?.id ?? null,
          type: q.type,
          marks: q.marks,
          difficulty: q.difficulty,
          prompt: q.prompt,
          options: q.options ?? undefined,
          correctAnswer: q.correctAnswer ?? null,
          modelAnswer: q.modelAnswer ?? null,
          rubric: q.rubric ? JSON.parse(JSON.stringify(q.rubric)) : undefined,
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
      generatedBy: `${provider}/${model}`,
      verifierDropped: dropped.length,
    });
  } catch (error: any) {
    console.error('question generation error:', error);
    const message = String(error?.message ?? '');
    const status = message.includes('No API keys configured') ? 503 : 500;
    return NextResponse.json(
      {
        error:
          status === 503
            ? 'No AI provider key is configured. Add OPENAI_API_KEY (or Anthropic/Gemini/Groq/DeepSeek) to .env to generate new questions. Seeded questions still work.'
            : 'Failed to generate questions',
      },
      { status }
    );
  }
}
