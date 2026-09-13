import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { evaluateAnswer } from '@/lib/evaluation';
import { bktUpdate, masteryLevel, DEFAULT_PARAMS } from '@/lib/bkt';
import { getActiveStudent } from '@/lib/student';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/evaluate
 * { questionId, answer } →
 *   grades the answer (deterministic for objective, rubric-LLM for subjective),
 *   persists the attempt, updates BKT mastery for the concept(s), and returns
 *   the full structured feedback plus the mastery change.
 */
export async function POST(req: NextRequest) {
  try {
    const { questionId, answer } = await req.json();
    if (!questionId || typeof answer !== 'string') {
      return NextResponse.json({ error: 'questionId and answer required' }, { status: 400 });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        outcome: true,
        chapter: { include: { subject: { include: { grade: true } } } },
      },
    });
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

    const student = await getActiveStudent();
    const gradeNumber = question.chapter.subject.grade.number;

    const result = await evaluateAnswer(
      {
        type: question.type,
        marks: question.marks,
        prompt: question.prompt,
        options: question.options,
        correctAnswer: question.correctAnswer,
        modelAnswer: question.modelAnswer,
        rubric: question.rubric,
      },
      answer,
      {
        gradeNumber,
        subjectName: question.chapter.subject.name,
        chapterTitle: question.chapter.title,
      }
    );

    const attempt = await prisma.questionAttempt.create({
      data: {
        studentId: student.id,
        questionId: question.id,
        answer,
        scoreAwarded: result.scoreAwarded,
        maxMarks: result.maxMarks,
        feedback: JSON.parse(JSON.stringify(result)),
        evaluator: result.evaluator,
      },
    });

    // ── BKT update: the specific learning outcome (if tagged) + the chapter concept
    const scoreFraction = result.maxMarks > 0 ? result.scoreAwarded / result.maxMarks : 0;
    const chapterKey = `g${gradeNumber}.${question.chapter.subject.slug}.${question.chapter.slug}`;
    const keys = [chapterKey, ...(question.outcome ? [question.outcome.conceptKey] : [])];

    const masteryUpdates = [];
    for (const conceptKey of keys) {
      const existing = await prisma.conceptMastery.findUnique({
        where: { studentId_conceptKey: { studentId: student.id, conceptKey } },
      });
      const prior = existing?.pKnown ?? DEFAULT_PARAMS.pInit;
      const updated = bktUpdate(prior, scoreFraction, question.type);
      const row = await prisma.conceptMastery.upsert({
        where: { studentId_conceptKey: { studentId: student.id, conceptKey } },
        update: {
          pKnown: updated,
          attempts: { increment: 1 },
          lastPracticedAt: new Date(),
        },
        create: {
          studentId: student.id,
          conceptKey,
          pKnown: updated,
          attempts: 1,
        },
      });
      masteryUpdates.push({
        conceptKey,
        before: prior,
        after: row.pKnown,
        level: masteryLevel(row.pKnown),
      });
    }

    // Reveal the model answer after attempting (learning moment, not before)
    return NextResponse.json({
      attemptId: attempt.id,
      evaluation: result,
      modelAnswer: question.modelAnswer,
      correctAnswer: question.correctAnswer,
      mastery: masteryUpdates,
    });
  } catch (error: any) {
    console.error('evaluate error:', error);
    const message = String(error?.message ?? '');
    const status = message.includes('No API keys configured') ? 503 : 500;
    return NextResponse.json(
      {
        error:
          status === 503
            ? 'No AI provider key is configured, so subjective answers cannot be graded yet. Add an API key to .env — MCQs still grade instantly.'
            : 'Failed to evaluate answer',
      },
      { status }
    );
  }
}
