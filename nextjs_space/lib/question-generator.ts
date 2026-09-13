/**
 * Question Generator Agent — creates CBSE-style practice questions grounded
 * in a chapter's learning outcomes, following the official CBSE typology
 * (2025-26 pattern: MCQ/assertion-reason 1 mark, VSA 2 marks, SA 3 marks,
 * LA 5 marks, LA 7 marks, case-study 4 marks with sub-parts; ~50%
 * competency-based, i.e. applied to real-life contexts, not recall).
 *
 * Also generates Olympiad-pattern MCQs (Indian Talent Olympiad format:
 * subject / logical-reasoning / HOTS sections, 4-option, 1 mark) — see
 * lib/olympiad-data.ts for the exam registry and sources.
 */

import { callLLMJson, type ModelTier } from './model-router';
import type { RubricCriterion } from './evaluation';

export interface GeneratedQuestion {
  type: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  prompt: string;
  options?: string[] | null;
  correctAnswer?: string | null;
  modelAnswer?: string | null;
  rubric?: RubricCriterion[] | null;
  outcomeCode?: string | null;
}

export const QUESTION_TYPE_INFO: Record<
  string,
  { label: string; marks: number; objective: boolean; tier: ModelTier }
> = {
  mcq: { label: 'MCQ (1 mark)', marks: 1, objective: true, tier: 'fast' },
  assertion_reason: { label: 'Assertion–Reason (1 mark)', marks: 1, objective: true, tier: 'standard' },
  vsa_2: { label: 'Very Short Answer (2 marks)', marks: 2, objective: false, tier: 'standard' },
  sa_3: { label: 'Short Answer (3 marks)', marks: 3, objective: false, tier: 'standard' },
  la_5: { label: 'Long Answer (5 marks)', marks: 5, objective: false, tier: 'reasoning' },
  la_7: { label: 'Long Answer (7 marks)', marks: 7, objective: false, tier: 'reasoning' },
  case_study: { label: 'Case Study (4 marks)', marks: 4, objective: false, tier: 'reasoning' },
  // Olympiad section types (Indian Talent Olympiad pattern: all MCQ, 1 mark, 4 options)
  olympiad_mcq: { label: 'Olympiad MCQ (subject)', marks: 1, objective: true, tier: 'standard' },
  olympiad_reasoning: { label: 'Olympiad MCQ (logical reasoning)', marks: 1, objective: true, tier: 'standard' },
  olympiad_hots: { label: 'Olympiad MCQ (HOTS / Achievers)', marks: 1, objective: true, tier: 'reasoning' },
};

interface ChapterContext {
  gradeNumber: number;
  subjectName: string;
  chapterTitle: string;
  textbook?: string | null;
  outcomes: { code: string; description: string }[];
  /** Numbered excerpts from the chapter's official NCERT text, when ingested. */
  sourceBlock?: string | null;
}

const TYPE_INSTRUCTIONS: Record<string, string> = {
  mcq: `Four options A-D, exactly one correct. Set "options" to the four option texts (without letters), "correctAnswer" to the exact text of the correct option. Distractors must reflect real student misconceptions, not silly fillers.`,
  assertion_reason: `CBSE assertion-reason format. The prompt must contain "Assertion (A): ..." and "Reason (R): ...". Options are the four standard choices. Set "options" to:
["Both A and R are true and R is the correct explanation of A","Both A and R are true but R is not the correct explanation of A","A is true but R is false","A is false but R is true"] and "correctAnswer" to the correct option text.`,
  vsa_2: `A 2-mark very short answer question. Provide "modelAnswer" (2-4 sentences) and a "rubric" of 2 criteria worth 1 mark each (or 1+1), following CBSE value-point marking.`,
  sa_3: `A 3-mark short answer question. Provide "modelAnswer" (a complete answer a topper would write) and a "rubric" of 3 criteria worth 1 mark each. For numericals: formula (1) + substitution/working (1) + answer with units (1).`,
  la_5: `A 5-mark long answer question. Provide a thorough "modelAnswer" and a "rubric" of 3-5 criteria summing to exactly 5 marks (e.g. 1+2+1+1), following CBSE step-marking conventions.`,
  la_7: `A 7-mark long answer question (state-board LAQ pattern: broader scope than a 5-mark, often two linked parts (a)+(b) or a derivation plus application). Provide a thorough "modelAnswer" and a "rubric" of 4-6 criteria summing to exactly 7 marks (e.g. 2+2+2+1), following step-marking conventions. The question must still be answerable entirely from this one chapter.`,
  case_study: `A CBSE case-study/competency question: a short real-life passage or data scenario (3-5 sentences) followed by sub-questions (i), (ii), (iii) worth 1+1+2 marks inside the same prompt. Provide "modelAnswer" answering all sub-parts and a "rubric" with one criterion per sub-part (1,1,2).`,
  olympiad_mcq: `An Olympiad subject-section MCQ (Indian Talent Olympiad pattern): four options A-D, exactly one correct, testing the class syllabus at a level slightly above routine schoolwork — precise, single-concept, no trick wording. Set "options" to the four option texts and "correctAnswer" to the exact correct option text. Distractors must be plausible near-misses.`,
  olympiad_reasoning: `An Olympiad logical-reasoning MCQ (Indian Talent Olympiad Section 2 pattern): number series, letter series, analogies, coding-decoding, odd-one-out, directions, ranking, mirror images (described in words), simple Venn/deduction — age-appropriate for the given class. The question must be fully self-contained and deterministically solvable; verify the answer by solving it yourself before writing the key. Four options, "correctAnswer" = exact option text.`,
  olympiad_hots: `An Olympiad HOTS / Achievers-section MCQ (Indian Talent Olympiad Section 3 pattern): a higher-order-thinking question on the class syllabus in the style of NCERT Exemplar problems — multi-step reasoning, combining two concepts, or applying a concept in an unfamiliar context. Still one clean correct option. Four options, "correctAnswer" = exact option text.`,
};

export async function generateQuestions(
  ctx: ChapterContext,
  type: string,
  count: number,
  difficulty?: 'easy' | 'medium' | 'hard'
): Promise<{ questions: GeneratedQuestion[]; provider: string; model: string }> {
  const info = QUESTION_TYPE_INFO[type];
  if (!info) throw new Error(`Unknown question type: ${type}`);

  const outcomesBlock =
    ctx.outcomes.length > 0
      ? `Target these learning outcomes (tag each question with the code it assesses via "outcomeCode"):\n${ctx.outcomes
          .map((o) => `- ${o.code}: ${o.description}`)
          .join('\n')}`
      : '';

  const isOlympiad = type.startsWith('olympiad');
  const groundingRule =
    type === 'olympiad_reasoning'
      ? `- Logical-reasoning questions are syllabus-independent: they must be fully self-contained puzzles with exactly one defensible answer. Solve each one yourself before finalizing the key.`
      : ctx.sourceBlock
        ? `- Numbered excerpts from the official NCERT chapter are provided below. Every question, answer key, model answer, and rubric point must be answerable from those excerpts alone. If the excerpts don't support a question idea, pick another idea.`
        : `- Ground every question STRICTLY in the named NCERT chapter for that grade. Never use content from other chapters or higher grades.`;

  const role = isOlympiad
    ? `You are an expert Olympiad question setter creating Indian Talent Olympiad pattern MCQs (the ITO syllabus follows the school curriculum — CBSE/ICSE/State boards — plus logical reasoning and HOTS sections).`
    : `You are an expert CBSE question setter creating board-pattern practice questions.`;

  const system = `${role}
Hard rules:
${groundingRule}
- Match the cognitive level to Grade ${ctx.gradeNumber} (${ctx.gradeNumber <= 5 ? 'young learner: simple language, concrete examples' : ctx.gradeNumber <= 8 ? 'middle stage: application and reasoning' : 'board-exam rigor: competency-based, multi-step'}).
${isOlympiad ? `- Olympiad MCQs are answered in under 90 seconds each: keep stems tight, no multi-part questions.` : `- About half the questions should be competency-based: set in a real-life context, testing application rather than recall (CBSE 2025-26 policy).`}
- Facts must be accurate NCERT content. If unsure of a fact, choose a different question — never invent.
- ${TYPE_INSTRUCTIONS[type]}

Respond with JSON: {"questions": [{"type": "${type}", "marks": ${info.marks}, "difficulty": "easy|medium|hard", "prompt": string, "options": [string] | null, "correctAnswer": string | null, "modelAnswer": string | null, "rubric": [{"criterion": string, "marks": number}] | null, "outcomeCode": string | null}]}`;

  const user = `Create ${count} ${info.label} question(s)${
    difficulty ? ` at ${difficulty} difficulty` : ' with a spread of difficulty'
  } for:
- Grade: ${ctx.gradeNumber} (CBSE)
- Subject: ${ctx.subjectName}
- Chapter: "${ctx.chapterTitle}"${ctx.textbook ? ` (textbook: ${ctx.textbook})` : ''}

${outcomesBlock}${ctx.sourceBlock ? `\n\n## Official NCERT source excerpts (numbered)\n${ctx.sourceBlock}` : ''}`;

  const res = await callLLMJson<{ questions: GeneratedQuestion[] }>({
    tier: info.tier,
    temperature: 0.8,
    maxTokens: 4000,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const raw = Array.isArray(res.content?.questions) ? res.content.questions : [];
  const questions = raw
    .filter((q) => q && typeof q.prompt === 'string' && q.prompt.length > 10)
    .map((q) => sanitize(q, type, info.marks));

  if (questions.length === 0) throw new Error('Model returned no usable questions');
  return { questions, provider: res.provider, model: res.model };
}

function sanitize(q: GeneratedQuestion, type: string, marks: number): GeneratedQuestion {
  const out: GeneratedQuestion = {
    type,
    marks,
    difficulty: (['easy', 'medium', 'hard'] as const).includes(q.difficulty as any)
      ? q.difficulty
      : 'medium',
    prompt: q.prompt.trim(),
    options: Array.isArray(q.options) && q.options.length > 0 ? q.options.map(String) : null,
    correctAnswer: q.correctAnswer ? String(q.correctAnswer) : null,
    modelAnswer: q.modelAnswer ? String(q.modelAnswer) : null,
    rubric: null,
    outcomeCode: q.outcomeCode ? String(q.outcomeCode) : null,
  };
  if (Array.isArray(q.rubric)) {
    const rubric = q.rubric
      .filter((c) => c && typeof c.criterion === 'string' && typeof c.marks === 'number')
      .map((c) => ({ criterion: c.criterion, marks: Math.max(0.5, c.marks) }));
    const total = rubric.reduce((s, c) => s + c.marks, 0);
    // normalize rubric to sum to the question's marks
    if (rubric.length > 0 && total > 0) {
      const factor = marks / total;
      out.rubric = rubric.map((c) => ({
        criterion: c.criterion,
        marks: Math.round(c.marks * factor * 2) / 2,
      }));
    }
  }
  // objective questions must have an answer key; subjective must have a model answer
  const objective = QUESTION_TYPE_INFO[type].objective;
  if (objective && out.options && out.correctAnswer) {
    // ensure the key matches one option (tolerate letter prefixes like "B) ...")
    const match = out.options.find(
      (o) =>
        o.trim().toLowerCase() === out.correctAnswer!.trim().toLowerCase() ||
        out.correctAnswer!.toLowerCase().includes(o.trim().toLowerCase())
    );
    if (match) out.correctAnswer = match;
  }
  return out;
}
