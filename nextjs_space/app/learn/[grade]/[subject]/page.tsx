'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Target, HelpCircle, CheckCircle2 } from 'lucide-react';
import { SubjectIcon } from '@/components/subject-icon';

interface ChapterInfo {
  id: string;
  number: number;
  title: string;
  summary?: string | null;
  textbook?: string | null;
  questionCount: number;
  outcomeCount: number;
  pKnown: number | null;
  masteryLevel: 'mastered' | 'developing' | 'needs_work' | null;
}

const LEVEL_STYLE: Record<string, { label: string; cls: string }> = {
  mastered: { label: 'Mastered', cls: 'text-green-400 bg-green-500/10 border-green-500/30' },
  developing: { label: 'Developing', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  needs_work: { label: 'Needs work', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
};

export default function SubjectPage() {
  const params = useParams<{ grade: string; subject: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.grade) return;
    fetch(`/api/curriculum/${params.grade}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params?.grade]);

  const subject = data?.subjects?.find((s: any) => s.slug === params?.subject);
  const chapters: ChapterInfo[] = subject?.chapters ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <Link
          href={`/learn/${params?.grade}`}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-purple-300 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> {data?.grade?.displayName ?? 'Back'} subjects
        </Link>

        {subject && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-10"
          >
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
                subject.color ?? 'from-gray-500 to-gray-600'
              } flex items-center justify-center`}
            >
              <SubjectIcon name={subject.icon} className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{subject.name}</h1>
              <p className="text-gray-400 text-sm">
                {data?.grade?.displayName} · {chapters.length} chapters
                {new Set(chapters.map((c) => c.textbook).filter(Boolean)).size === 1 &&
                chapters[0]?.textbook
                  ? ` · ${chapters[0].textbook}`
                  : ''}
              </p>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-800/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {chapters.map((c, i) => {
              const level = c.masteryLevel ? LEVEL_STYLE[c.masteryLevel] : null;
              const multiBook =
                new Set(chapters.map((ch) => ch.textbook).filter(Boolean)).size > 1;
              const isNewBook =
                multiBook && (i === 0 || chapters[i - 1].textbook !== c.textbook);
              return (
                <div key={c.id}>
                  {isNewBook && c.textbook && (
                    <div className="pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-purple-300/80">
                      {c.textbook}
                    </div>
                  )}
                <Link href={`/learn/chapter/${c.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ x: 4 }}
                    className="group rounded-xl bg-gray-800/60 border border-gray-700 hover:border-purple-500/50 p-4 mb-3 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 shrink-0 rounded-lg bg-gray-700/80 flex items-center justify-center text-purple-300 font-semibold">
                        {c.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium">{c.title}</span>
                          {level && (
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full border ${level.cls}`}
                            >
                              {level.label}
                            </span>
                          )}
                        </div>
                        {c.summary && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{c.summary}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1.5 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" /> {c.questionCount} questions
                          </span>
                          {c.outcomeCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" /> {c.outcomeCount} learning outcomes
                            </span>
                          )}
                          {c.pKnown !== null && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {Math.round(c.pKnown * 100)}% mastery
                            </span>
                          )}
                        </div>
                        {c.pKnown !== null && (
                          <div className="mt-2 h-1.5 rounded-full bg-gray-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                c.pKnown >= 0.95
                                  ? 'bg-green-500'
                                  : c.pKnown >= 0.6
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.round(c.pKnown * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors shrink-0" />
                    </div>
                  </motion.div>
                </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
