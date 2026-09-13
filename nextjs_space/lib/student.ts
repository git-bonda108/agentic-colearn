import { cookies } from 'next/headers';
import { prisma } from './db';

/**
 * Student identity — honest scoping for the prototype.
 *
 * Families can create and switch between named profiles (one per child); the
 * active profile is a signed-nothing plain cookie because there are NO
 * passwords in this prototype — we deliberately do not fake security.
 * Every mastery/attempt row is keyed to the active profile, so the data
 * model is already multi-student; production auth (NextAuth is installed)
 * replaces the cookie with a session without touching any other code.
 */

const COOKIE = 'colearn_student';

export async function getOrCreateDemoStudent() {
  const existing = await prisma.studentProfile.findFirst({
    where: { email: 'demo@neurolearn.app' },
  });
  if (existing) return existing;
  return prisma.studentProfile.create({
    data: {
      name: 'Demo Student',
      email: 'demo@neurolearn.app',
      grade: '6',
      learningStyle: 'visual',
      interests: ['science'],
      strengths: [],
      goals: [],
    },
  });
}

/**
 * The active student: the profile selected by the family's profile cookie,
 * falling back to the demo profile when none is set or it no longer exists.
 */
export async function getActiveStudent() {
  try {
    const id = cookies().get(COOKIE)?.value;
    if (id) {
      const student = await prisma.studentProfile.findUnique({ where: { id } });
      if (student) return student;
    }
  } catch {
    /* cookies() unavailable outside a request scope — fall through */
  }
  return getOrCreateDemoStudent();
}

export const STUDENT_COOKIE = COOKIE;
