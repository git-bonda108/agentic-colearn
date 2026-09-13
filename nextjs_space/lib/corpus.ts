/**
 * Grounding corpus — retrieval over a chapter's official NCERT text.
 *
 * Retrieval is chapter-scoped (a chapter has ~10-80 chunks), so ranking runs
 * in-process with a lexical score: no embedding API, no cost, deterministic,
 * and it works before any provider key is configured. The ContentChunk
 * `embedding` column is reserved for a future semantic upgrade.
 */

import { prisma } from './db';

export interface CorpusChunk {
  idx: number;
  text: string;
  page: number | null;
  sourceUrl: string;
}

export interface CorpusContext {
  chunks: CorpusChunk[];
  totalChunks: number;
  sourceUrl: string | null;
}

const STOPWORDS = new Set(
  'a an the of to in on for and or is are was were be been it its this that these those with as by from at into we you your their there which what when how why can will would should not no do does did have has had'.split(
    ' '
  )
);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/**
 * Score a chunk against a query with tf × idf-lite weighting.
 * idf is approximated across the chapter's own chunks.
 */
function rankChunks(query: string, chunks: CorpusChunk[]): CorpusChunk[] {
  const qTokens = Array.from(new Set(tokenize(query)));
  if (qTokens.length === 0) return chunks;

  const docFreq = new Map<string, number>();
  const chunkTokens = chunks.map((c) => {
    const tokens = tokenize(c.text);
    const set = new Set(tokens);
    for (const t of set) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
    return tokens;
  });

  const n = chunks.length;
  const scored = chunks.map((c, i) => {
    const counts = new Map<string, number>();
    for (const t of chunkTokens[i]) counts.set(t, (counts.get(t) ?? 0) + 1);
    let score = 0;
    for (const q of qTokens) {
      const tf = counts.get(q) ?? 0;
      if (tf === 0) continue;
      const df = docFreq.get(q) ?? 1;
      score += (1 + Math.log(tf)) * Math.log(1 + n / df);
    }
    return { c, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.c.idx - b.c.idx)
    .map((s) => s.c);
}

/**
 * Select grounding context for a chapter. When `query` is given, the most
 * relevant chunks come first; otherwise chunks keep document order (right for
 * whole-chapter lessons). `charBudget` caps the total context size.
 */
export async function getChapterContext(
  chapterId: string,
  query?: string,
  charBudget = 24_000,
  language: 'en' | 'hi' | 'te' = 'en'
): Promise<CorpusContext & { language: 'en' | 'hi' | 'te' }> {
  let usedLanguage: 'en' | 'hi' | 'te' = language;
  let rows = await prisma.contentChunk.findMany({
    where: { chapterId, language },
    orderBy: { idx: 'asc' },
    select: { idx: true, text: true, page: true, sourceUrl: true },
  });
  // Honest fallback: if the requested language has no ingested corpus,
  // ground in English rather than generating unsourced content.
  if (rows.length === 0 && language !== 'en') {
    usedLanguage = 'en';
    rows = await prisma.contentChunk.findMany({
      where: { chapterId, language: 'en' },
      orderBy: { idx: 'asc' },
      select: { idx: true, text: true, page: true, sourceUrl: true },
    });
  }
  if (rows.length === 0) return { chunks: [], totalChunks: 0, sourceUrl: null, language: usedLanguage };

  const ordered = query ? rankChunks(query, rows) : rows;
  const picked: CorpusChunk[] = [];
  let used = 0;
  for (const c of ordered) {
    if (used + c.text.length > charBudget && picked.length > 0) break;
    picked.push(c);
    used += c.text.length;
  }
  // Present picked chunks in document order — models write better lessons
  // from sequential text, and citation indices stay meaningful.
  picked.sort((a, b) => a.idx - b.idx);
  return { chunks: picked, totalChunks: rows.length, sourceUrl: rows[0].sourceUrl, language: usedLanguage };
}

/** Format chunks as a numbered source block for a prompt. */
export function formatSourceBlock(chunks: CorpusChunk[]): string {
  return chunks
    .map((c) => `[${c.idx}]${c.page ? ` (p.${c.page})` : ''} ${c.text}`)
    .join('\n\n');
}
