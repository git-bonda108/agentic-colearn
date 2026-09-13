/**
 * Seeds the CBSE curriculum (grades → subjects → chapters → learning outcomes)
 * and the starter question bank. Idempotent: upserts by natural keys.
 *
 * Run: npx tsx --require dotenv/config scripts/seed-curriculum.ts
 */
import { PrismaClient } from '@prisma/client';
import { CURRICULUM, SEED_QUESTIONS } from '../lib/curriculum-data';

const prisma = new PrismaClient();

/**
 * Concept keys are slug-based (`g6.science.ch-2`) so chapters from different
 * books inside one subject (e.g. `history-ch-1` vs `geography-ch-1`) never
 * collide. This must match the key construction in the API routes.
 */
function chapterSlugFor(chapter: { number: number; book?: string }) {
  return chapter.book ? `${chapter.book}-ch-${chapter.number}` : `ch-${chapter.number}`;
}

function conceptKeyFor(gradeNumber: number, subjectSlug: string, chapterSlug: string, loCode?: string) {
  const base = `g${gradeNumber}.${subjectSlug}.${chapterSlug}`;
  return loCode ? `${base}.${loCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : base;
}

async function main() {
  console.log('Seeding CBSE curriculum...');

  for (const grade of CURRICULUM) {
    const g = await prisma.curriculumGrade.upsert({
      where: { number: grade.number },
      update: { stage: grade.stage, displayName: grade.displayName },
      create: { number: grade.number, stage: grade.stage, displayName: grade.displayName },
    });

    let order = 0;
    for (const subject of grade.subjects) {
      const s = await prisma.curriculumSubject.upsert({
        where: { gradeId_slug: { gradeId: g.id, slug: subject.slug } },
        update: {
          name: subject.name,
          icon: subject.icon,
          color: subject.color,
          stream: subject.stream ?? null,
          orderIndex: order,
        },
        create: {
          gradeId: g.id,
          name: subject.name,
          slug: subject.slug,
          icon: subject.icon,
          color: subject.color,
          stream: subject.stream ?? null,
          orderIndex: order,
        },
      });
      order++;

      for (const chapter of subject.chapters ?? []) {
        const slug = chapterSlugFor(chapter);
        const textbook = chapter.bookTitle ?? subject.textbook ?? null;
        const c = await prisma.curriculumChapter.upsert({
          where: { subjectId_slug: { subjectId: s.id, slug } },
          update: {
            number: chapter.number,
            title: chapter.title,
            summary: chapter.summary ?? null,
            textbook,
          },
          create: {
            subjectId: s.id,
            number: chapter.number,
            title: chapter.title,
            slug,
            summary: chapter.summary ?? null,
            textbook,
          },
        });

        for (const lo of chapter.outcomes ?? []) {
          const conceptKey = conceptKeyFor(grade.number, subject.slug, slug, lo.code);
          const existing = await prisma.learningOutcome.findFirst({
            where: { chapterId: c.id, code: lo.code },
          });
          if (existing) {
            await prisma.learningOutcome.update({
              where: { id: existing.id },
              data: { description: lo.description, conceptKey },
            });
          } else {
            await prisma.learningOutcome.create({
              data: { chapterId: c.id, code: lo.code, description: lo.description, conceptKey },
            });
          }
        }
      }
    }
  }

  console.log('Seeding starter question bank...');
  for (const q of SEED_QUESTIONS) {
    const chapter = await prisma.curriculumChapter.findFirst({
      where: {
        number: q.chapterNumber,
        subject: { slug: q.subjectSlug, grade: { number: q.gradeNumber } },
      },
      include: { outcomes: true },
    });
    if (!chapter) {
      console.warn(`  ! chapter not found for G${q.gradeNumber} ${q.subjectSlug} ch${q.chapterNumber}`);
      continue;
    }
    const exists = await prisma.question.findFirst({
      where: { chapterId: chapter.id, prompt: q.prompt },
    });
    if (exists) continue;
    const outcome = q.outcomeCode
      ? chapter.outcomes.find((o) => o.code === q.outcomeCode)
      : undefined;
    await prisma.question.create({
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
        rubric: q.rubric ?? undefined,
        source: 'seed',
      },
    });
  }

  // Demo student so the practice flow works immediately
  const demo = await prisma.studentProfile.findFirst({ where: { email: 'demo@neurolearn.app' } });
  if (!demo) {
    await prisma.studentProfile.create({
      data: {
        name: 'Demo Student',
        email: 'demo@neurolearn.app',
        grade: '6',
        learningStyle: 'visual',
        interests: ['science', 'space'],
        strengths: [],
        goals: ['Master every chapter'],
      },
    });
  }

  const counts = {
    grades: await prisma.curriculumGrade.count(),
    subjects: await prisma.curriculumSubject.count(),
    chapters: await prisma.curriculumChapter.count(),
    outcomes: await prisma.learningOutcome.count(),
    questions: await prisma.question.count(),
  };
  console.log('Done:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
