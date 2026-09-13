/**
 * Adversarial Verifier Agent — the gate between generation and the student.
 *
 * Given generated content and the chapter's official NCERT excerpts, an
 * independent model is prompted to REFUTE the content: find claims the source
 * does not support, wrong answer keys, out-of-syllabus material, or
 * age-inappropriate framing. Deterministic checks (rubric sums, MCQ key ∈
 * options) run first and are free.
 *
 * Verdicts: 'pass' | 'flag' (usable, issues surfaced) | 'block' (must not be
 * shown/cached) | 'unverified' (no provider key or no corpus — labelled, never
 * disguised). Set ADVERSARIAL_VERIFY=0 to disable the LLM pass (deterministic
 * checks still run).
 */

import { callLLMJson } from './model-router';
import type { CorpusChunk } from './corpus';
import { formatSourceBlock } from './corpus';
import type { GeneratedQuestion } from './question-generator';
import { QUESTION_TYPE_INFO } from './question-generator';

export type Verdict = 'pass' | 'flag' | 'block' | 'unverified';

export interface VerificationIssue {
  claim: string;
  problem: string;
  severity: 'minor' | 'major';
}

export interface VerificationResult {
  verdict: Verdict;
  issues: VerificationIssue[];
  checkedBy: string; // provider/model, 'deterministic', or 'skipped'
  at: string; // ISO timestamp
}

function llmVerifyEnabled(): boolean {
  return process.env.ADVERSARIAL_VERIFY !== '0';
}

function result(verdict: Verdict, issues: VerificationIssue[], checkedBy: string): VerificationResult {
  return { verdict, issues, checkedBy, at: new Date().toISOString() };
}

interface LLMVerdict {
  supported: boolean;
  issues: { claim: string; problem: string; severity: 'minor' | 'major' }[];
}

function normalizeIssues(raw: LLMVerdict['issues'] | undefined): VerificationIssue[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i) => i && typeof i.claim === 'string' && typeof i.problem === 'string')
    .map((i) => ({
      claim: i.claim.slice(0, 300),
      problem: i.problem.slice(0, 300),
      severity: i.severity === 'major' ? 'major' : 'minor',
    }));
}

function verdictFromIssues(issues: VerificationIssue[]): Verdict {
  // One factual error in teaching content is one too many.
  if (issues.some((i) => i.severity === 'major')) return 'block';
  if (issues.length > 0) return 'flag';
  return 'pass';
}

/**
 * Verify a generated lesson against the chapter's official excerpts.
 * Skips (verdict 'unverified') when there is no corpus or no provider key.
 */
export async function verifyLesson(
  lesson: {
    introduction: string;
    sections: { heading: string; content: string; example?: string | null }[];
    diagrams?: { title: string; description: string; mermaid: string }[];
    keyTerms: { term: string; definition: string }[];
    summaryPoints: string[];
  },
  chunks: CorpusChunk[],
  ctx: { gradeNumber: number; subjectName: string; chapterTitle: string }
): Promise<VerificationResult> {
  if (chunks.length === 0 || !llmVerifyEnabled()) {
    return result('unverified', [], 'skipped');
  }

  const lessonText = [
    lesson.introduction,
    ...lesson.sections.map((s) => `## ${s.heading}\n${s.content}${s.example ? `\nExample: ${s.example}` : ''}`),
    ...(lesson.diagrams ?? []).map(
      (d) => `## Diagram: ${d.title}\n${d.description}\n(labels and relationships shown):\n${d.mermaid}`
    ),
    ...lesson.keyTerms.map((t) => `${t.term}: ${t.definition}`),
    ...lesson.summaryPoints,
  ].join('\n\n');

  try {
    const res = await callLLMJson<LLMVerdict>({
      tier: 'reasoning',
      temperature: 0.1,
      maxTokens: 2000,
      messages: [
        {
          role: 'system',
          content: `You are an adversarial fact-checker for school teaching content. Your job is to REFUTE the lesson: hunt for claims the official source excerpts do not support. Be skeptical, but do not invent problems.

Rules:
- A claim is a problem if it contradicts the excerpts, states a specific fact/figure/name the excerpts don't contain, or teaches content clearly outside this chapter.
- Severity "major": factually wrong, contradicts the source, or out-of-syllabus. Severity "minor": unsupported-but-plausible embellishment, or wording a Grade ${ctx.gradeNumber} student could misread.
- Simplification appropriate for Grade ${ctx.gradeNumber} is NOT a problem. Real-world connections and everyday examples are allowed even if not in the excerpts, unless factually wrong.
- If the lesson is fully consistent with the excerpts, return supported: true with an empty issues list.

Respond with JSON: {"supported": boolean, "issues": [{"claim": string (quote or paraphrase), "problem": string, "severity": "minor"|"major"}]}`,
        },
        {
          role: 'user',
          content: `## Official NCERT excerpts — ${ctx.subjectName}, "${ctx.chapterTitle}"
${formatSourceBlock(chunks)}

## Lesson to verify
${lessonText}`,
        },
      ],
    });
    const issues = normalizeIssues(res.content?.issues);
    return result(verdictFromIssues(issues), issues, `${res.provider}/${res.model}`);
  } catch {
    // Verification unavailable ≠ content bad; label honestly.
    return result('unverified', [], 'skipped');
  }
}

/** Free deterministic sanity checks on a generated question. */
export function checkQuestionDeterministic(q: GeneratedQuestion): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  const info = QUESTION_TYPE_INFO[q.type];
  if (!info) return [{ claim: q.type, problem: 'Unknown question type', severity: 'major' }];

  if (info.objective) {
    if (!q.options || q.options.length < 2) {
      issues.push({ claim: 'options', problem: 'Objective question has no options', severity: 'major' });
    } else if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
      issues.push({
        claim: q.correctAnswer ?? '(missing)',
        problem: 'Answer key does not match any option',
        severity: 'major',
      });
    }
  } else {
    if (!q.modelAnswer || q.modelAnswer.length < 20) {
      issues.push({ claim: 'modelAnswer', problem: 'Subjective question lacks a model answer', severity: 'major' });
    }
    if (Array.isArray(q.rubric) && q.rubric.length > 0) {
      const total = q.rubric.reduce((s, c) => s + c.marks, 0);
      if (Math.abs(total - q.marks) > 0.01) {
        issues.push({
          claim: `rubric sums to ${total}`,
          problem: `Rubric must sum to ${q.marks} marks`,
          severity: 'major',
        });
      }
    }
  }
  return issues;
}

/**
 * Verify a generated question. Deterministic checks always run; when excerpts
 * and a key exist, an independent model tries to refute the question — for
 * objective types it must solve it blind and agree with the key.
 */
export async function verifyQuestion(
  q: GeneratedQuestion,
  chunks: CorpusChunk[],
  ctx: { gradeNumber: number; subjectName: string; chapterTitle: string }
): Promise<VerificationResult> {
  const detIssues = checkQuestionDeterministic(q);
  if (detIssues.some((i) => i.severity === 'major')) {
    return result('block', detIssues, 'deterministic');
  }
  if (chunks.length === 0 || !llmVerifyEnabled()) {
    return result(detIssues.length ? 'flag' : 'unverified', detIssues, detIssues.length ? 'deterministic' : 'skipped');
  }

  const info = QUESTION_TYPE_INFO[q.type];
  const objectiveTask = info.objective
    ? `First, SOLVE the question yourself using only the excerpts (do not look at the stated key until you have). Then compare with the stated answer key: "${q.correctAnswer}". If your answer differs, that is a MAJOR issue quoting both answers.`
    : `Check the model answer and rubric point-by-point against the excerpts: every fact must be supported; every rubric point must be creditable from the excerpts.`;

  try {
    const res = await callLLMJson<LLMVerdict>({
      tier: 'reasoning',
      temperature: 0.1,
      maxTokens: 1500,
      messages: [
        {
          role: 'system',
          content: `You are an adversarial reviewer of CBSE exam questions for Grade ${ctx.gradeNumber}. Try to REFUTE the question: wrong or ambiguous answer key, facts unsupported by the source excerpts, out-of-chapter content, more than one defensible correct option, or age-inappropriate difficulty. ${objectiveTask}
Do not invent problems; a fair, source-supported question gets supported: true with no issues.

Respond with JSON: {"supported": boolean, "issues": [{"claim": string, "problem": string, "severity": "minor"|"major"}]}`,
        },
        {
          role: 'user',
          content: `## Official NCERT excerpts — ${ctx.subjectName}, "${ctx.chapterTitle}"
${formatSourceBlock(chunks)}

## Question to verify (${q.marks} marks, type ${q.type})
${q.prompt}
${q.options ? `\nOptions:\n${q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}` : ''}
${!info.objective && q.modelAnswer ? `\nModel answer:\n${q.modelAnswer}` : ''}
${!info.objective && Array.isArray(q.rubric) ? `\nRubric:\n${q.rubric.map((r) => `- [${r.marks}] ${r.criterion}`).join('\n')}` : ''}`,
        },
      ],
    });
    const issues = [...detIssues, ...normalizeIssues(res.content?.issues)];
    return result(verdictFromIssues(issues), issues, `${res.provider}/${res.model}`);
  } catch {
    return result(detIssues.length ? 'flag' : 'unverified', detIssues, detIssues.length ? 'deterministic' : 'skipped');
  }
}
