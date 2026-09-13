/**
 * Offline verification of the multilingual grounding layer (no AI calls):
 *  1. NCERT language code derivation (en → hi/te patterns, Telugu 1-8 gate)
 *  2. getChapterContext returns the requested language when ingested
 *  3. Honest fallback to English when a language is not ingested
 *
 * Run: npx tsx --require dotenv/config scripts/check-language-corpus.ts
 * Exit 0 = all checks pass.
 */
import { PrismaClient } from '@prisma/client';
import { chapterPdfUrl } from '../lib/ncert-codes';
import { getChapterContext } from '../lib/corpus';

const prisma = new PrismaClient();
let fail = 0;

function check(name: string, ok: boolean, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fail = 1;
}

async function main() {
  console.log('1. Language code derivation (lib/ncert-codes.ts)');
  const en = chapterPdfUrl(10, 'science', 'ch-1', 1, 'en');
  const hi = chapterPdfUrl(10, 'science', 'ch-1', 1, 'hi');
  check('G10 science en resolves', Boolean(en), en?.url ?? '');
  check('G10 science hi resolves with h-code', hi?.code[1] === 'h', hi?.url ?? 'null');
  const te6 = chapterPdfUrl(6, 'science', 'ch-1', 1, 'te');
  check('G6 science te resolves with tl-code', te6?.code.slice(1, 3) === 'tl', te6?.url ?? 'null');
  const te10 = chapterPdfUrl(10, 'science', 'ch-1', 1, 'te');
  check('G10 te returns null (no official Telugu edition for 9-12)', te10 === null);

  console.log('2. Corpus language retrieval (lib/corpus.ts)');
  const langRows = await prisma.contentChunk.groupBy({ by: ['chapterId', 'language'] });
  const hiChapter = langRows.find((r) => r.language === 'hi')?.chapterId;
  const teChapter = langRows.find((r) => r.language === 'te')?.chapterId;
  const enOnlyChapter = langRows.find(
    (r) =>
      r.language === 'en' &&
      !langRows.some((x) => x.chapterId === r.chapterId && x.language !== 'en')
  )?.chapterId;

  if (hiChapter) {
    const ctx = await getChapterContext(hiChapter, undefined, 8000, 'hi');
    check('hi corpus served as hi', ctx.language === 'hi' && ctx.chunks.length > 0,
      `${ctx.chunks.length} chunks`);
    check('hi chunks contain Devanagari', /[ऀ-ॿ]/.test(ctx.chunks[0]?.text ?? ''));
  } else {
    console.log('  · no Hindi corpus ingested locally — skipped (run ingest:ncert --lang hi)');
  }
  if (teChapter) {
    const ctx = await getChapterContext(teChapter, undefined, 8000, 'te');
    check('te corpus served as te', ctx.language === 'te' && ctx.chunks.length > 0,
      `${ctx.chunks.length} chunks`);
    check('te chunks contain Telugu script', /[ఀ-౿]/.test(ctx.chunks[0]?.text ?? ''));
  } else {
    console.log('  · no Telugu corpus ingested locally — skipped (run ingest:ncert --lang te)');
  }
  if (enOnlyChapter) {
    const ctx = await getChapterContext(enOnlyChapter, undefined, 8000, 'te');
    check('honest fallback: te request on en-only chapter returns en', ctx.language === 'en' && ctx.chunks.length > 0);
  }

  console.log(fail ? '\nFAILURES above.' : '\nAll language-corpus checks passed.');
  process.exit(fail);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
