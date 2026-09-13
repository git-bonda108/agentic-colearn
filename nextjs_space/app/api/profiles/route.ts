import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveStudent, STUDENT_COOKIE } from '@/lib/student';

export const dynamic = 'force-dynamic';

/** GET /api/profiles — the family's student profiles + which one is active. */
export async function GET() {
  try {
    const [profiles, active] = await Promise.all([
      prisma.studentProfile.findMany({
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, grade: true, createdAt: true, preferredLanguages: true },
      }),
      getActiveStudent(),
    ]);
    return NextResponse.json({ profiles, activeId: active.id });
  } catch (error) {
    console.error('profiles GET error:', error);
    return NextResponse.json({ error: 'Failed to load profiles' }, { status: 500 });
  }
}

/**
 * POST /api/profiles — create a profile { name, grade } or select one
 * { selectId }. Selection sets the family-device cookie (no passwords in the
 * prototype — deliberately not fake security; production swaps this for
 * NextAuth sessions).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Update a profile's content-language order, e.g. ["hi","te"] or ["te","hi"].
    if (typeof body?.setLanguagesFor === 'string') {
      const langs = Array.isArray(body.languages)
        ? body.languages.filter((l: unknown) => l === 'hi' || l === 'te').slice(0, 2)
        : [];
      const student = await prisma.studentProfile.update({
        where: { id: body.setLanguagesFor },
        data: { preferredLanguages: langs },
      });
      return NextResponse.json({ id: student.id, preferredLanguages: student.preferredLanguages });
    }

    if (typeof body?.selectId === 'string') {
      const student = await prisma.studentProfile.findUnique({ where: { id: body.selectId } });
      if (!student) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      const res = NextResponse.json({ activeId: student.id, name: student.name });
      res.cookies.set(STUDENT_COOKIE, student.id, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
      return res;
    }

    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : '';
    const gradeNum = parseInt(body?.grade, 10);
    if (name.length < 2 || !Number.isInteger(gradeNum) || gradeNum < 1 || gradeNum > 12) {
      return NextResponse.json(
        { error: 'A name (2+ characters) and a grade between 1 and 12 are required' },
        { status: 400 }
      );
    }
    const student = await prisma.studentProfile.create({
      data: {
        name,
        grade: String(gradeNum),
        learningStyle: 'visual',
        interests: [],
        strengths: [],
        goals: [],
      },
    });
    const res = NextResponse.json({ created: true, activeId: student.id, name: student.name });
    res.cookies.set(STUDENT_COOKIE, student.id, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
    return res;
  } catch (error) {
    console.error('profiles POST error:', error);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
