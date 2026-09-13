/**
 * Dry-run check of NCERT PDF URL resolution: for every chapter in the DB,
 * report whether a source code is registered and what URL it resolves to.
 * No downloads, no writes — pure mapping audit.
 *
 *   npx tsx --require dotenv/config scripts/check-ncert-coverage.ts
 */
import { PrismaClient } from '@prisma/client';
import { chapterPdfUrl } from '../lib/ncert-codes';

const prisma = new PrismaClient();

async function main() {
  const chapters = await prisma.curriculumChapter.findMany({
    include: { subject: { include: { grade: true } } },
    orderBy: [{ subjectId: 'asc' }, { number: 'asc' }],
  });

  let mapped = 0;
  const unmapped = new Map<string, number>();
  const sample: string[] = [];

  for (const ch of chapters) {
    const r = chapterPdfUrl(ch.subject.grade.number, ch.subject.slug, ch.slug, ch.number);
    if (r) {
      mapped++;
      if (sample.length < 12 && Math.random() < 0.08) {
        sample.push(`  G${ch.subject.grade.number} ${ch.subject.slug} ${ch.slug} → ${r.url}${r.verified ? '' : '  [code unverified]'}`);
      }
    } else {
      const key = `G${ch.subject.grade.number} ${ch.subject.slug}`;
      unmapped.set(key, (unmapped.get(key) ?? 0) + 1);
    }
  }

  console.log(`Chapters in DB: ${chapters.length}`);
  console.log(`Mapped to an official PDF URL: ${mapped}`);
  console.log(`Unmapped: ${chapters.length - mapped}`);
  console.log('\nSample resolutions:');
  sample.forEach((s) => console.log(s));
  console.log('\nUnmapped subjects (no code registered — expected for Hindi/Sanskrit/Arts/IT/etc.):');
  Array.from(unmapped.entries())
    .sort()
    .forEach(([k, n]) => console.log(`  ${k}: ${n} chapters`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
