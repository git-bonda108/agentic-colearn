/**
 * Registry of official NCERT textbook PDF codes on ncert.nic.in.
 *
 * A chapter's PDF lives at:
 *   https://ncert.nic.in/textbook/pdf/{code}{NN}.pdf
 * where {code} is the book code including its volume digit (e.g. "jesc1")
 * and {NN} is the 2-digit chapter file number. Two-part books whose chapter
 * numbering is continuous (Physics 11/12 etc.) restart FILE numbering in
 * part 2 — the `range`/`offset` fields encode that.
 *
 * `verified: true` means this exact code appeared in an official ncert.nic.in
 * URL fetched during the Aug 2026 curriculum research. Unverified codes follow
 * NCERT's stable naming pattern but MUST be confirmed by the ingest script's
 * URL check before any content is stored (it refuses to store on failure).
 */

export interface NcertBookCode {
  grade: number;
  subjectSlug: string;
  /** Book key used as the chapter-slug prefix for multi-book subjects ('' = none). */
  bookKey: string;
  code: string;
  /** Inclusive chapter-number range this code covers (for continuous two-part books). */
  range?: [number, number];
  /** Subtract from the chapter number to get the file number (part-2 files restart at 01). */
  offset?: number;
  verified: boolean;
}

const B = (
  grade: number,
  subjectSlug: string,
  bookKey: string,
  code: string,
  verified: boolean,
  range?: [number, number],
  offset?: number
): NcertBookCode => ({ grade, subjectSlug, bookKey, code, verified, range, offset });

export const NCERT_CODES: NcertBookCode[] = [
  // Foundational
  B(1, 'mathematics', '', 'aejm1', true),
  B(1, 'english', '', 'aemr1', true),
  B(2, 'mathematics', '', 'bejm1', true),
  B(2, 'english', '', 'bemr1', true),
  // Preparatory
  B(3, 'mathematics', '', 'cemm1', true),
  B(3, 'english', '', 'cesa1', true),
  B(3, 'evs', '', 'ceev1', true),
  B(4, 'mathematics', '', 'demm1', false), // pattern: Maths Mela 4
  B(4, 'english', '', 'desa1', true),
  B(4, 'evs', '', 'deev1', false), // pattern: Our Wondrous World 4
  B(5, 'mathematics', '', 'eemm1', true),
  B(5, 'english', '', 'eesa1', true),
  B(5, 'evs', '', 'eeev1', true),
  // Middle
  B(6, 'mathematics', '', 'fegp1', true),
  B(6, 'science', '', 'fecu1', false), // pattern: Curiosity 6
  B(6, 'social-science', '', 'fees1', true),
  B(6, 'english', '', 'fepr1', true),
  B(7, 'mathematics', 'part-1', 'gegp1', true),
  B(7, 'mathematics', 'part-2', 'gegp2', true),
  B(7, 'science', '', 'gecu1', true),
  B(7, 'social-science', 'part-1', 'gees1', true),
  B(7, 'social-science', 'part-2', 'gees2', true),
  B(8, 'mathematics', 'part-1', 'hegp1', true),
  B(8, 'mathematics', 'part-2', 'hegp2', true),
  B(8, 'science', '', 'hecu1', false), // pattern: Curiosity 8
  B(8, 'social-science', 'part-1', 'hees1', true),
  B(8, 'social-science', 'part-2', 'hees2', true),
  // Secondary — Grade 9 uses the new 2026-27 NCF books
  B(9, 'science', '', 'iesc1', true), // Exploration
  B(9, 'mathematics', '', 'iemh1', true), // Ganita Manjari
  B(9, 'social-science', '', 'iest1', true), // Understanding Society Part-I
  B(9, 'english', '', 'iebe1', true), // Kaveri
  B(10, 'science', '', 'jesc1', false), // rationalized Science (stable code)
  B(10, 'mathematics', '', 'jemh1', false), // rationalized Mathematics (stable code)
  B(10, 'social-science', 'history', 'jess3', true),
  B(10, 'social-science', 'geography', 'jess1', true),
  B(10, 'social-science', 'civics', 'jess4', true),
  B(10, 'social-science', 'economics', 'jess2', true),
  B(10, 'english', 'first-flight', 'jeff1', true),
  B(10, 'english', 'footprints', 'jefp1', true),
  // Senior secondary (two-part continuous books use range/offset)
  B(11, 'physics', '', 'keph1', true, [1, 7]),
  B(11, 'physics', '', 'keph2', true, [8, 14], 7),
  B(11, 'chemistry', '', 'kech1', true, [1, 6]),
  B(11, 'chemistry', '', 'kech2', true, [7, 9], 6),
  B(11, 'mathematics', '', 'kemh1', true),
  B(11, 'biology', '', 'kebo1', true),
  B(11, 'accountancy', '', 'keac1', true, [1, 7]),
  B(11, 'accountancy', '', 'keac2', true, [8, 9], 7),
  B(11, 'economics', 'ied', 'keec1', true),
  B(12, 'physics', '', 'leph1', true, [1, 8]),
  B(12, 'physics', '', 'leph2', true, [9, 14], 8),
  B(12, 'chemistry', '', 'lech1', true, [1, 5]),
  B(12, 'chemistry', '', 'lech2', true, [6, 10], 5),
  B(12, 'mathematics', '', 'lemh1', true, [1, 6]),
  B(12, 'mathematics', '', 'lemh2', true, [7, 13], 6),
  B(12, 'biology', '', 'lebo1', true),
  B(12, 'economics', 'macro', 'leec1', true),
  B(12, 'economics', 'micro', 'leec2', true),
];

/** Extract the book key from a chapter slug: 'history-ch-1' → 'history', 'ch-3' → ''. */
export function bookKeyFromSlug(slug: string): string {
  const m = slug.match(/^(.*?)-?ch-\d+$/);
  return m ? m[1] : '';
}

export type ContentLanguage = 'en' | 'hi' | 'te';

/**
 * NCERT publishes parallel language editions with a medium token after the
 * grade letter in the book code:
 *   'e' = English, 'h' = Hindi, 'u' = Urdu (e.g. jesc1 → jhsc1, Class 10
 *   Science / विज्ञान), and — for the new NCF series, Classes 1–8 only —
 *   'tl' = Telugu (e.g. fegp1 → ftlgp1, Ganita Prakash / గణిత ప్రకాశ్).
 * Both patterns were verified empirically against ncert.nic.in in Aug 2026
 * (Hindi: jhsc/jhmh/fhgp/ihsc; Telugu: atljm/ftlcu/gtlgp/htles/etlmm all
 * serve real PDFs). No official Telugu editions exist for Classes 9–12.
 */
function codeForLanguage(code: string, language: ContentLanguage): string | null {
  if (language === 'en') return code;
  if (language === 'hi') return code[0] + 'h' + code.slice(2);
  if (language === 'te') {
    // Grade letters a..h = Classes 1..8, the range NCERT covers in Telugu.
    if (code[0] >= 'a' && code[0] <= 'h') return code[0] + 'tl' + code.slice(2);
    return null;
  }
  return null;
}

/** Resolve the official chapter PDF URL, or null when the book isn't in the registry. */
export function chapterPdfUrl(
  grade: number,
  subjectSlug: string,
  chapterSlug: string,
  chapterNumber: number,
  language: ContentLanguage = 'en'
): { url: string; code: string; verified: boolean; language: ContentLanguage } | null {
  const bookKey = bookKeyFromSlug(chapterSlug);
  const entry = NCERT_CODES.find(
    (e) =>
      e.grade === grade &&
      e.subjectSlug === subjectSlug &&
      e.bookKey === bookKey &&
      (!e.range || (chapterNumber >= e.range[0] && chapterNumber <= e.range[1]))
  );
  if (!entry) return null;
  const langCode = codeForLanguage(entry.code, language);
  if (!langCode) return null;
  const fileNo = chapterNumber - (entry.offset ?? 0);
  const nn = String(fileNo).padStart(2, '0');
  return {
    url: `https://ncert.nic.in/textbook/pdf/${langCode}${nn}.pdf`,
    code: langCode,
    // Hindi codes are pattern-derived; the ingest pipeline validates every
    // download (magic bytes + length), so a missing edition fails loudly.
    verified: language === 'en' ? entry.verified : false,
    language,
  };
}
