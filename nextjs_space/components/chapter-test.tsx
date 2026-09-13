'use client';

/**
 * Chapter Mock Test — a CBSE-blueprint mini paper for one chapter.
 *
 * Flow: blueprint preview → attempt (no per-question feedback, exam style)
 * → batch grading via /api/evaluate → scorecard with section-wise and
 * mark-wise distribution plus full examiner feedback per question.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Sparkles,
  Timer,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Quote,
  RotateCcw,
} from 'lucide-react';

interface TestQuestion {
  id: string;
  type: string;
  marks: number;
  difficulty: string;
  prompt: string;
  options?: string[] | null;
  outcome?: { code: string; description: string } | null;
}

interface TestSection {
  section: string;
  sectionTitle: string;
  questions: TestQuestion[];
}

interface AssembledTest {
  chapter: { id: string; number: number; title: string };
  grade: number;
  subject: string;
  blueprint: {
    section: string;
    sectionTitle: string;
    type: string;
    typeLabel: string;
    marksEach: number;
    count: number;
  }[];
  sections: TestSection[];
  totalMarks: number;
  fullMarks: number;
  questionCount: number;
  shortfall: { type: string; typeLabel: string; needed: number; available: number }[];
}

interface GradedItem {
  question: TestQuestion;
  section: string;
  answer: string;
  evaluation?: any;
  modelAnswer?: string | null;
  correctAnswer?: string | null;
  error?: string;
}

const OBJECTIVE_TYPES = new Set(['mcq', 'assertion_reason', 'true_false', 'fill_blank', 'match']);

type Phase = 'setup' | 'taking' | 'grading' | 'result';

export default function ChapterTest({
  chapterId,
  mode = 'test',
  onMasteryChanged,
}: {
  chapterId: string;
  /** 'diagnostic' assembles a 5-question entry probe and sets the BKT prior on completion. */
  mode?: 'test' | 'diagnostic';
  onMasteryChanged?: () => void;
}) {
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>('setup');
  const [test, setTest] = useState<AssembledTest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  // taking
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // grading / result
  const [gradingProgress, setGradingProgress] = useState(0);
  const [graded, setGraded] = useState<GradedItem[]>([]);
  const [openReview, setOpenReview] = useState<string | null>(null);

  const flatQuestions = useMemo(() => {
    if (!test) return [] as { q: TestQuestion; section: string; sectionTitle: string }[];
    return test.sections.flatMap((s) =>
      s.questions.map((q) => ({ q, section: s.section, sectionTitle: s.sectionTitle }))
    );
  }, [test]);

  const assemble = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/test/assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId, mode }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Failed to assemble test');
      setTest(d);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to assemble test');
    } finally {
      setLoading(false);
    }
  }, [chapterId, mode]);

  useEffect(() => {
    assemble();
  }, [assemble]);

  useEffect(() => {
    if (phase === 'taking') {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [phase]);

  const fillGaps = async () => {
    if (!test) return;
    setError(null);
    try {
      for (const gap of test.shortfall) {
        setGenerating(gap.typeLabel);
        const res = await fetch('/api/questions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapterId,
            type: gap.type,
            count: Math.min(5, gap.needed - gap.available),
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d?.error ?? `Failed to generate ${gap.typeLabel} questions`);
        }
      }
      await assemble();
    } catch (e: any) {
      setError(e?.message ?? 'Question generation failed');
    } finally {
      setGenerating(null);
    }
  };

  const startTest = () => {
    setAnswers({});
    setQIndex(0);
    setElapsed(0);
    setGraded([]);
    setPhase('taking');
  };

  const submitTest = async () => {
    if (!test) return;
    setPhase('grading');
    setGradingProgress(0);
    const results: GradedItem[] = [];
    for (let i = 0; i < flatQuestions.length; i++) {
      const { q, section } = flatQuestions[i];
      const answer = (answers[q.id] ?? '').trim();
      if (!answer) {
        results.push({
          question: q,
          section,
          answer: '',
          evaluation: {
            scoreAwarded: 0,
            maxMarks: q.marks,
            percentage: 0,
            criteria: [],
            missingPoints: ['Question was not attempted.'],
            misconceptions: [],
            improvementSuggestions: [],
            overallComment: 'Not attempted.',
            evaluator: 'auto',
          },
        });
      } else {
        try {
          const res = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionId: q.id, answer }),
          });
          const d = await res.json();
          if (!res.ok) throw new Error(d?.error ?? 'Grading failed');
          results.push({
            question: q,
            section,
            answer,
            evaluation: d.evaluation,
            modelAnswer: d.modelAnswer,
            correctAnswer: d.correctAnswer,
          });
        } catch (e: any) {
          results.push({
            question: q,
            section,
            answer,
            error: e?.message ?? 'Grading failed',
          });
        }
      }
      setGradingProgress(i + 1);
    }
    setGraded(results);
    if (mode === 'diagnostic') {
      try {
        const res = await fetch('/api/diagnostic/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterId }),
        });
        if (res.ok) setDiagnosticResult(await res.json());
      } catch {
        /* diagnostic prior is best-effort; the scorecard still shows */
      }
    }
    setPhase('result');
    onMasteryChanged?.();
  };

  const totals = useMemo(() => {
    const scored = graded.reduce((s, g) => s + (g.evaluation?.scoreAwarded ?? 0), 0);
    const max = graded.reduce((s, g) => s + g.question.marks, 0);
    const bySection = new Map<string, { scored: number; max: number }>();
    const byMarks = new Map<number, { scored: number; max: number; count: number }>();
    for (const g of graded) {
      const sec = bySection.get(g.section) ?? { scored: 0, max: 0 };
      sec.scored += g.evaluation?.scoreAwarded ?? 0;
      sec.max += g.question.marks;
      bySection.set(g.section, sec);
      const mk = byMarks.get(g.question.marks) ?? { scored: 0, max: 0, count: 0 };
      mk.scored += g.evaluation?.scoreAwarded ?? 0;
      mk.max += g.question.marks;
      mk.count += 1;
      byMarks.set(g.question.marks, mk);
    }
    return { scored, max, bySection, byMarks };
  }, [graded]);

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── SETUP ─────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="space-y-6">
        {loading && (
          <div className="text-center py-16 rounded-2xl bg-gray-800/40 border border-gray-700">
            <Loader2 className="w-8 h-8 text-purple-400 mx-auto animate-spin mb-3" />
            <p className="text-gray-400 text-sm">Assembling your test paper…</p>
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-300">
            {error}
          </div>
        )}
        {test && !loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6 mb-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />{' '}
                  {mode === 'diagnostic' ? 'Diagnostic Check' : 'Chapter Mock Test'}
                </h3>
                <span className="text-xs text-gray-400">
                  Grade {test.grade} · {test.subject}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-5">
                Modelled on the CBSE board paper blueprint — answer every section, then the AI
                examiner grades the whole paper against CBSE-style marking schemes.
              </p>

              {/* blueprint table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-700">
                      <th className="py-2 pr-4">Section</th>
                      <th className="py-2 pr-4">Question type</th>
                      <th className="py-2 pr-4 text-center">Questions</th>
                      <th className="py-2 pr-4 text-center">Marks each</th>
                      <th className="py-2 text-right">Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {test.blueprint.map((b, i) => {
                      const gap = test.shortfall.find((s) => s.type === b.type);
                      return (
                        <tr key={i} className="border-b border-gray-700/50 text-gray-300">
                          <td className="py-2.5 pr-4 font-semibold text-purple-300">{b.section}</td>
                          <td className="py-2.5 pr-4">
                            {b.typeLabel}
                            {gap && (
                              <span className="ml-2 text-[11px] text-amber-400">
                                ({gap.available}/{gap.needed} ready)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-center">{b.count}</td>
                          <td className="py-2.5 pr-4 text-center">{b.marksEach}</td>
                          <td className="py-2.5 text-right">{b.count * b.marksEach}</td>
                        </tr>
                      );
                    })}
                    <tr className="text-white font-semibold">
                      <td colSpan={4} className="py-3 pr-4">
                        Total (this paper: {test.questionCount} questions)
                      </td>
                      <td className="py-3 text-right">
                        {test.totalMarks}
                        {test.totalMarks < test.fullMarks && (
                          <span className="text-gray-500 font-normal"> / {test.fullMarks}</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {test.shortfall.length > 0 && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 mb-5 text-sm text-amber-200 flex items-start justify-between gap-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    The question bank doesn&apos;t have enough{' '}
                    {test.shortfall.map((s) => s.typeLabel).join(', ')} questions for the full
                    blueprint. Generate the missing ones, or start with a shorter paper.
                  </span>
                </div>
                <button
                  onClick={fillGaps}
                  disabled={!!generating}
                  className="shrink-0 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-100 text-xs font-semibold hover:bg-amber-500/30 transition-all disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> {generating}…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" /> Generate missing
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={startTest}
                disabled={test.questionCount === 0}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all disabled:opacity-40"
              >
                Start Test ({test.totalMarks} marks)
              </button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // ── TAKING ────────────────────────────────────────────────
  if (phase === 'taking' && test) {
    const current = flatQuestions[qIndex];
    const q = current.q;
    const isObjective = OBJECTIVE_TYPES.has(q.type);
    const answered = Object.keys(answers).filter((id) => (answers[id] ?? '').trim()).length;

    return (
      <div className="space-y-4">
        {/* status bar */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-purple-400" /> {fmtTime(elapsed)}
          </span>
          <span>
            {answered} of {flatQuestions.length} answered
          </span>
        </div>

        {/* question palette */}
        <div className="flex flex-wrap gap-1.5">
          {flatQuestions.map((fq, i) => (
            <button
              key={fq.q.id}
              onClick={() => setQIndex(i)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all border ${
                i === qIndex
                  ? 'bg-purple-500 border-purple-400 text-white'
                  : (answers[fq.q.id] ?? '').trim()
                    ? 'bg-green-500/20 border-green-500/50 text-green-300'
                    : 'bg-gray-800/60 border-gray-700 text-gray-400'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-4 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/40 text-purple-300">
                Section {current.section} · {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
              </span>
              <span className="text-gray-500">
                Q{qIndex + 1} / {flatQuestions.length}
              </span>
            </div>
            <div className="text-white whitespace-pre-line leading-relaxed mb-5">{q.prompt}</div>

            {isObjective && q.options ? (
              <div className="space-y-2">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                      answers[q.id] === opt
                        ? 'bg-purple-500/20 border-purple-500/60 text-white'
                        : 'bg-gray-700/40 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <span className="font-semibold mr-2 text-purple-300">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                rows={q.marks >= 5 ? 10 : q.marks >= 3 ? 7 : 4}
                placeholder={`Write your ${q.marks}-mark answer…`}
                className="w-full rounded-xl bg-gray-700/40 border border-gray-600 focus:border-purple-500/60 focus:outline-none p-4 text-sm text-white placeholder-gray-500 resize-y"
              />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setQIndex((i) => Math.max(0, i - 1))}
            disabled={qIndex === 0}
            className="px-4 py-2 rounded-xl bg-gray-800/60 border border-gray-700 text-sm text-gray-300 hover:text-white transition-all disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          {qIndex < flatQuestions.length - 1 ? (
            <button
              onClick={() => setQIndex((i) => Math.min(flatQuestions.length - 1, i + 1))}
              className="px-5 py-2 rounded-xl bg-gray-800/60 border border-gray-700 text-sm text-gray-300 hover:text-white transition-all inline-flex items-center gap-1.5"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submitTest}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all"
            >
              Submit Paper
            </button>
          )}
        </div>
        {answered < flatQuestions.length && qIndex === flatQuestions.length - 1 && (
          <p className="text-right text-xs text-amber-400">
            {flatQuestions.length - answered} unanswered question
            {flatQuestions.length - answered === 1 ? '' : 's'} will score 0.
          </p>
        )}
      </div>
    );
  }

  // ── GRADING ───────────────────────────────────────────────
  if (phase === 'grading') {
    return (
      <div className="text-center py-16 rounded-2xl bg-gray-800/40 border border-gray-700">
        <Loader2 className="w-8 h-8 text-purple-400 mx-auto animate-spin mb-4" />
        <h3 className="text-white font-semibold mb-2">The examiner is grading your paper…</h3>
        <p className="text-gray-400 text-sm mb-4">
          Question {Math.min(gradingProgress + 1, flatQuestions.length)} of {flatQuestions.length}
        </p>
        <div className="max-w-xs mx-auto h-2 rounded-full bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
            style={{ width: `${(gradingProgress / Math.max(1, flatQuestions.length)) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  // ── RESULT ────────────────────────────────────────────────
  const pct = totals.max > 0 ? Math.round((totals.scored / totals.max) * 100) : 0;
  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl border p-6 text-center ${
          pct >= 80
            ? 'bg-green-500/10 border-green-500/40'
            : pct >= 40
              ? 'bg-amber-500/10 border-amber-500/40'
              : 'bg-rose-500/10 border-rose-500/40'
        }`}
      >
        <div className="text-5xl font-bold text-white mb-1">
          {totals.scored}
          <span className="text-2xl text-gray-400"> / {totals.max}</span>
        </div>
        <div className="text-sm text-gray-300">
          {pct}% · completed in {fmtTime(elapsed)}
        </div>
      </motion.div>

      {mode === 'diagnostic' && diagnosticResult && (
        <div className="rounded-2xl bg-purple-500/10 border border-purple-500/30 p-5 text-sm text-purple-100">
          <div className="font-semibold mb-1">
            Starting level: {Math.round((diagnosticResult.prior ?? 0) * 100)}% (
            {diagnosticResult.level === 'mastered'
              ? 'strong'
              : diagnosticResult.level === 'developing'
                ? 'developing'
                : 'building basics'}
            )
          </div>
          <p className="text-purple-200/80 text-xs">{diagnosticResult.reason}. The Diagnostic
          Agent will target practice at this level and adjust with every answer.</p>
        </div>
      )}

      {/* section-wise distribution */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-5">
          <h4 className="text-white font-semibold text-sm mb-4">Marks by section</h4>
          <div className="space-y-3">
            {Array.from(totals.bySection.entries()).map(([sec, v]) => (
              <div key={sec}>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Section {sec}</span>
                  <span>
                    {v.scored} / {v.max}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500"
                    style={{ width: `${v.max ? (v.scored / v.max) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-5">
          <h4 className="text-white font-semibold text-sm mb-4">Marks by question value</h4>
          <div className="space-y-3">
            {Array.from(totals.byMarks.entries())
              .sort(([a], [b]) => a - b)
              .map(([marks, v]) => (
                <div key={marks}>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>
                      {marks}-mark × {v.count}
                    </span>
                    <span>
                      {v.scored} / {v.max}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        v.max && v.scored / v.max >= 0.8
                          ? 'bg-green-500'
                          : v.max && v.scored / v.max >= 0.4
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      }`}
                      style={{ width: `${v.max ? (v.scored / v.max) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* per-question review */}
      <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-5">
        <h4 className="text-white font-semibold text-sm mb-4">Answer review</h4>
        <div className="space-y-2">
          {graded.map((g, i) => {
            const ev = g.evaluation;
            const open = openReview === g.question.id;
            return (
              <div key={g.question.id} className="rounded-xl bg-gray-700/40 overflow-hidden">
                <button
                  onClick={() => setOpenReview(open ? null : g.question.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-xs text-gray-300 truncate mr-3">
                    Q{i + 1}. {g.question.prompt.slice(0, 80)}
                    {g.question.prompt.length > 80 ? '…' : ''}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      g.error
                        ? 'bg-gray-500/20 text-gray-300'
                        : (ev?.scoreAwarded ?? 0) / g.question.marks >= 0.8
                          ? 'bg-green-500/20 text-green-300'
                          : (ev?.scoreAwarded ?? 0) > 0
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {g.error ? 'ungraded' : `${ev?.scoreAwarded ?? 0} / ${g.question.marks}`}
                  </span>
                </button>
                {open && (
                  <div className="px-4 pb-4 space-y-3 text-xs">
                    {g.error && <p className="text-rose-300">{g.error}</p>}
                    {g.answer && (
                      <div className="text-gray-400">
                        <span className="font-semibold text-gray-300">Your answer: </span>
                        <span className="whitespace-pre-line">{g.answer}</span>
                      </div>
                    )}
                    {(ev?.criteria ?? []).map((c: any, ci: number) => (
                      <div key={ci} className="rounded-lg bg-gray-800/60 p-3">
                        <div className="flex justify-between gap-2 text-gray-300">
                          <span>{c.criterion}</span>
                          <span className="font-semibold shrink-0">
                            {c.marksAwarded}/{c.maxMarks}
                          </span>
                        </div>
                        {c.evidenceQuote && (
                          <div className="mt-1 text-gray-500 flex items-start gap-1">
                            <Quote className="w-3 h-3 mt-0.5 shrink-0 text-purple-400" />
                            <em>&ldquo;{c.evidenceQuote}&rdquo;</em>
                          </div>
                        )}
                        {c.reasoning && <div className="mt-1 text-gray-500">{c.reasoning}</div>}
                      </div>
                    ))}
                    {(ev?.missingPoints ?? []).length > 0 && (
                      <div className="text-amber-300">
                        Missing: {ev.missingPoints.join(' · ')}
                      </div>
                    )}
                    {(g.modelAnswer || g.correctAnswer) && (
                      <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-gray-300">
                        <span className="font-semibold text-green-300 flex items-center gap-1 mb-1">
                          <CheckCircle2 className="w-3 h-3" /> Model answer
                        </span>
                        <span className="whitespace-pre-line">
                          {g.modelAnswer ?? g.correctAnswer}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            setPhase('setup');
            assemble();
          }}
          className="px-6 py-2.5 bg-gray-800/60 border border-gray-700 text-gray-200 rounded-xl font-semibold hover:text-white transition-all inline-flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Take another test
        </button>
      </div>
    </div>
  );
}
