'use client';

/**
 * Knowledge Map — the student's mastery over the real curriculum structure.
 * Nodes are NCERT chapters (colored by live BKT mastery), edges are the
 * official chapter sequence within each book. Replaces the legacy
 * notes-concept graph whose edges were synthetic subject-string matches.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, { Background, Controls, type Edge, type Node } from 'reactflow';
import 'reactflow/dist/style.css';

interface GraphNode {
  id: string;
  number: number;
  title: string;
  book: string;
  bookKey: string;
  pKnown: number | null;
  level: 'mastered' | 'developing' | 'needs_work' | null;
  attempts: number;
  questionCount: number;
  grounded: boolean;
}

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

function nodeColors(n: GraphNode): { bg: string; border: string } {
  if (n.level === 'mastered') return { bg: '#0d3321', border: '#22c55e' };
  if (n.level === 'developing') return { bg: '#38290b', border: '#f59e0b' };
  if (n.level === 'needs_work') return { bg: '#3b1219', border: '#f43f5e' };
  return { bg: '#1f2637', border: '#4b5563' };
}

export default function KnowledgeGraphPage() {
  const router = useRouter();
  const [grade, setGrade] = useState(10);
  const [subjects, setSubjects] = useState<{ name: string; slug: string }[]>([]);
  const [subject, setSubject] = useState('science');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/curriculum/${grade}`)
      .then((r) => r.json())
      .then((d) => {
        const subs = (d?.subjects ?? [])
          .filter((s: any) => (s.chapters ?? []).length > 0)
          .map((s: any) => ({ name: s.name, slug: s.slug }));
        setSubjects(subs);
        if (subs.length > 0 && !subs.some((s: any) => s.slug === subject)) {
          setSubject(subs[0].slug);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/knowledge-graph?grade=${grade}&subject=${subject}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [grade, subject]);

  useEffect(load, [load]);

  const { nodes, edges } = useMemo(() => {
    if (!data?.nodes) return { nodes: [] as Node[], edges: [] as Edge[] };
    const books: string[] = Array.from(new Set(data.nodes.map((n: GraphNode) => n.bookKey)));
    const nodes: Node[] = data.nodes.map((n: GraphNode) => {
      const row = books.indexOf(n.bookKey);
      const idxInBook = data.nodes
        .filter((m: GraphNode) => m.bookKey === n.bookKey)
        .sort((a: GraphNode, b: GraphNode) => a.number - b.number)
        .findIndex((m: GraphNode) => m.id === n.id);
      const { bg, border } = nodeColors(n);
      return {
        id: n.id,
        position: { x: idxInBook * 230, y: row * 150 },
        data: {
          label: (
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>
                Ch {n.number}
                {n.pKnown !== null ? ` · ${Math.round(n.pKnown * 100)}%` : ''}
                {n.grounded ? ' · 📖' : ''}
              </div>
              <div style={{ fontSize: 10, opacity: 0.85 }}>
                {n.title.length > 42 ? n.title.slice(0, 42) + '…' : n.title}
              </div>
            </div>
          ),
        },
        style: {
          background: bg,
          border: `1.5px solid ${border}`,
          borderRadius: 10,
          color: '#e5e7eb',
          width: 210,
          padding: 8,
          cursor: 'pointer',
        },
      };
    });
    const edges: Edge[] = (data.edges ?? []).map((e: any) => ({
      id: `${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      animated: false,
      style: { stroke: '#6b7280' },
    }));
    return { nodes, edges };
  }, [data]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Knowledge Map</h1>
            <p className="text-gray-400 text-sm mt-1">
              Your mastery across the official NCERT chapter sequence. 📖 = grounded in the
              chapter&apos;s source text. Click a chapter to open it.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={grade}
              onChange={(e) => setGrade(parseInt(e.target.value, 10))}
              className="rounded-xl bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-xl bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2"
            >
              {subjects.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-4 mb-4 text-xs text-gray-400">
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 mr-1" />Mastered</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-1" />Developing</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 mr-1" />Needs work</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-500 mr-1" />Not attempted</span>
        </div>

        <div className="rounded-2xl bg-gray-800/40 border border-gray-700 overflow-hidden" style={{ height: 560 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Building your map…
            </div>
          ) : nodes.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              No chapters found for this subject.
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              onNodeClick={(_e, node) => router.push(`/learn/chapter/${node.id}`)}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#374151" gap={24} />
              <Controls />
            </ReactFlow>
          )}
        </div>
        {data?.edgeNote && <p className="text-xs text-gray-500 mt-3">{data.edgeNote}</p>}
      </div>
    </div>
  );
}
