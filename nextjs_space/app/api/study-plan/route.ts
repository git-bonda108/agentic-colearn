import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveStudent } from '@/lib/student';
import { callLLMJson } from '@/lib/model-router';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/study-plan { gradeNumber, subjectSlug?, examDate? }
 *
 * Builds a 7-day study plan. The core is DETERMINISTIC and explainable:
 * chapters are scored by need = (1 - mastery), weighted up when unattempted
 * and when an exam is near, and scheduled across the week. When a provider
 * key exists, an LLM adds a short coaching note per day — the schedule itself
 * never depends on the LLM. Every slot carries its reason.
 */
export async function POST(req: NextRequest) {
  try {
    const { gradeNumber, subjectSlug, examDate } = await req.json();
    if (!gradeNumber) return NextResponse.json({ error: 'gradeNumber required' }, { status: 400 });

    const grade = await prisma.curriculumGrade.findUnique({
      where: { number: gradeNumber },
      include: {
        subjects: {
          where: subjectSlug ? { slug: subjectSlug } : {},
          include: { chapters: { include: { outcomes: true } } },
        },
      },
    });
    if (!grade) return NextResponse.json({ error: 'Grade not found' }, { status: 404 });

    const student = await getActiveStudent();
    const masteries = await prisma.conceptMastery.findMany({ where: { studentId: student.id } });
    const masteryByKey = new Map(masteries.map((m) => [m.conceptKey, m]));

    const daysToExam = examDate
      ? Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86_400_000))
      : null;

    // Score every chapter by need.
    const candidates: {
      chapterId: string;
      chapter: string;
      subject: string;
      pKnown: number | null;
      need: number;
      reason: string;
    }[] = [];
    for (const s of grade.subjects) {
      for (const c of s.chapters) {
        const key = `g${gradeNumber}.${s.slug}.${c.slug}`;
        const m = masteryByKey.get(key);
        const pKnown = m?.pKnown ?? null;
        let need = 1 - (pKnown ?? 0.25);
        let reason: string;
        if (pKnown === null) {
          need += 0.15;
          reason = 'Not attempted yet — start with the diagnostic to find your level';
        } else if (pKnown < 0.6) {
          reason = `Mastery ${Math.round(pKnown * 100)}% — below the 60% threshold, needs focused practice`;
        } else if (pKnown < 0.95) {
          reason = `Mastery ${Math.round(pKnown * 100)}% — developing, push to mastered with mixed practice`;
        } else {
          need = 0.15;
          reason = 'Mastered — quick spaced review to keep it fresh';
        }
        if (daysToExam !== null && daysToExam <= 14 && pKnown !== null && pKnown < 0.6) {
          need += 0.2;
          reason += ` (exam in ${daysToExam} days — weak areas first)`;
        }
        candidates.push({
          chapterId: c.id,
          chapter: `Ch ${c.number}: ${c.title}`,
          subject: s.name,
          pKnown,
          need: Math.round(need * 100) / 100,
          reason,
        });
      }
    }

    candidates.sort((a, b) => b.need - a.need);
    const top = candidates.slice(0, 14); // 2 slots/day for 7 days

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() + i * 86_400_000);
      const slots = top.slice(i * 2, i * 2 + 2);
      return {
        day: i + 1,
        date: date.toISOString().slice(0, 10),
        slots: slots.map((s) => ({
          chapterId: s.chapterId,
          subject: s.subject,
          chapter: s.chapter,
          activity:
            s.pKnown === null
              ? 'Diagnostic Check + Learn tab'
              : s.pKnown < 0.6
                ? 'Practice (2-mark and 3-mark questions)'
                : s.pKnown < 0.95
                  ? 'Mock Test'
                  : 'Quick review + 2 spaced questions',
          reason: s.reason,
        })),
      };
    }).filter((d) => d.slots.length > 0);

    // Optional coaching narrative — never load-bearing.
    let coachNote: string | null = null;
    let generatedBy = 'deterministic';
    try {
      const res = await callLLMJson<{ note: string }>({
        tier: 'fast',
        maxTokens: 300,
        messages: [
          {
            role: 'system',
            content:
              'You are an encouraging CBSE study coach. Given a weekly plan summary, write ONE short motivating note (2-3 sentences) for the student. Respond as JSON: {"note": string}',
          },
          {
            role: 'user',
            content: `Grade ${gradeNumber}${daysToExam ? `, exam in ${daysToExam} days` : ''}. Focus areas: ${top
              .slice(0, 4)
              .map((t) => `${t.subject} ${t.chapter} (${t.pKnown === null ? 'new' : Math.round(t.pKnown * 100) + '%'})`)
              .join('; ')}`,
          },
        ],
      });
      coachNote = res.content?.note ?? null;
      generatedBy = `${res.provider}/${res.model}`;
    } catch {
      /* plan works without a key */
    }

    return NextResponse.json({
      gradeNumber,
      daysToExam,
      days,
      coachNote,
      generatedBy,
      method:
        'Chapters ranked by need = (1 − mastery), +0.15 unattempted, +0.2 weak-with-exam-near; 2 slots/day. Deterministic and reproducible.',
    });
  } catch (error) {
    console.error('study plan error:', error);
    return NextResponse.json({ error: 'Failed to build study plan' }, { status: 500 });
  }
}
