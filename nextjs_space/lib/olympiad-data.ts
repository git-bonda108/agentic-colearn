/**
 * Olympiad exam registry — Indian Talent Olympiad (ITO, indiantalent.org).
 *
 * Every fact here was researched from the official ITO site (Aug 2026):
 *   - Exam list + classes:   https://www.indiantalent.org/olympiad-exams
 *   - Pattern (35/50 MCQs):  https://www.indiantalent.org/olympiad-exam-pattern
 *   - Syllabus alignment:    https://www.indiantalent.org/olympiad-syllabus
 *     ("The questions asked in these exams are based on school curriculum.
 *      It suits all boards namely CBSE, ICSE and other State boards.")
 *   - Duration, fees, levels: https://www.indiantalent.org/faq
 *
 * Because the ITO syllabus IS the school syllabus (plus logical-reasoning and
 * HOTS sections), preparation material reuses the app's grounded NCERT chapter
 * workspaces: an Olympiad exam links to the school subject's chapters for
 * lessons/visuals, and generates ITO-pattern MCQs through the same
 * generate → adversarially-verify → store pipeline as CBSE practice.
 *
 * Note: ITO's "IMO"/"EIO" abbreviations collide with SOF's better-known exams
 * of the same names; everything in this file refers to the ITO exams.
 */

export interface OlympiadSection {
  key: 'subject' | 'reasoning' | 'hots';
  label: string;
  /** Question type key in QUESTION_TYPE_INFO. */
  questionType: 'olympiad_mcq' | 'olympiad_reasoning' | 'olympiad_hots';
  count: number;
}

export interface OlympiadFormat {
  totalQuestions: number;
  totalMarks: number;
  durationMinutes: number;
  sections: OlympiadSection[];
  note?: string;
}

export interface OlympiadExam {
  slug: string;
  abbrev: string;
  name: string;
  description: string;
  /** Inclusive class range the exam is conducted for (KG levels ignored). */
  minClass: number;
  maxClass: number;
  /**
   * School-subject slugs (per grade) whose NCERT chapters form the exam
   * syllabus — used to link prep material and to ground generated MCQs.
   * Key '*' applies to all classes in range; numeric keys override.
   */
  subjectSlugs: Record<string, string[]>;
  /** MCQ practice supported (false for drawing/essay/abacus-style exams). */
  practiceable: boolean;
  color: string;
}

/**
 * Annual exam pattern (https://www.indiantalent.org/olympiad-exam-pattern):
 *   Classes 1-4: 35 MCQs / 35 marks — 20 subject + 10 logical reasoning + 5 HOT
 *   Classes 5-10: 50 MCQs / 50 marks — 35 subject + 10 logical reasoning + 5 HOT
 *   Duration 65 minutes, all MCQ with 4 options, no negative marking stated.
 * (ITO's FAQ gives a slightly different internal split — 25+10 / 35+15 — the
 * totals agree; we follow the exam-pattern page.)
 * Classes 11-12 (ISO/IMO/EIO/CIO only) follow the senior pattern; ITO does not
 * publish a distinct 11-12 breakdown, so the 50-question split is used.
 */
export function olympiadFormat(gradeNumber: number): OlympiadFormat {
  const junior = gradeNumber <= 4;
  return {
    totalQuestions: junior ? 35 : 50,
    totalMarks: junior ? 35 : 50,
    durationMinutes: 65,
    sections: [
      {
        key: 'subject',
        label: 'Section 1 · Subject',
        questionType: 'olympiad_mcq',
        count: junior ? 20 : 35,
      },
      {
        key: 'reasoning',
        label: 'Section 2 · Logical Reasoning',
        questionType: 'olympiad_reasoning',
        count: 10,
      },
      {
        key: 'hots',
        label: 'Section 3 · HOTS (Achievers)',
        questionType: 'olympiad_hots',
        count: 5,
      },
    ],
    note:
      gradeNumber >= 11
        ? 'ITO does not publish a separate Class 11-12 breakdown; the senior 50-question pattern is used here.'
        : undefined,
  };
}

export const OLYMPIAD_EXAMS: OlympiadExam[] = [
  {
    slug: 'iso',
    abbrev: 'ISO',
    name: 'International Science Olympiad',
    description: 'Science Olympiad on the school syllabus with logical reasoning and HOTS sections.',
    minClass: 1,
    maxClass: 12,
    subjectSlugs: {
      '*': ['science'],
      '3': ['evs'], '4': ['evs'], '5': ['evs'],
      '1': [], '2': [],
      '11': ['physics', 'chemistry', 'biology'],
      '12': ['physics', 'chemistry', 'biology'],
    },
    practiceable: true,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    slug: 'imo',
    abbrev: 'IMO',
    name: 'International Maths Olympiad',
    description: 'Mathematics Olympiad on the school syllabus with logical reasoning and HOTS sections.',
    minClass: 1,
    maxClass: 12,
    subjectSlugs: { '*': ['mathematics'] },
    practiceable: true,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    slug: 'eio',
    abbrev: 'EIO',
    name: 'English International Olympiad',
    description: 'English language Olympiad — grammar, vocabulary and comprehension on the school syllabus.',
    minClass: 1,
    maxClass: 12,
    subjectSlugs: { '*': ['english'] },
    practiceable: true,
    color: 'from-rose-500 to-pink-500',
  },
  {
    slug: 'gkio',
    abbrev: 'GKIO',
    name: 'General Knowledge International Olympiad',
    description: 'General knowledge and current awareness Olympiad.',
    minClass: 1,
    maxClass: 10,
    subjectSlugs: { '*': [], '3': ['evs'], '4': ['evs'], '5': ['evs'], '6': ['social-science'], '7': ['social-science'], '8': ['social-science'], '9': ['social-science'], '10': ['social-science'] },
    practiceable: true,
    color: 'from-amber-500 to-orange-500',
  },
  {
    slug: 'ico',
    abbrev: 'ICO',
    name: 'International Computer Olympiad',
    description: 'Computer and technology fundamentals Olympiad.',
    minClass: 1,
    maxClass: 10,
    subjectSlugs: { '*': [], '9': ['it-skill'], '10': ['it-skill'] },
    practiceable: true,
    color: 'from-violet-500 to-purple-500',
  },
  {
    slug: 'nlro',
    abbrev: 'NLRO',
    name: 'National Logical Reasoning Olympiad',
    description: 'A dedicated reasoning Olympiad — series, analogies, coding-decoding, spatial and analytical puzzles.',
    minClass: 1,
    maxClass: 10,
    subjectSlugs: { '*': [] },
    practiceable: true,
    color: 'from-fuchsia-500 to-pink-500',
  },
  {
    slug: 'nsso',
    abbrev: 'NSSO',
    name: 'National Social Studies Olympiad',
    description: 'Social studies Olympiad on the school syllabus.',
    minClass: 1,
    maxClass: 10,
    subjectSlugs: { '*': [], '6': ['social-science'], '7': ['social-science'], '8': ['social-science'], '9': ['social-science'], '10': ['social-science'], '3': ['evs'], '4': ['evs'], '5': ['evs'] },
    practiceable: true,
    color: 'from-sky-500 to-blue-500',
  },
  {
    slug: 'nho',
    abbrev: 'NHO',
    name: 'National Hindi Olympiad',
    description: 'Hindi language Olympiad on the school syllabus.',
    minClass: 1,
    maxClass: 10,
    subjectSlugs: { '*': ['hindi'] },
    practiceable: true,
    color: 'from-orange-500 to-amber-500',
  },
  {
    slug: 'cio',
    abbrev: 'CIO',
    name: 'Commerce International Olympiad',
    description: 'Commerce Olympiad for senior classes — accountancy, business studies and economics.',
    minClass: 11,
    maxClass: 12,
    subjectSlugs: { '*': ['accountancy', 'business-studies', 'economics'] },
    practiceable: true,
    color: 'from-lime-500 to-green-500',
  },
  {
    slug: 'neso',
    abbrev: 'NESO',
    name: 'National Essay Olympiad',
    description: 'Essay-writing Olympiad — written expression, not MCQ (practice in-app not applicable).',
    minClass: 1,
    maxClass: 10,
    subjectSlugs: { '*': ['english'] },
    practiceable: false,
    color: 'from-slate-500 to-gray-500',
  },
  {
    slug: 'ido',
    abbrev: 'IDO',
    name: 'International Drawing Olympiad',
    description: 'Drawing and art Olympiad — creative submission, not MCQ (practice in-app not applicable).',
    minClass: 1,
    maxClass: 10,
    subjectSlugs: { '*': [] },
    practiceable: false,
    color: 'from-purple-500 to-fuchsia-500',
  },
];

/** School-subject slugs whose chapters form this exam's syllabus for a grade. */
export function syllabusSubjectsFor(exam: OlympiadExam, gradeNumber: number): string[] {
  return exam.subjectSlugs[String(gradeNumber)] ?? exam.subjectSlugs['*'] ?? [];
}

export function examsForGrade(gradeNumber: number): OlympiadExam[] {
  return OLYMPIAD_EXAMS.filter((e) => gradeNumber >= e.minClass && gradeNumber <= e.maxClass);
}

export interface TrustedSource {
  label: string;
  url: string;
  what: string;
}

/**
 * Trusted preparation sources, in priority order. Official / government
 * sources only — same policy as lib/approved-search.ts. Full rationale in
 * docs/TRUSTED-SOURCES.md.
 */
export const OLYMPIAD_SOURCES: TrustedSource[] = [
  {
    label: 'ITO — Olympiad exams overview',
    url: 'https://www.indiantalent.org/olympiad-exams',
    what: 'Official list of Indian Talent Olympiad exams and the classes each covers.',
  },
  {
    label: 'ITO — Exam pattern',
    url: 'https://www.indiantalent.org/olympiad-exam-pattern',
    what: 'Official paper pattern: 35 MCQs (classes 1-4) / 50 MCQs (classes 5-10), subject + logical reasoning + HOTS sections.',
  },
  {
    label: 'ITO — Syllabus',
    url: 'https://www.indiantalent.org/olympiad-syllabus',
    what: 'Confirms the syllabus follows the school curriculum (CBSE, ICSE and State boards).',
  },
  {
    label: 'ITO — Free sample papers',
    url: 'https://www.indiantalent.org/olympiad-sample-papers',
    what: 'Official sample papers per subject and class, free to download (previous-year sets are sold separately).',
  },
  {
    label: 'ITO — Exam schedule',
    url: 'https://www.indiantalent.org/olympiad-exam-schedule',
    what: 'Official annual exam dates (typically December and February attempts).',
  },
  {
    label: 'NCERT textbooks',
    url: 'https://ncert.nic.in/textbook.php',
    what: 'The official textbooks the exam syllabus is based on — this app grounds its lessons and questions in these PDFs.',
  },
  {
    label: 'NCERT Exemplar problems',
    url: 'https://ncert.nic.in/exemplar-problems.php',
    what: 'Official higher-order-thinking problem books (Maths & Science, classes 6-12) — the closest match to the HOTS section.',
  },
  {
    label: 'DIKSHA',
    url: 'https://diksha.gov.in/',
    what: "Government of India's school learning platform: energized textbooks and practice content for every board.",
  },
  {
    label: 'HBCSE Olympiads',
    url: 'https://olympiads.hbcse.tifr.res.in/',
    what: 'The official national Science/Maths Olympiad programme (IOQM/NSE track) — advanced enrichment beyond ITO level.',
  },
];
