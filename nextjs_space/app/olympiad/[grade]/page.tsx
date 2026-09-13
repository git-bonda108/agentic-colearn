'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Trophy,
  ChevronLeft,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Clock,
  ListChecks,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';

interface ChapterLink {
  id: string;
  number: number;
  title: string;
  textbook: string | null;
  hasLesson: boolean;
  grounded: boolean;
}
interface SyllabusSubject {
  slug: string;
  name: string;
  icon: string | null;
  color: string | null;
  chapters: ChapterLink[];
}
interface ExamDetail {
  slug: string;
  abbrev: string;
  name: string;
  description: string;
  practiceable: boolean;
  color: string;
  format: {
    totalQuestions: number;
    totalMarks: number;
    durationMinutes: number;
    sections: { key: string; label: string; questionType: string; count: number }[];
    note?: string;
  };
  syllabus: SyllabusSubject[];
}
interface SourceInfo {
  label: string;
  url: string;
  what: string;
}
interface PracticeQuestion {
  id: string;
  type: string;
  marks: number;
  difficulty: string;
  prompt: string;
  options: string[] | null;
  source: string;
}
interface Feedback {
  correct: boolean;
  comment: string;
  key?: string;
}

const SECTIONS = [
  { key: 'subject', label: 'Subject' },
  { key: 'reasoning', label: 'Logical Reasoning' },
  { key: 'hots', label: 'HOTS · Achievers' },
];

export default function OlympiadGradePage() {
  const params = useParams();
  const gradeNumber = parseInt(String(params?.grade ?? ''), 10);

  const [exams, setExams] = useState<ExamDetail[]>([]);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [section, setSection] = useState('subject');
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [practiceMsg, setPracticeMsg] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [gradingId, setGradingId] = useState<string | null>(null);

  useEffect(() => {
    if (!gradeNumber) return;
    fetch(`/api/olympiad?grade=${gradeNumber}`)
      .then((r) => r.json())
      .then((d) => {
        setExams(d?.exams ?? []);
        setSources(d?.sources ?? []);
        const firstPracticeable = (d?.exams ?? []).find((e: ExamDetail) => e.practiceable);
        if (firstPracticeable) setSelected(firstPracticeable.slug);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gradeNumber]);

  const exam = exams.find((e) => e.slug === selected) ?? null;

  const loadQuestions = useCallback(
    async (examSlug: string, sec: string) => {
      setQuestions([]);
      setAnswers({});
      setFeedback({});
      setPracticeMsg(null);
      const r = await fetch(
        `/api/olympiad/questions?grade=${gradeNumber}&exam=${examSlug}&section=${sec}`
      );
      const d = await r.json();
      if (r.ok) setQuestions(d.questions ?? []);
      else setPracticeMsg(d.error ?? 'Could not load questions');
    },
    [gradeNumber]
  );

  useEffect(() => {
    if (exam?.practiceable) loadQuestions(exam.slug, section);
  }, [exam?.slug, exam?.practiceable, section, loadQuestions]);

  const generate = async () => {
    if (!exam) return;
    setGenerating(true);
    setPracticeMsg(null);
    try {
      const r = await fetch('/api/olympiad/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade: gradeNumber, exam: exam.slug, section, count: 5 }),
      });
      const d = await r.json();
      if (r.ok) {
        setQuestions((prev) => [...(d.questions ?? []), ...prev]);
        setPracticeMsg(
          d.anchoredTo
            ? `New round from "${d.anchoredTo.chapter}" (${d.anchoredTo.subject})${
                d.anchoredTo.grounded ? ' — grounded in the official NCERT text' : ''
              }${d.verifierDropped ? ` · verifier dropped ${d.verifierDropped}` : ''}`
            : null
        );
      } else {
        setPracticeMsg(d.error ?? 'Generation failed');
      }
    } catch {
      setPracticeMsg('Generation failed — try again.');
    } finally {
      setGenerating(false);
    }
  };

  const grade = async (q: PracticeQuestion) => {
    const answer = answers[q.id];
    if (!answer) return;
    setGradingId(q.id);
    try {
      const r = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id, answer }),
      });
      const d = await r.json();
      if (r.ok) {
        const res = d.evaluation ?? {};
        const score = res.scoreAwarded ?? 0;
        const max = res.maxMarks ?? q.marks;
        const correct = score >= max;
        setFeedback((prev) => ({
          ...prev,
          [q.id]: {
            correct,
            comment:
              res.overallComment ?? (correct ? 'Correct!' : 'Not quite — review this concept.'),
            key: !correct && d.correctAnswer ? `Correct answer: ${d.correctAnswer}` : undefined,
          },
        }));
      }
    } finally {
      setGradingId(null);
    }
  };

  const answered = Object.keys(feedback).length;
  const correctCount = Object.values(feedback).filter((f) => f.correct).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <Link
          href="/olympiad"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-amber-300 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> All Olympiads
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400" />
            Class {gradeNumber}{' '}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Olympiad Prep
            </span>
          </h1>
          <p className="text-gray-400 mt-2">
            Indian Talent Olympiad pattern · the syllabus is your school syllabus, so chapter
            lessons below are the study material.
          </p>
        </motion.div>

        {loading ? (
          <div className="h-40 rounded-2xl bg-gray-800/60 animate-pulse" />
        ) : exams.length === 0 ? (
          <p className="text-gray-400">No Olympiad exams for this class.</p>
        ) : (
          <>
            {/* Exam selector */}
            <div className="flex flex-wrap gap-2 mb-8">
              {exams.map((e) => (
                <button
                  key={e.slug}
                  onClick={() => setSelected(e.slug)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                    selected === e.slug
                      ? `bg-gradient-to-r ${e.color} text-white border-transparent`
                      : 'bg-gray-800/60 text-gray-300 border-gray-700 hover:border-amber-500/50'
                  }`}
                  title={e.name}
                >
                  {e.abbrev}
                </button>
              ))}
            </div>

            {exam && (
              <div className="space-y-8">
                {/* Format */}
                <section className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                  <h2 className="text-xl font-semibold text-white">{exam.name}</h2>
                  <p className="text-sm text-gray-400 mt-1">{exam.description}</p>
                  <div className="flex flex-wrap gap-4 mt-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-gray-300">
                      <ListChecks className="w-4 h-4 text-amber-400" />
                      {exam.format.totalQuestions} MCQs · {exam.format.totalMarks} marks
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-gray-300">
                      <Clock className="w-4 h-4 text-amber-400" />
                      {exam.format.durationMinutes} minutes
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3 mt-4">
                    {exam.format.sections.map((s) => (
                      <div
                        key={s.key}
                        className="rounded-xl bg-gray-900/60 border border-gray-700 p-3 text-center"
                      >
                        <div className="text-2xl font-bold text-white">{s.count}</div>
                        <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {exam.format.note && (
                    <p className="text-xs text-gray-500 mt-3">{exam.format.note}</p>
                  )}
                </section>

                {/* Syllabus & material */}
                {exam.syllabus.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="w-5 h-5 text-purple-400" />
                      <h2 className="text-lg font-semibold text-gray-300">
                        Syllabus & study material — your NCERT chapters
                      </h2>
                    </div>
                    {exam.syllabus.map((sub) => (
                      <div key={sub.slug} className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-400 mb-2">{sub.name}</h3>
                        <div className="grid md:grid-cols-2 gap-2">
                          {sub.chapters.map((c) => (
                            <Link
                              key={c.id}
                              href={`/learn/chapter/${c.id}`}
                              className="flex items-center justify-between rounded-xl bg-gray-800/40 border border-gray-700 hover:border-purple-500/50 px-4 py-2.5 transition-colors"
                            >
                              <span className="text-sm text-gray-200">
                                {c.number}. {c.title}
                              </span>
                              <span className="flex items-center gap-1.5">
                                {c.grounded && (
                                  <span
                                    className="w-2 h-2 rounded-full bg-emerald-400"
                                    title="Grounded in the official NCERT text"
                                  />
                                )}
                                {c.hasLesson && (
                                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                )}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                )}

                {/* Practice */}
                {exam.practiceable ? (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <h2 className="text-lg font-semibold text-gray-300">
                        Olympiad-pattern practice{' '}
                        <span className="text-xs text-gray-500 font-normal">
                          (every question adversarially verified before you see it)
                        </span>
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {SECTIONS.map((s) => (
                        <button
                          key={s.key}
                          onClick={() => setSection(s.key)}
                          className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                            section === s.key
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                              : 'bg-gray-800/60 text-gray-300 border-gray-700'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                      <button
                        onClick={generate}
                        disabled={generating}
                        className="ml-auto inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold disabled:opacity-50"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Generating…
                          </>
                        ) : (
                          <>New practice round</>
                        )}
                      </button>
                    </div>
                    {practiceMsg && <p className="text-xs text-gray-500 mb-3">{practiceMsg}</p>}
                    {answered > 0 && (
                      <p className="text-sm text-gray-300 mb-3">
                        Score this session:{' '}
                        <span className="font-semibold text-white">
                          {correctCount}/{answered}
                        </span>
                      </p>
                    )}
                    {questions.length === 0 && !generating ? (
                      <p className="text-sm text-gray-500">
                        No questions yet — hit &quot;New practice round&quot; to generate an
                        Olympiad-pattern set.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {questions.map((q, qi) => {
                          const fb = feedback[q.id];
                          return (
                            <div
                              key={q.id}
                              className="rounded-2xl bg-gray-800/60 border border-gray-700 p-5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-gray-100 whitespace-pre-wrap">
                                  <span className="text-gray-500 mr-2">Q{qi + 1}.</span>
                                  {q.prompt}
                                </p>
                                <span className="text-[11px] text-gray-500 shrink-0">
                                  {q.difficulty}
                                </span>
                              </div>
                              {Array.isArray(q.options) && (
                                <div className="grid sm:grid-cols-2 gap-2 mt-4">
                                  {q.options.map((opt, i) => (
                                    <button
                                      key={i}
                                      disabled={Boolean(fb)}
                                      onClick={() =>
                                        setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                                      }
                                      className={`text-left text-sm rounded-xl border px-3 py-2 transition-all ${
                                        answers[q.id] === opt
                                          ? 'bg-purple-500/20 border-purple-500/60 text-white'
                                          : 'bg-gray-900/50 border-gray-700 text-gray-300 hover:border-purple-500/40'
                                      } ${fb ? 'opacity-70' : ''}`}
                                    >
                                      <span className="text-gray-500 mr-2">
                                        {String.fromCharCode(65 + i)}.
                                      </span>
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {!fb ? (
                                <button
                                  onClick={() => grade(q)}
                                  disabled={!answers[q.id] || gradingId === q.id}
                                  className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-sm font-medium disabled:opacity-40"
                                >
                                  {gradingId === q.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : null}
                                  Check answer
                                </button>
                              ) : (
                                <div
                                  className={`mt-4 rounded-xl border p-3 text-sm ${
                                    fb.correct
                                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                                      : 'bg-red-500/10 border-red-500/40 text-red-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 font-medium">
                                    {fb.correct ? (
                                      <CheckCircle2 className="w-4 h-4" />
                                    ) : (
                                      <XCircle className="w-4 h-4" />
                                    )}
                                    {fb.correct ? 'Correct!' : 'Not quite'}
                                  </div>
                                  <p className="mt-1 text-gray-300">{fb.comment}</p>
                                  {!fb.correct && fb.key && (
                                    <p className="mt-1 text-gray-400">{fb.key}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ) : (
                  <p className="text-sm text-gray-500">
                    {exam.abbrev} is a creative-submission exam (no MCQs) — see the official
                    sources below for participation details.
                  </p>
                )}

                {/* Sources */}
                <section>
                  <h2 className="text-lg font-semibold text-gray-300 mb-3">Official sources</h2>
                  <div className="grid md:grid-cols-2 gap-2">
                    {sources.slice(0, 6).map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-xl bg-gray-800/40 border border-gray-700 hover:border-emerald-500/50 px-4 py-2.5 text-sm text-gray-300 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                        {s.label}
                      </a>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
