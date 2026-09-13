'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, BookOpen } from 'lucide-react';
import { SubjectIcon } from '@/components/subject-icon';

interface SubjectInfo {
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  stream?: string | null;
  chapters: { id: string }[];
}

const STREAM_LABELS: Record<string, string> = {
  science: 'Science Stream',
  commerce: 'Commerce Stream',
  humanities: 'Humanities Stream',
  olympiad: 'Olympiad Prep',
};

export default function GradePage() {
  const params = useParams<{ grade: string }>();
  const gradeNumber = params?.grade;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gradeNumber) return;
    fetch(`/api/curriculum/${gradeNumber}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gradeNumber]);

  const subjects: SubjectInfo[] = data?.subjects ?? [];
  const streams = ['', 'science', 'commerce', 'humanities', 'olympiad'];
  const grouped = streams
    .map((stream) => ({
      stream,
      subjects: subjects.filter((s) => (s.stream ?? '') === stream),
    }))
    .filter((g) => g.subjects.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-purple-300 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> All classes
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {data?.grade?.displayName ?? `Grade ${gradeNumber}`}{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Subjects
            </span>
          </h1>
          <p className="text-gray-400 mt-2">
            Pick a subject to see its chapters, learn, and practice CBSE-pattern questions.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-gray-800/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(({ stream, subjects: streamSubjects }) => (
              <section key={stream || 'core'}>
                {stream && (
                  <h2 className="text-lg font-semibold text-gray-300 mb-4">
                    {STREAM_LABELS[stream]}
                  </h2>
                )}
                <div className="grid md:grid-cols-3 gap-4">
                  {streamSubjects.map((s, i) => {
                    const chapterCount = s.chapters?.length ?? 0;
                    const inner = (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        whileHover={chapterCount > 0 ? { scale: 1.02, y: -2 } : undefined}
                        className={`relative overflow-hidden rounded-2xl bg-gray-800/60 border border-gray-700 p-6 transition-colors ${
                          chapterCount > 0
                            ? 'hover:border-purple-500/50 cursor-pointer'
                            : 'opacity-60'
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                            s.color ?? 'from-gray-500 to-gray-600'
                          } flex items-center justify-center mb-4`}
                        >
                          <SubjectIcon name={s.icon} className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-semibold">{s.name}</div>
                            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                              <BookOpen className="w-3 h-3" />
                              {chapterCount > 0
                                ? `${chapterCount} chapters`
                                : 'Chapters being added'}
                            </div>
                          </div>
                          {chapterCount > 0 && (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                      </motion.div>
                    );
                    return chapterCount > 0 ? (
                      <Link key={s.slug} href={`/learn/${gradeNumber}/${s.slug}`}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={s.slug}>{inner}</div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
