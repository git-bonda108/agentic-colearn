'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, ChevronRight, Sparkles } from 'lucide-react';

interface GradeInfo {
  number: number;
  stage: string;
  displayName: string;
  subjectCount: number;
  chapterCount: number;
}

const STAGE_META: Record<string, { label: string; blurb: string; color: string }> = {
  foundational: {
    label: 'Foundational Stage',
    blurb: 'Play-based learning for the youngest minds',
    color: 'from-pink-500 to-rose-500',
  },
  preparatory: {
    label: 'Preparatory Stage',
    blurb: 'Discovery and activity-based learning',
    color: 'from-orange-500 to-amber-500',
  },
  middle: {
    label: 'Middle Stage',
    blurb: 'Subjects come alive — Science, Maths & more',
    color: 'from-green-500 to-teal-500',
  },
  secondary: {
    label: 'Secondary Stage',
    blurb: 'Board-exam foundation with competency focus',
    color: 'from-blue-500 to-indigo-500',
  },
  senior_secondary: {
    label: 'Senior Secondary',
    blurb: 'Streams, depth, and college preparation',
    color: 'from-purple-500 to-fuchsia-500',
  },
};

const STAGE_ORDER = ['foundational', 'preparatory', 'middle', 'secondary', 'senior_secondary'];

export default function LearnPage() {
  const [grades, setGrades] = useState<GradeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/curriculum')
      .then((r) => r.json())
      .then((data) => setGrades(data?.grades ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    meta: STAGE_META[stage],
    grades: grades.filter((g) => g.stage === stage),
  })).filter((s) => s.grades.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            CBSE · NCERT-aligned · NCF-SE 2023
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Choose Your{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Class
            </span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Every grade from 1 to 12, mapped to the official CBSE curriculum and NCERT
            textbooks — with adaptive practice that learns how you learn.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-gray-800/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {byStage.map(({ stage, meta, grades: stageGrades }, si) => (
              <motion.section
                key={stage}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.08 }}
              >
                <div className="flex items-baseline gap-3 mb-4">
                  <h2
                    className={`text-lg font-semibold bg-gradient-to-r ${meta.color} bg-clip-text text-transparent`}
                  >
                    {meta.label}
                  </h2>
                  <span className="text-sm text-gray-500">{meta.blurb}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stageGrades.map((g) => (
                    <Link key={g.number} href={`/learn/${g.number}`}>
                      <motion.div
                        whileHover={{ scale: 1.03, y: -2 }}
                        className="group relative overflow-hidden rounded-2xl bg-gray-800/60 border border-gray-700 hover:border-purple-500/50 p-5 transition-colors cursor-pointer"
                      >
                        <div
                          className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${meta.color} opacity-10 group-hover:opacity-20 transition-opacity`}
                        />
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-white font-bold`}
                          >
                            {g.number}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                        </div>
                        <div className="text-white font-semibold">{g.displayName}</div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                          <BookOpen className="w-3 h-3" />
                          {g.subjectCount} subjects
                          {g.chapterCount > 0 && <span>· {g.chapterCount} chapters</span>}
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        )}

        <div className="mt-14 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
          <GraduationCap className="w-4 h-4" />
          Curriculum sources: cbseacademic.nic.in · ncert.nic.in textbooks
        </div>
      </div>
    </div>
  );
}
