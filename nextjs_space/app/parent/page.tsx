'use client';

/**
 * Parent view — a plain-language weekly report. Every number renders straight
 * from the deterministic /api/parent/report; nothing on this page is
 * AI-generated, and the page says so.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ParentPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/parent/report')
      .then((r) => r.json())
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white">This Week&apos;s Report</h1>
          {report?.student && (
            <p className="text-gray-400 mt-1">
              {report.student.name}
              {report.student.grade ? ` · Grade ${report.student.grade}` : ''} ·{' '}
              {report.period?.from} to {report.period?.to}
            </p>
          )}
        </motion.div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-800/60 animate-pulse" />
            ))}
          </div>
        )}

        {report && !loading && (
          <div className="space-y-6">
            {/* headlines */}
            <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-purple-400" /> In plain words
              </h2>
              <ul className="space-y-3">
                {(report.headlines ?? []).map((h: string, i: number) => (
                  <li key={i} className="text-gray-200 text-sm leading-relaxed flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span> {h}
                  </li>
                ))}
              </ul>
            </div>

            {/* week stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Days practised', value: report.week?.activeDays ?? 0 },
                { label: 'Questions answered', value: report.week?.questionsAttempted ?? 0 },
                {
                  label: 'Marks earned',
                  value: `${report.week?.marksEarned ?? 0} / ${report.week?.marksPossible ?? 0}`,
                },
                {
                  label: 'Topics mastered',
                  value: report.understanding?.mastered ?? 0,
                },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl bg-gray-800/60 border border-gray-700 p-4 text-center">
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* per-chapter table */}
            {(report.week?.chapters ?? []).length > 0 && (
              <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" /> What was practised
                </h2>
                <div className="space-y-3">
                  {report.week.chapters.map((c: any, i: number) => (
                    <div key={i} className="rounded-xl bg-gray-700/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm text-white truncate">
                            {c.subject} · {c.chapter}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {c.questionsAttempted} question{c.questionsAttempted === 1 ? '' : 's'} ·{' '}
                            {c.score}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            c.percentage >= 70
                              ? 'bg-green-500/20 text-green-300'
                              : c.percentage >= 40
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {c.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* understanding bands */}
            <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
              <h2 className="text-white font-semibold mb-4">Understanding across topics</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-4">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-white">{report.understanding?.mastered ?? 0}</div>
                  <div className="text-xs text-gray-400">Mastered</div>
                </div>
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
                  <TrendingUp className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-white">{report.understanding?.developing ?? 0}</div>
                  <div className="text-xs text-gray-400">Developing</div>
                </div>
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4">
                  <AlertTriangle className="w-5 h-5 text-rose-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-white">{report.understanding?.needsWork ?? 0}</div>
                  <div className="text-xs text-gray-400">Needs work</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">{report.understanding?.note}</p>
            </div>

            {/* trust note */}
            <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-4 text-xs text-purple-200 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              {report.dataNote}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
