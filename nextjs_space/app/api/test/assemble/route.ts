import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/test/assemble  { chapterId }
 *
 * Assembles a CBSE-blueprint chapter test from the chapter's question bank,
 * mirroring the official board paper section pattern (CBSE SQP 2025-26):
 *   Section A — 1-mark objective (MCQ + Assertion–Reason)
 *   Section B — 2-mark very short answers
 *   Section C — 3-mark short answers
 *   Section D — 4-mark case-study questions
 *   Section E — 5-mark long answers
 *
 * Answer keys, model answers, and rubrics never leave the server — grading
 * happens per-question via /api/evaluate.
 */

interface BlueprintSlot {
  section: 'A' | 'B' | 'C' | 'D' | 'E';
  sectionTitle: string;
  type: string;
  typeLabel: string;
  marksEach: number;
  count: number;
}

/**
 * Diagnostic entry probe: 5 quick questions across levels. Its purpose is to
 * initialise the BKT prior for a chapter (see /api/diagnostic/complete), not
 * to simulate a board paper.
 */
const DIAGNOSTIC_BLUEPRINT: BlueprintSlot[] = [
  { section: 'A', sectionTitle: 'Quick check (1 mark each)', type: 'mcq', typeLabel: 'MCQ', marksEach: 1, count: 2 },
  { section: 'A', sectionTitle: 'Quick check (1 mark each)', type: 'assertion_reason', typeLabel: 'Assertion–Reason', marksEach: 1, count: 1 },
  { section: 'B', sectionTitle: 'Short answers', type: 'vsa_2', typeLabel: '2 Marks', marksEach: 2, count: 1 },
  { section: 'B', sectionTitle: 'Short answers', type: 'sa_3', typeLabel: '3 Marks', marksEach: 3, count: 1 },
];

/** Mini chapter test: 12 questions, 25 marks — a scaled-down board blueprint. */
const BLUEPRINT: BlueprintSlot[] = [
  { section: 'A', sectionTitle: 'Objective (1 mark each)', type: 'mcq', typeLabel: 'MCQ', marksEach: 1, count: 5 },
  { section: 'A', sectionTitle: 'Objective (1 mark each)', type: 'assertion_reason', typeLabel: 'Assertion–Reason', marksEach: 1, count: 1 },
  { section: 'B', sectionTitle: 'Very Short Answer (2 marks each)', type: 'vsa_2', typeLabel: '2 Marks', marksEach: 2, count: 2 },
  { section: 'C', sectionTitle: 'Short Answer (3 marks each)', type: 'sa_3', typeLabel: '3 Marks', marksEach: 3, count: 2 },
  { section: 'D', sectionTitle: 'Case Study (4 marks)', type: 'case_study', typeLabel: 'Case Study', marksEach: 4, count: 1 },
  { section: 'E', sectionTitle: 'Long Answer (5 marks)', type: 'la_5', typeLabel: '5 Marks', marksEach: 5, count: 1 },
];

export async function POST(req: NextRequest) {
  try {
    const { chapterId, mode = 'test' } = await req.json();
    if (!chapterId) return NextResponse.json({ error: 'chapterId required' }, { status: 400 });
    const blueprint = mode === 'diagnostic' ? DIAGNOSTIC_BLUEPRINT : BLUEPRINT;

    const chapter = await prisma.curriculumChapter.findUnique({
      where: { id: chapterId },
      include: { subject: { include: { grade: true } } },
    });
    if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });

    const bank = await prisma.question.findMany({
      where: { chapterId },
      select: {
        id: true,
        type: true,
        marks: true,
        difficulty: true,
        prompt: true,
        options: true,
        outcome: { select: { code: true, description: true } },
        _count: { select: { attempts: true } },
      },
    });

    const byType = new Map<string, typeof bank>();
    for (const q of bank) {
      const list = byType.get(q.type) ?? [];
      list.push(q);
      byType.set(q.type, list);
    }

    const sections: {
      section: string;
      sectionTitle: string;
      questions: {
        id: string;
        type: string;
        marks: number;
        difficulty: string;
        prompt: string;
        options: unknown;
        outcome: { code: string; description: string } | null;
      }[];
    }[] = [];
    const shortfall: { type: string; typeLabel: string; needed: number; available: number }[] = [];

    for (const slot of blueprint) {
      // Prefer least-attempted questions so retakes see fresh material.
      const pool = [...(byType.get(slot.type) ?? [])].sort(
        (a, b) => a._count.attempts - b._count.attempts
      );
      const picked = pool.slice(0, slot.count);
      if (picked.length < slot.count) {
        shortfall.push({
          type: slot.type,
          typeLabel: slot.typeLabel,
          needed: slot.count,
          available: picked.length,
        });
      }
      if (picked.length === 0) continue;

      let sec = sections.find((s) => s.section === slot.section);
      if (!sec) {
        sec = { section: slot.section, sectionTitle: slot.sectionTitle, questions: [] };
        sections.push(sec);
      }
      sec.questions.push(
        ...picked.map(({ _count, ...q }) => ({
          ...q,
          options: q.options ?? null,
        }))
      );
    }

    const totalMarks = sections.reduce(
      (s, sec) => s + sec.questions.reduce((m, q) => m + q.marks, 0),
      0
    );
    const fullMarks = blueprint.reduce((s, b) => s + b.marksEach * b.count, 0);

    return NextResponse.json({
      chapter: { id: chapter.id, number: chapter.number, title: chapter.title },
      grade: chapter.subject.grade.number,
      subject: chapter.subject.name,
      blueprint,
      mode,
      sections,
      totalMarks,
      fullMarks,
      questionCount: sections.reduce((n, s) => n + s.questions.length, 0),
      shortfall,
    });
  } catch (error) {
    console.error('test assemble error:', error);
    return NextResponse.json({ error: 'Failed to assemble test' }, { status: 500 });
  }
}
