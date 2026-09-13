/**
 * NCERT corpus ingestion — downloads official chapter PDFs from ncert.nic.in,
 * parses them page-by-page, chunks the text, and stores ContentChunk rows.
 *
 * Zero AI cost: pure download + parse. Idempotent per chapter (chunks are
 * replaced atomically). Refuses to store anything when the download fails,
 * returns HTML instead of a PDF, or the parsed text is implausibly short —
 * a bad source must never silently become "grounding".
 *
 * Usage:
 *   npx tsx --require dotenv/config scripts/ingest-ncert.ts --grade 10 --subject science
 *   npx tsx --require dotenv/config scripts/ingest-ncert.ts --grade 10 --subject science --chapter 1
 *   npx tsx --require dotenv/config scripts/ingest-ncert.ts --all
 */
import { PrismaClient } from '@prisma/client';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import os from 'os';
// Deep import avoids pdf-parse's debug harness, which runs when the package
// entry is loaded without a CJS module.parent (tsx/ESM contexts).
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { chapterPdfUrl, type ContentLanguage } from '../lib/ncert-codes';

const prisma = new PrismaClient();

// Cache PDFs outside ~/Documents (iCloud) — same reasoning as node_modules.
const CACHE_DIR = join(os.homedir(), 'Library', 'Caches', 'neurolearn', 'ncert-pdfs');

const MIN_CHAPTER_CHARS = 1_500; // a real chapter is never shorter than this
const CHUNK_TARGET = 1_400;
const CHUNK_MIN = 250;

interface PageText {
  page: number;
  text: string;
}

async function downloadPdf(url: string, cacheName: string): Promise<Buffer> {
  const cachePath = join(CACHE_DIR, cacheName);
  if (existsSync(cachePath)) return readFile(cachePath);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (educational corpus ingestion)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // NCERT serves an HTML error page (or a redirect stub) for missing files —
  // never accept anything that doesn't start with the PDF magic bytes.
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error(`Not a PDF (starts with "${buf.subarray(0, 12).toString('latin1')}") — ${url}`);
  }
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cachePath, buf);
  return buf;
}

async function parsePages(buf: Buffer): Promise<PageText[]> {
  const pages: PageText[] = [];
  let pageNo = 0;
  await pdfParse(buf, {
    pagerender: async (pageData: any) => {
      pageNo += 1;
      const content = await pageData.getTextContent();
      const text = content.items
        .map((it: any) => it.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      pages.push({ page: pageNo, text });
      return text;
    },
  });
  return pages;
}

/** Split page texts into ~CHUNK_TARGET-char chunks, keeping page provenance. */
function chunkPages(pages: PageText[]): { text: string; page: number }[] {
  const chunks: { text: string; page: number }[] = [];
  let buf = '';
  let bufPage = pages[0]?.page ?? 1;

  const flush = () => {
    const t = buf.trim();
    if (t.length >= CHUNK_MIN) chunks.push({ text: t, page: bufPage });
    buf = '';
  };

  for (const p of pages) {
    // Sentence-ish segments so chunk boundaries land on natural breaks.
    const segments = p.text.split(/(?<=[.!?।])\s+/);
    for (const seg of segments) {
      if (buf.length === 0) bufPage = p.page;
      buf += (buf ? ' ' : '') + seg;
      if (buf.length >= CHUNK_TARGET) flush();
    }
  }
  flush();
  return chunks;
}

interface IngestResult {
  label: string;
  status: 'ok' | 'skipped' | 'failed';
  detail: string;
  chunks?: number;
}

async function ingestChapter(language: ContentLanguage, chapter: {
  id: string;
  number: number;
  slug: string;
  title: string;
  subject: { slug: string; grade: { number: number } };
}): Promise<IngestResult> {
  const g = chapter.subject.grade.number;
  const label = `G${g} ${chapter.subject.slug} ${chapter.slug} "${chapter.title}"`;

  const resolved = chapterPdfUrl(g, chapter.subject.slug, chapter.slug, chapter.number, language);
  if (!resolved) {
    return { label, status: 'skipped', detail: language === 'te' ? 'no official Telugu edition (NCERT publishes Telugu for Classes 1-8 only)' : 'no NCERT code registered for this book' };
  }

  try {
    const buf = await downloadPdf(resolved.url, resolved.url.split('/').pop()!);
    const pages = await parsePages(buf);
    const totalChars = pages.reduce((s, p) => s + p.text.length, 0);
    if (totalChars < MIN_CHAPTER_CHARS) {
      return {
        label,
        status: 'failed',
        detail: `parsed only ${totalChars} chars (likely image-only scan or wrong file) — not stored`,
      };
    }

    const chunks = chunkPages(pages);
    await prisma.$transaction([
      prisma.contentChunk.deleteMany({ where: { chapterId: chapter.id, language } }),
      prisma.contentChunk.createMany({
        data: chunks.map((c, i) => ({
          chapterId: chapter.id,
          idx: i,
          language,
          text: c.text,
          page: c.page,
          sourceUrl: resolved.url,
        })),
      }),
    ]);
    return {
      label,
      status: 'ok',
      detail: `${pages.length} pages → ${chunks.length} chunks${resolved.verified ? '' : ' (code was pattern-inferred; URL validated)'}`,
      chunks: chunks.length,
    };
  } catch (err: any) {
    return { label, status: 'failed', detail: String(err?.message ?? err) };
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const all = process.argv.includes('--all');
  const grade = arg('grade') ? parseInt(arg('grade')!, 10) : undefined;
  const subject = arg('subject');
  const chapterNo = arg('chapter') ? parseInt(arg('chapter')!, 10) : undefined;
  const language = (arg('lang') ?? 'en') as ContentLanguage;
  if (!['en', 'hi', 'te'].includes(language)) {
    console.log('Unsupported --lang (use en | hi | te)');
    process.exit(1);
  }

  if (!all && !grade) {
    console.log('Usage: ingest-ncert --grade N [--subject slug] [--chapter N] [--lang en|hi|te] | --all [--lang en|hi|te]');
    process.exit(1);
  }

  const chapters = await prisma.curriculumChapter.findMany({
    where: {
      ...(chapterNo !== undefined ? { number: chapterNo } : {}),
      subject: {
        ...(subject ? { slug: subject } : {}),
        ...(grade !== undefined ? { grade: { number: grade } } : {}),
      },
    },
    include: { subject: { include: { grade: true } } },
    orderBy: [{ subject: { gradeId: 'asc' } }, { number: 'asc' }],
  });

  console.log(`Ingesting ${chapters.length} chapter(s) [language: ${language}]…`);
  const results: IngestResult[] = [];
  for (const ch of chapters) {
    const r = await ingestChapter(language, ch);
    results.push(r);
    const mark = r.status === 'ok' ? '✓' : r.status === 'skipped' ? '·' : '✗';
    console.log(`  ${mark} ${r.label}: ${r.detail}`);
    // Be a polite client of a government site.
    await new Promise((res) => setTimeout(res, 400));
  }

  const ok = results.filter((r) => r.status === 'ok');
  const failed = results.filter((r) => r.status === 'failed');
  const skipped = results.filter((r) => r.status === 'skipped');
  console.log(
    `\nDone: ${ok.length} ingested (${ok.reduce((s, r) => s + (r.chunks ?? 0), 0)} chunks), ${skipped.length} skipped, ${failed.length} failed.`
  );
  if (failed.length) {
    console.log('\nFailed chapters (NOT stored — investigate before re-running):');
    for (const f of failed) console.log(`  ✗ ${f.label}: ${f.detail}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
