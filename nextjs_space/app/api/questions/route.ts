import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/questions?chapterId=..&type=mcq — practice questions for a chapter.
 * Never returns answer keys, model answers, or rubrics: grading is server-side.
 */
export async function GET(req: NextRequest) {
  try {
    const chapterId = req.nextUrl.searchParams.get('chapterId');
    const type = req.nextUrl.searchParams.get('type');
    if (!chapterId) return NextResponse.json({ error: 'chapterId required' }, { status: 400 });

    const questions = await prisma.question.findMany({
      where: { chapterId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        marks: true,
        difficulty: true,
        prompt: true,
        options: true,
        source: true,
        outcome: { select: { code: true, description: true } },
      },
    });
    return NextResponse.json({ questions });
  } catch (error) {
    console.error('questions GET error:', error);
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 });
  }
}
