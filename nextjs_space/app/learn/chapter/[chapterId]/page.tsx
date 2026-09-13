'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  ChevronLeft,
  BookOpen,
  PenLine,
  BarChart3,
  Sparkles,
  Loader2,
  Target,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Quote,
  FileText,
} from 'lucide-react';

import ChapterTest from '@/components/chapter-test';
import AskDoubt from '@/components/ask-doubt';
import MermaidDiagram from '@/components/mermaid-diagram';

type Tab = 'learn' | 'practice' | 'test' | 'ask' | 'progress';

const TYPE_META: Record<string, { label: string; marks: number; objective: boolean }> = {
  mcq: { label: 'MCQ', marks: 1, objective: true },
  assertion_reason: { label: 'Assertion–Reason', marks: 1, objective: true },
  vsa_2: { label: '2 Marks', marks: 2, objective: false },
  sa_3: { label: '3 Marks', marks: 3, objective: false },
  la_5: { label: '5 Marks', marks: 5, objective: false },
  la_7: { label: '7 Marks', marks: 7, objective: false },
  case_study: { label: 'Case Study (4)', marks: 4, objective: false },
};
const TYPE_ORDER = ['mcq', 'assertion_reason', 'vsa_2', 'sa_3', 'la_5', 'la_7', 'case_study'];

interface PracticeQuestion {
  id: string;
  type: string;
  marks: number;
  difficulty: string;
  prompt: string;
  options?: string[] | null;
  outcome?: { code: string; description: string } | null;
}

export default function ChapterPage() {
  const params = useParams<{ chapterId: string }>();
  const chapterId = params?.chapterId;

  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('learn');
  const [testMode, setTestMode] = useState<'test' | 'diagnostic'>('test');

  // Learn tab
  const [lesson, setLesson] = useState<any>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [lessonLang, setLessonLang] = useState<'en' | 'hi' | 'te'>('en');

  // Practice tab
  const [qType, setQType] = useState<string>('mcq');
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  const loadChapter = useCallback(() => {
    if (!chapterId) return;
    fetch(`/api/curriculum/chapter/${chapterId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d?.chapter?.lesson) setLesson(d.chapter.lesson);
        const pref = d?.chapter?.preferredLanguage;
        if (pref === 'hi' || pref === 'te') setLessonLang(pref);
      })
      .catch(() => {});
  }, [chapterId]);

  useEffect(loadChapter, [loadChapter]);

  const loadQuestions = useCallback(
    (type: string) => {
      if (!chapterId) return;
      fetch(`/api/questions?chapterId=${chapterId}&type=${type}`)
        .then((r) => r.json())
        .then((d) => {
          setQuestions(d?.questions ?? []);
          setQIndex(0);
          setFeedback(null);
          setAnswer('');
          setSelectedOption(null);
          setPracticeError(null);
        })
        .catch(() => {});
    },
    [chapterId]
  );

  useEffect(() => {
    if (tab === 'practice') loadQuestions(qType);
  }, [tab, qType, loadQuestions]);

  const generateLesson = async (refresh = false, language: 'en' | 'hi' | 'te' = lessonLang) => {
    setLessonLoading(true);
    setLessonError(null);
    try {
      const res = await fetch('/api/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId, refresh, language }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Failed');
      setLesson(d.lesson);
    } catch (e: any) {
      setLessonError(e?.message ?? 'Failed to generate lesson');
    } finally {
      setLessonLoading(false);
    }
  };

  const generateQuestions = async () => {
    setGenerating(true);
    setPracticeError(null);
    try {
      const res = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId, type: qType, count: 3 }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Failed');
      loadQuestions(qType);
    } catch (e: any) {
      setPracticeError(e?.message ?? 'Failed to generate questions');
    } finally {
      setGenerating(false);
    }
  };

  const currentQuestion = questions[qIndex] ?? null;
  const isObjective = currentQuestion ? TYPE_META[currentQuestion.type]?.objective : false;

  const submitAnswer = async () => {
    if (!currentQuestion) return;
    const finalAnswer = isObjective ? (selectedOption ?? '') : answer;
    if (!finalAnswer.trim()) return;
    setSubmitting(true);
    setPracticeError(null);
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: currentQuestion.id, answer: finalAnswer }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Evaluation failed');
      setFeedback(d);
      loadChapter(); // refresh mastery numbers
    } catch (e: any) {
      setPracticeError(e?.message ?? 'Evaluation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = () => {
    setFeedback(null);
    setAnswer('');
    setSelectedOption(null);
    setQIndex((i) => (i + 1) % Math.max(questions.length, 1));
  };

  const chapter = data?.chapter;
  const grade = data?.grade;
  const subject = data?.subject;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <Link
          href={grade && subject ? `/learn/${grade.number}/${subject.slug}` : '/learn'}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-purple-300 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> {subject?.name ?? 'Back'} chapters
        </Link>

        {chapter && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="text-xs text-purple-300 mb-1">
              {grade?.displayName} · {subject?.name}
              {chapter.textbook ? ` · ${chapter.textbook}` : ''}
            </div>
            <h1 className="text-3xl font-bold text-white">
              Chapter {chapter.number}: {chapter.title}
            </h1>
            {chapter.summary && <p className="text-gray-400 mt-2">{chapter.summary}</p>}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {(
            [
              { id: 'learn', label: 'Learn', icon: BookOpen },
              { id: 'practice', label: 'Practice', icon: PenLine },
              { id: 'test', label: 'Mock Test', icon: FileText },
              { id: 'ask', label: 'Ask', icon: Lightbulb },
              { id: 'progress', label: 'My Progress', icon: BarChart3 },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                if (id === 'test') setTestMode('test');
                setTab(id);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-gray-800/60 text-gray-400 border border-gray-700 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── LEARN ─────────────────────────────────────────── */}
        {tab === 'learn' && (
          <div>
            {/* Content language: English + official NCERT Hindi/Telugu editions */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs text-gray-500">Language:</span>
              {(
                [
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'हिन्दी' },
                  { code: 'te', label: 'తెలుగు' },
                ] as const
              ).map((l) => (
                <button
                  key={l.code}
                  disabled={lessonLoading}
                  onClick={() => {
                    if (l.code !== lessonLang) {
                      setLessonLang(l.code);
                      generateLesson(false, l.code);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs border transition-all ${
                    lessonLang === l.code
                      ? 'bg-purple-500/20 text-purple-200 border-purple-500/60'
                      : 'bg-gray-800/60 text-gray-400 border-gray-700 hover:border-purple-500/40'
                  }`}
                >
                  {l.label}
                </button>
              ))}
              {lesson?.grounding?.language &&
                lesson.grounding.language !== 'en' &&
                lesson.grounding.sourceLanguage === 'en' && (
                  <span className="text-[11px] text-amber-400/80">
                    faithfully translated from the English NCERT edition (native edition not
                    ingested yet)
                  </span>
                )}
            </div>
            {!lesson && !lessonLoading && (
              <div className="text-center py-16 rounded-2xl bg-gray-800/40 border border-gray-700">
                <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">
                  Generate this chapter&apos;s lesson
                </h3>
                <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                  The Content Agent writes a grade-appropriate lesson grounded in the NCERT
                  chapter and its learning outcomes.
                </p>
                {lessonError && (
                  <p className="text-rose-400 text-sm mb-4 max-w-md mx-auto">{lessonError}</p>
                )}
                <button
                  onClick={() => generateLesson()}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all"
                >
                  Generate Lesson
                </button>
              </div>
            )}
            {lessonLoading && (
              <div className="text-center py-16 rounded-2xl bg-gray-800/40 border border-gray-700">
                <Loader2 className="w-8 h-8 text-purple-400 mx-auto animate-spin mb-3" />
                <p className="text-gray-400 text-sm">Writing your lesson…</p>
              </div>
            )}
            {lesson && !lessonLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* grounding badge */}
                {lesson.grounding?.grounded ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/40 text-green-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Grounded in the official NCERT chapter text
                      {(lesson.grounding.citedPages?.length ?? 0) > 0 &&
                        ` · pages ${lesson.grounding.citedPages[0]}–${
                          lesson.grounding.citedPages[lesson.grounding.citedPages.length - 1]
                        }`}
                    </span>
                    {lesson.grounding.sourceUrl && (
                      <a
                        href={lesson.grounding.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-500 hover:text-purple-300 transition-colors"
                      >
                        View source PDF
                      </a>
                    )}
                    {lesson.verification?.verdict === 'pass' && (
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/40 text-purple-300"
                        title={`Independently fact-checked by ${lesson.verification.checkedBy}`}
                      >
                        Adversarially verified
                      </span>
                    )}
                    {lesson.verification?.verdict === 'flag' && (
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-300"
                        title={(lesson.verification.issues ?? [])
                          .map((i: any) => `${i.claim}: ${i.problem}`)
                          .join('\n')}
                      >
                        Verified with {lesson.verification.issues.length} minor note
                        {lesson.verification.issues.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Generated from model knowledge — official chapter text not ingested yet
                    </span>
                  </div>
                )}
                <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{lesson.introduction ?? ''}</ReactMarkdown>
                  </div>
                </div>
                {(lesson.sections ?? []).map((s: any, i: number) => (
                  <div key={i} className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                    <h3 className="text-white font-semibold text-lg mb-3">{s.heading}</h3>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{s.content ?? ''}</ReactMarkdown>
                    </div>
                    {s.example && (
                      <div className="mt-4 rounded-xl bg-purple-500/10 border border-purple-500/30 p-4 text-sm text-purple-200">
                        <span className="font-semibold">Example: </span>
                        {s.example}
                      </div>
                    )}
                    {(s.sourceChunks?.length ?? 0) > 0 && (
                      <div className="mt-3 text-[11px] text-gray-500">
                        Source: NCERT excerpt{s.sourceChunks.length === 1 ? '' : 's'}{' '}
                        {s.sourceChunks.map((n: number) => `[${n}]`).join(' ')}
                      </div>
                    )}
                  </div>
                ))}
                {(lesson.diagrams?.length ?? 0) > 0 && (
                  <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                    <h3 className="text-white font-semibold text-lg mb-1">See It Visually</h3>
                    <p className="text-xs text-gray-500 mb-5">
                      Drawn from this chapter&apos;s own concepts — read each one top to bottom.
                    </p>
                    <div className="space-y-6">
                      {lesson.diagrams.map((d: any, i: number) => (
                        <div key={i}>
                          <div className="text-purple-300 font-medium text-sm mb-1">{d.title}</div>
                          {d.description && (
                            <p className="text-xs text-gray-400 mb-3">{d.description}</p>
                          )}
                          <div className="rounded-xl bg-gray-900/60 border border-gray-700 p-4">
                            <MermaidDiagram code={d.mermaid} />
                          </div>
                          {(d.sourceChunks?.length ?? 0) > 0 && (
                            <div className="mt-2 text-[11px] text-gray-500">
                              Source: NCERT excerpt{d.sourceChunks.length === 1 ? '' : 's'}{' '}
                              {d.sourceChunks.map((n: number) => `[${n}]`).join(' ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(lesson.keyTerms?.length ?? 0) > 0 && (
                  <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                    <h3 className="text-white font-semibold text-lg mb-4">Key Terms</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {lesson.keyTerms.map((t: any, i: number) => (
                        <div key={i} className="rounded-xl bg-gray-700/40 p-3">
                          <div className="text-purple-300 font-medium text-sm">{t.term}</div>
                          <div className="text-gray-300 text-xs mt-1">{t.definition}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {lesson.realWorldConnection && (
                  <div className="rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 p-6">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-400" /> In the Real World
                    </h3>
                    <p className="text-gray-300 text-sm">{lesson.realWorldConnection}</p>
                  </div>
                )}
                {(lesson.summaryPoints?.length ?? 0) > 0 && (
                  <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                    <h3 className="text-white font-semibold text-lg mb-3">Summary</h3>
                    <ul className="space-y-2">
                      {lesson.summaryPoints.map((p: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  {lesson.generatedBy && <span>Generated by {lesson.generatedBy}</span>}
                  <button
                    onClick={() => generateLesson(true)}
                    className="flex items-center gap-1 hover:text-purple-300 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ── PRACTICE ──────────────────────────────────────── */}
        {tab === 'practice' && (
          <div>
            {/* question-type chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {TYPE_ORDER.map((t) => {
                const meta = TYPE_META[t];
                const count = data?.questionsByType?.[t] ?? 0;
                return (
                  <button
                    key={t}
                    onClick={() => setQType(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      qType === t
                        ? 'bg-purple-500/20 border-purple-500/60 text-purple-200'
                        : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {meta.label}
                    <span className="ml-1.5 opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>

            {practiceError && (
              <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-300">
                {practiceError}
              </div>
            )}

            {!currentQuestion ? (
              <div className="text-center py-16 rounded-2xl bg-gray-800/40 border border-gray-700">
                <PenLine className="w-10 h-10 text-purple-400 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">
                  No {TYPE_META[qType]?.label} questions yet
                </h3>
                <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                  The Question Generator Agent creates CBSE-pattern questions grounded in this
                  chapter&apos;s learning outcomes.
                </p>
                <button
                  onClick={generateQuestions}
                  disabled={generating}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {generating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {generating ? 'Generating…' : 'Generate Questions'}
                </button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.id + (feedback ? '-fb' : '')}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  {/* question card */}
                  <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/40 text-purple-300">
                          {TYPE_META[currentQuestion.type]?.label} · {currentQuestion.marks}{' '}
                          {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                        </span>
                        <span className="text-gray-500 capitalize">{currentQuestion.difficulty}</span>
                      </div>
                      <span className="text-gray-500">
                        Question {qIndex + 1} of {questions.length}
                      </span>
                    </div>
                    <div className="text-white whitespace-pre-line leading-relaxed">
                      {currentQuestion.prompt}
                    </div>
                    {currentQuestion.outcome && (
                      <div className="mt-3 text-[11px] text-gray-500 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Tests {currentQuestion.outcome.code}: {currentQuestion.outcome.description}
                      </div>
                    )}
                  </div>

                  {/* answer input */}
                  {!feedback && (
                    <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                      {isObjective && currentQuestion.options ? (
                        <div className="space-y-2">
                          {currentQuestion.options.map((opt, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedOption(opt)}
                              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                                selectedOption === opt
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
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          rows={currentQuestion.marks >= 5 ? 10 : currentQuestion.marks >= 3 ? 7 : 4}
                          placeholder={`Write your ${currentQuestion.marks}-mark answer here — the AI examiner grades it point by point, just like a CBSE marking scheme…`}
                          className="w-full rounded-xl bg-gray-700/40 border border-gray-600 focus:border-purple-500/60 focus:outline-none p-4 text-sm text-white placeholder-gray-500 resize-y"
                        />
                      )}
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={submitAnswer}
                          disabled={submitting || (isObjective ? !selectedOption : !answer.trim())}
                          className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all disabled:opacity-40 inline-flex items-center gap-2"
                        >
                          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                          {submitting ? 'Examiner grading…' : 'Submit Answer'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* feedback */}
                  {feedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      {/* score banner */}
                      <div
                        className={`rounded-2xl border p-6 ${
                          feedback.evaluation.percentage >= 80
                            ? 'bg-green-500/10 border-green-500/40'
                            : feedback.evaluation.percentage >= 40
                              ? 'bg-amber-500/10 border-amber-500/40'
                              : 'bg-rose-500/10 border-rose-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-3xl font-bold text-white">
                              {feedback.evaluation.scoreAwarded} / {feedback.evaluation.maxMarks}
                            </div>
                            <div className="text-sm text-gray-300 mt-1">
                              {feedback.evaluation.overallComment}
                            </div>
                          </div>
                          <div className="text-right text-xs text-gray-400">
                            <div>{feedback.evaluation.percentage}%</div>
                            {feedback.evaluation.evaluator !== 'auto' && (
                              <div className="mt-1">Graded by {feedback.evaluation.evaluator}</div>
                            )}
                          </div>
                        </div>
                        {/* mastery deltas */}
                        {(feedback.mastery ?? []).length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                            {feedback.mastery.map((m: any) => (
                              <div key={m.conceptKey} className="flex items-center gap-3 text-xs">
                                <span className="text-gray-400 w-40 truncate">{m.conceptKey}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-gray-700 overflow-hidden">
                                  <motion.div
                                    initial={{ width: `${Math.round(m.before * 100)}%` }}
                                    animate={{ width: `${Math.round(m.after * 100)}%` }}
                                    transition={{ duration: 0.8 }}
                                    className={`h-full rounded-full ${
                                      m.after >= 0.95
                                        ? 'bg-green-500'
                                        : m.after >= 0.6
                                          ? 'bg-amber-500'
                                          : 'bg-rose-500'
                                    }`}
                                  />
                                </div>
                                <span className="text-gray-300 w-24 text-right">
                                  {Math.round(m.before * 100)}% → {Math.round(m.after * 100)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* rubric breakdown */}
                      {(feedback.evaluation.criteria ?? []).length > 0 && (
                        <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                          <h4 className="text-white font-semibold mb-4">Marking Scheme Breakdown</h4>
                          <div className="space-y-3">
                            {feedback.evaluation.criteria.map((c: any, i: number) => (
                              <div key={i} className="rounded-xl bg-gray-700/40 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="text-sm text-gray-200">{c.criterion}</div>
                                  <span
                                    className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                      c.marksAwarded >= c.maxMarks
                                        ? 'bg-green-500/20 text-green-300'
                                        : c.marksAwarded > 0
                                          ? 'bg-amber-500/20 text-amber-300'
                                          : 'bg-rose-500/20 text-rose-300'
                                    }`}
                                  >
                                    {c.marksAwarded} / {c.maxMarks}
                                  </span>
                                </div>
                                {c.evidenceQuote && (
                                  <div className="mt-2 text-xs text-gray-400 flex items-start gap-1.5">
                                    <Quote className="w-3 h-3 mt-0.5 shrink-0 text-purple-400" />
                                    <span className="italic">&ldquo;{c.evidenceQuote}&rdquo;</span>
                                    {c.verified === false && c.marksAwarded > 0 && (
                                      <span
                                        className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300"
                                        title="The examiner paraphrased — this quote was not found verbatim in your answer."
                                      >
                                        paraphrased
                                      </span>
                                    )}
                                  </div>
                                )}
                                {c.reasoning && (
                                  <div className="mt-1.5 text-xs text-gray-400">{c.reasoning}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* missing / misconceptions / suggestions */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {(feedback.evaluation.missingPoints ?? []).length > 0 && (
                          <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-5">
                            <h5 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
                              <XCircle className="w-4 h-4" /> What was missing
                            </h5>
                            <ul className="space-y-1.5 text-xs text-gray-300">
                              {feedback.evaluation.missingPoints.map((p: string, i: number) => (
                                <li key={i}>• {p}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(feedback.evaluation.misconceptions ?? []).length > 0 && (
                          <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-5">
                            <h5 className="text-sm font-semibold text-rose-300 mb-3 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" /> Misconceptions to fix
                            </h5>
                            <ul className="space-y-1.5 text-xs text-gray-300">
                              {feedback.evaluation.misconceptions.map((p: string, i: number) => (
                                <li key={i}>• {p}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {(feedback.evaluation.improvementSuggestions ?? []).length > 0 && (
                        <div className="rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 p-5">
                          <h5 className="text-sm font-semibold text-purple-200 mb-3 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-400" /> How to improve
                          </h5>
                          <ul className="space-y-1.5 text-xs text-gray-300">
                            {feedback.evaluation.improvementSuggestions.map(
                              (p: string, i: number) => (
                                <li key={i}>• {p}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {/* model answer */}
                      {(feedback.modelAnswer || feedback.correctAnswer) && (
                        <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" /> Model Answer
                          </h4>
                          <p className="text-sm text-gray-300 whitespace-pre-line">
                            {feedback.modelAnswer ?? feedback.correctAnswer}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <button
                          onClick={generateQuestions}
                          disabled={generating}
                          className="text-xs text-gray-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {generating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          Generate more questions
                        </button>
                        <button
                          onClick={nextQuestion}
                          className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all inline-flex items-center gap-2"
                        >
                          Next Question <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}

        {/* ── MOCK TEST / DIAGNOSTIC ────────────────────────── */}
        {tab === 'test' && chapterId && (
          <ChapterTest
            key={testMode}
            chapterId={chapterId}
            mode={testMode}
            onMasteryChanged={loadChapter}
          />
        )}

        {/* ── ASK A DOUBT ───────────────────────────────────── */}
        {tab === 'ask' && chapterId && <AskDoubt chapterId={chapterId} />}

        {/* ── PROGRESS ──────────────────────────────────────── */}
        {tab === 'progress' && (
          <div className="space-y-6">
            {data?.chapterMastery && (
              <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                <h3 className="text-white font-semibold mb-1">Chapter Mastery</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Estimated by Bayesian Knowledge Tracing from your {data.chapterMastery.attempts}{' '}
                  attempt{data.chapterMastery.attempts === 1 ? '' : 's'}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-3 rounded-full bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        data.chapterMastery.pKnown >= 0.95
                          ? 'bg-green-500'
                          : data.chapterMastery.pKnown >= 0.6
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.round(data.chapterMastery.pKnown * 100)}%` }}
                    />
                  </div>
                  <span className="text-white font-bold">
                    {Math.round(data.chapterMastery.pKnown * 100)}%
                  </span>
                </div>
              </div>
            )}

            {(data?.outcomes ?? []).length > 0 && (
              <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" /> Learning Outcomes
                </h3>
                <div className="space-y-4">
                  {data.outcomes.map((o: any) => (
                    <div key={o.conceptKey}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-gray-300">
                          <span className="text-purple-300 font-medium">{o.code}</span> —{' '}
                          {o.description}
                        </span>
                        <span className="text-xs text-gray-500 shrink-0 ml-3">
                          {o.pKnown === null ? 'Not attempted' : `${Math.round(o.pKnown * 100)}%`}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (o.pKnown ?? 0) >= 0.95
                              ? 'bg-green-500'
                              : (o.pKnown ?? 0) >= 0.6
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.round((o.pKnown ?? 0) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(data?.recommendations ?? []).length > 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 p-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> The Diagnostic Agent recommends
                </h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  {data.recommendations.map((r: any) => (
                    <li key={r.conceptKey} className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                      <span>
                        {r.code ? `${r.code}: ` : ''}
                        {r.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(data?.recentAttempts ?? []).length > 0 && (
              <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                <h3 className="text-white font-semibold mb-4">Recent Attempts</h3>
                <div className="space-y-2">
                  {data.recentAttempts.slice(0, 10).map((a: any) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-xl bg-gray-700/40 px-4 py-2.5 text-xs"
                    >
                      <span className="text-gray-300 truncate mr-3">{a.promptPreview}…</span>
                      <span
                        className={`shrink-0 font-semibold ${
                          a.scoreAwarded / a.maxMarks >= 0.8
                            ? 'text-green-400'
                            : a.scoreAwarded / a.maxMarks >= 0.4
                              ? 'text-amber-400'
                              : 'text-rose-400'
                        }`}
                      >
                        {a.scoreAwarded}/{a.maxMarks}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!data?.chapterMastery && (data?.recentAttempts ?? []).length === 0 && (
              <div className="text-center py-16 rounded-2xl bg-gray-800/40 border border-gray-700">
                <BarChart3 className="w-10 h-10 text-purple-400 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">No attempts yet</h3>
                <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                  Take a 5-question diagnostic so the Diagnostic Agent can find your starting
                  level — or head to Practice and it will learn as you go.
                </p>
                <button
                  onClick={() => {
                    setTestMode('diagnostic');
                    setTab('test');
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all"
                >
                  Take the Diagnostic Check
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
