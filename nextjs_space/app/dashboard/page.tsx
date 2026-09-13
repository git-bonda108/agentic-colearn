'use client';

/**
 * Dashboard — the student's real learning state, from the BKT knowledge
 * model and persisted attempts (replaces the legacy chat-session dashboard).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Target,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const LEVEL_STYLE: Record<string, string> = {
  mastered: 'bg-green-500/20 text-green-300',
  developing: 'bg-amber-500/20 text-amber-300',
  needs_work: 'bg-rose-500/20 text-rose-300',
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [queue, setQueue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then((r) => r.json()),
      fetch('/api/review/queue').then((r) => r.json()),
    ])
      .then(([d, q]) => {
        setData(d);
        setQueue(q);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pct =
    data?.totals?.marksPossible > 0
      ? Math.round((data.totals.marksEarned / data.totals.marksPossible) * 100)
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            {data?.student?.name ? `${data.student.name}'s Dashboard` : 'Dashboard'}
          </h1>
          <p className="text-gray-400 mt-1">
            Your knowledge model, tracked by the Diagnostic Agent across every answer.
          </p>
        </motion.div>

        {loading && (
          <div className="grid md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-gray-800/60 animate-pulse" />
            ))}
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            {/* stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Questions answered', value: data.totals.attempts, sub: `${data.totals.weekAttempts} this week` },
                { label: 'Overall score', value: pct === null ? '—' : `${pct}%`, sub: `${data.totals.marksEarned}/${data.totals.marksPossible} marks` },
                { label: 'Topics mastered', value: data.totals.mastered, sub: `of ${data.totals.conceptsTracked} tracked` },
                { label: 'Needs work', value: data.totals.needsWork, sub: 'below 60% understanding' },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl bg-gray-800/60 border border-gray-700 p-5">
                  <div className="text-3xl font-bold text-white">{s.value}</div>
                  <div className="text-sm text-gray-300 mt-1">{s.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* today's review + quick links */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 p-6">
                <h2 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" /> Today&apos;s review
                </h2>
                <p className="text-sm text-gray-300 mb-4">
                  {queue?.summary ?? 'Loading review queue…'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(queue?.concepts ?? []).slice(0, 3).map((c: any) => (
                    <Link
                      key={c.conceptKey}
                      href={`/learn/chapter/${c.chapter.id}`}
                      className="text-xs px-3 py-1.5 rounded-full bg-gray-800/80 border border-gray-600 text-gray-200 hover:border-purple-500/60 transition-colors"
                    >
                      {c.chapter.subject} Ch {c.chapter.number}
                    </Link>
                  ))}
                  {(queue?.flashcards?.total ?? 0) > 0 && (
                    <Link
                      href="/flashcards"
                      className="text-xs px-3 py-1.5 rounded-full bg-gray-800/80 border border-gray-600 text-gray-200 hover:border-purple-500/60 transition-colors"
                    >
                      {queue.flashcards.total} flashcards due
                    </Link>
                  )}
                </div>
              </div>
              <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" /> Continue learning
                </h2>
                <div className="space-y-2">
                  <Link href="/learn" className="flex items-center justify-between text-sm text-gray-200 hover:text-purple-300 transition-colors">
                    Browse Grades 1–12 <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/knowledge-graph" className="flex items-center justify-between text-sm text-gray-200 hover:text-purple-300 transition-colors">
                    See your knowledge map <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/parent" className="flex items-center justify-between text-sm text-gray-200 hover:text-purple-300 transition-colors">
                    Parent weekly report <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/profiles" className="flex items-center justify-between text-sm text-gray-200 hover:text-purple-300 transition-colors">
                    Switch child profile <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* chapter mastery */}
            {data.chapters.length > 0 && (
              <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" /> Chapter mastery
                </h2>
                <div className="space-y-3">
                  {data.chapters.map((c: any) => (
                    <Link key={c.chapterId} href={`/learn/chapter/${c.chapterId}`} className="block">
                      <div className="rounded-xl bg-gray-700/40 hover:bg-gray-700/60 transition-colors p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <span className="text-sm text-white">
                              G{c.grade} {c.subject} · {c.chapter}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {c.attempts} attempt{c.attempts === 1 ? '' : 's'}
                            </span>
                          </div>
                          <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_STYLE[c.level]}`}>
                            {Math.round(c.pKnown * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              c.pKnown >= 0.95 ? 'bg-green-500' : c.pKnown >= 0.6 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.round(c.pKnown * 100)}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* recent attempts */}
            {data.recentAttempts.length > 0 && (
              <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" /> Recent answers
                </h2>
                <div className="space-y-2">
                  {data.recentAttempts.map((a: any) => (
                    <Link key={a.id} href={`/learn/chapter/${a.chapterId}`} className="block">
                      <div className="flex items-center justify-between rounded-xl bg-gray-700/40 hover:bg-gray-700/60 transition-colors px-4 py-2.5 text-xs">
                        <div className="min-w-0 mr-3">
                          <span className="text-gray-300 truncate block">{a.promptPreview}…</span>
                          <span className="text-gray-500">{a.where}</span>
                        </div>
                        <span
                          className={`shrink-0 font-semibold ${
                            a.score / a.maxMarks >= 0.8 ? 'text-green-400' : a.score > 0 ? 'text-amber-400' : 'text-rose-400'
                          }`}
                        >
                          {a.score}/{a.maxMarks}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* system trust panel */}
            <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-4 text-xs text-purple-200 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {data.system.groundedChapters} chapter{data.system.groundedChapters === 1 ? '' : 's'} grounded in
                official NCERT text
                {data.system.agentEvents?.lesson_verified
                  ? ` · ${data.system.agentEvents.lesson_verified} lesson verification${data.system.agentEvents.lesson_verified === 1 ? '' : 's'}`
                  : ''}
                {data.system.agentEvents?.question_dropped
                  ? ` · ${data.system.agentEvents.question_dropped} question${data.system.agentEvents.question_dropped === 1 ? '' : 's'} rejected by the verifier`
                  : ''}
                {data.system.agentEvents?.diagnostic_prior_set
                  ? ` · ${data.system.agentEvents.diagnostic_prior_set} diagnostic${data.system.agentEvents.diagnostic_prior_set === 1 ? '' : 's'} taken`
                  : ''}
                . Every number on this page comes from recorded answers.
              </span>
            </div>

            {data.chapters.length === 0 && data.recentAttempts.length === 0 && (
              <div className="text-center py-12 rounded-2xl bg-gray-800/40 border border-gray-700">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                <p className="text-gray-300 text-sm mb-4">
                  No practice recorded yet — pick a chapter and take its Diagnostic Check.
                </p>
                <Link
                  href="/learn"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> Start learning
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
