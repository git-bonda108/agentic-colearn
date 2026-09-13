'use client';

/**
 * Ask a doubt — chapter-context Q&A panel (the companion-voice layer that
 * replaces the persona chat). Answers are grounded in the chapter's official
 * NCERT text when ingested, and every answer shows its grounding state.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, MessageCircleQuestion, CheckCircle2, AlertTriangle, Send } from 'lucide-react';

interface Exchange {
  question: string;
  answer?: string;
  coversTopic?: boolean;
  grounded?: boolean;
  citedPages?: number[];
  sourceUrl?: string | null;
  answeredBy?: string;
  error?: string;
}

export default function AskDoubt({ chapterId }: { chapterId: string }) {
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  const ask = async () => {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setQuestion('');
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId, question: q }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Failed to answer');
      setExchanges((xs) => [{ question: q, ...d }, ...xs]);
    } catch (e: any) {
      setExchanges((xs) => [{ question: q, error: e?.message ?? 'Failed to answer' }, ...xs]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
        <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
          <MessageCircleQuestion className="w-5 h-5 text-purple-400" /> Ask a doubt
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Your companion answers from this chapter&apos;s official NCERT text — and says so honestly
          when the chapter doesn&apos;t cover something.
        </p>
        <div className="flex gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            rows={2}
            placeholder="e.g. Why do we balance chemical equations?"
            className="flex-1 rounded-xl bg-gray-700/40 border border-gray-600 focus:border-purple-500/60 focus:outline-none p-3 text-sm text-white placeholder-gray-500 resize-y"
          />
          <button
            onClick={ask}
            disabled={asking || !question.trim()}
            className="self-end px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all disabled:opacity-40"
          >
            {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {exchanges.map((x, i) => (
        <motion.div
          key={exchanges.length - i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gray-800/60 border border-gray-700 p-5"
        >
          <div className="text-sm text-purple-200 font-medium mb-2">Q: {x.question}</div>
          {x.error ? (
            <div className="text-sm text-rose-300">{x.error}</div>
          ) : (
            <>
              <div className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">
                {x.answer}
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px]">
                {x.grounded ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/40 text-green-300">
                    <CheckCircle2 className="w-3 h-3" />
                    From the NCERT chapter
                    {(x.citedPages?.length ?? 0) > 0 && ` · p.${x.citedPages!.join(', ')}`}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-300">
                    <AlertTriangle className="w-3 h-3" /> Model knowledge — chapter text not ingested
                  </span>
                )}
                {x.coversTopic === false && (
                  <span className="text-gray-500">Outside this chapter&apos;s scope</span>
                )}
                {x.answeredBy && <span className="text-gray-600">{x.answeredBy}</span>}
              </div>
            </>
          )}
        </motion.div>
      ))}
    </div>
  );
}
