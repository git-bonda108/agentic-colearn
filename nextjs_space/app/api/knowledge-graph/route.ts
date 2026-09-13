import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveStudent } from '@/lib/student';
import { masteryLevel } from '@/lib/bkt';
import { bookKeyFromSlug } from '@/lib/ncert-codes';

export const dynamic = 'force-dynamic';

/**
 * GET /api/knowledge-graph?grade=10&subject=science
 *
 * The student's knowledge map for one subject, built from REAL curriculum
 * structure (replaces the old notes-based graph whose edges were synthetic
 * string matches): nodes are the subject's chapters with live BKT mastery;
 * edges are the official chapter sequence within each book — the order NCERT
 * teaches them, which is the curriculum's own prerequisite chain.
 */
export async function GET(req: NextRequest) {
  try {
    const grade = parseInt(req.nextUrl.searchParams.get('grade') ?? '', 10);
    const subjectSlug = req.nextUrl.searchParams.get('subject');
    if (!Number.isInteger(grade) || !subjectSlug) {
      return NextResponse.json({ error: 'grade and subject required' }, { status: 400 });
    }

    const subject = await prisma.curriculumSubject.findFirst({
      where: { slug: subjectSlug, grade: { number: grade } },
      include: {
        chapters: {
          orderBy: [{ textbook: 'asc' }, { number: 'asc' }],
          include: { _count: { select: { questions: true, chunks: true } } },
        },
      },
    });
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

    const student = await getActiveStudent();
    const keys = subject.chapters.map((c) => `g${grade}.${subjectSlug}.${c.slug}`);
    const masteries = await prisma.conceptMastery.findMany({
      where: { studentId: student.id, conceptKey: { in: keys } },
    });
    const masteryByKey = new Map(masteries.map((m) => [m.conceptKey, m]));

    const nodes = subject.chapters.map((c) => {
      const m = masteryByKey.get(`g${grade}.${subjectSlug}.${c.slug}`);
      return {
        id: c.id,
        number: c.number,
        title: c.title,
        book: c.textbook ?? subject.name,
        bookKey: bookKeyFromSlug(c.slug),
        pKnown: m?.pKnown ?? null,
        level: m ? masteryLevel(m.pKnown) : null,
        attempts: m?.attempts ?? 0,
        questionCount: c._count.questions,
        grounded: c._count.chunks > 0,
      };
    });

    // Edges: official teaching sequence within each book.
    const edges: { from: string; to: string }[] = [];
    const byBook = new Map<string, typeof nodes>();
    for (const n of nodes) {
      const list = byBook.get(n.bookKey) ?? [];
      list.push(n);
      byBook.set(n.bookKey, list);
    }
    for (const list of byBook.values()) {
      const sorted = [...list].sort((a, b) => a.number - b.number);
      for (let i = 0; i < sorted.length - 1; i++) {
        edges.push({ from: sorted[i].id, to: sorted[i + 1].id });
      }
    }

    return NextResponse.json({
      grade,
      subject: { name: subject.name, slug: subject.slug },
      nodes,
      edges,
      edgeNote: 'Edges are the official NCERT chapter sequence within each book.',
    });
  } catch (error) {
    console.error('knowledge graph error:', error);
    return NextResponse.json({ error: 'Failed to build graph' }, { status: 500 });
  }
}
