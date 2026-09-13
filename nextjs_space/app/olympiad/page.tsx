'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, ExternalLink, ChevronRight, ShieldCheck } from 'lucide-react';

interface ExamInfo {
  slug: string;
  abbrev: string;
  name: string;
  description: string;
  minClass: number;
  maxClass: number;
  practiceable: boolean;
  color: string;
}

interface SourceInfo {
  label: string;
  url: string;
  what: string;
}

export default function OlympiadPage() {
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/olympiad')
      .then((r) => r.json())
      .then((d) => {
        setExams(d?.exams ?? []);
        setSources(d?.sources ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm mb-4">
            <Trophy className="w-4 h-4" />
            Indian Talent Olympiad · indiantalent.org
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Olympiad{' '}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Preparation
            </span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            The Indian Talent Olympiad syllabus follows the school curriculum — so your chapter
            lessons and visuals here <em>are</em> the prep material. Add Olympiad-pattern MCQ
            practice (subject · logical reasoning · HOTS) and you&apos;re exam-ready.
          </p>
        </motion.div>

        {/* Class picker */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Choose your class</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={`/olympiad/${n}`}
                className="rounded-xl bg-gray-800/60 border border-gray-700 hover:border-amber-500/60 hover:bg-amber-500/10 text-center py-3 text-white font-semibold transition-all"
              >
                {n}
              </Link>
            ))}
          </div>
        </section>

        {/* Exam registry */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">The exams</h2>
          {loading ? (
            <div className="grid md:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-gray-800/60 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {exams.map((e, i) => (
                <motion.div
                  key={e.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-2xl bg-gray-800/60 border border-gray-700 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-lg bg-gradient-to-r ${e.color} text-white`}
                        >
                          {e.abbrev}
                        </span>
                        <span className="text-white font-semibold">{e.name}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">{e.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Classes {e.minClass}–{e.maxClass}
                        {!e.practiceable && ' · creative submission (no MCQ practice)'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Trusted sources */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-gray-300">Trusted preparation sources</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Official and government sources only — the same no-hallucination policy that grounds
            every lesson in this app. Full rationale in the project&apos;s TRUSTED-SOURCES
            documentation.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {sources.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-gray-800/40 border border-gray-700 hover:border-emerald-500/50 p-4 transition-colors group"
              >
                <div className="flex items-center gap-2 text-white font-medium">
                  {s.label}
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-emerald-400" />
                </div>
                <p className="text-xs text-gray-400 mt-1">{s.what}</p>
              </a>
            ))}
          </div>
        </section>

        <div className="mt-12 text-center">
          <Link
            href="/olympiad/6"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Start with Class 6 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
