'use client';

/**
 * Agentic CoLearn landing page — the syllabus is the hero, not personas.
 * Everything here routes into the real spine: Class → Subject → Chapter.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpenCheck,
  ShieldCheck,
  Brain,
  Eye,
  FileText,
  Users,
  Sparkles,
  Target,
} from 'lucide-react';

const STAGES = [
  { label: 'Foundational', grades: 'Grades 1–2', href: '/learn', note: 'Joyful, playful first steps' },
  { label: 'Preparatory', grades: 'Grades 3–5', href: '/learn', note: 'Reading, maths, the world around us' },
  { label: 'Middle', grades: 'Grades 6–8', href: '/learn', note: 'Curiosity, Ganita Prakash & more' },
  { label: 'Secondary', grades: 'Grades 9–10', href: '/learn', note: 'Board-pattern practice begins' },
  { label: 'Senior Secondary', grades: 'Grades 11–12', href: '/learn', note: 'Science · Commerce · Humanities' },
];

const PILLARS = [
  {
    icon: BookOpenCheck,
    title: 'Grounded in NCERT',
    text: 'Lessons and questions are generated from the official textbook chapters and cite their sources — page numbers included.',
  },
  {
    icon: Eye,
    title: 'See it visually',
    text: 'Every lesson explains its core ideas with diagrams built from the chapter itself — cycles, flows, and classifications a child can follow.',
  },
  {
    icon: FileText,
    title: 'Graded like the board',
    text: 'An AI examiner marks 2, 3, and 5-mark answers against CBSE-style value points, with evidence from your own answer.',
  },
  {
    icon: Brain,
    title: 'Knows what you know',
    text: 'A diagnostic engine tracks mastery on every answer and targets practice at exactly the right level.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified, not just generated',
    text: 'An independent verifier tries to refute every lesson and question before a child ever sees it. What cannot be verified is labelled.',
  },
  {
    icon: Users,
    title: 'Built for families',
    text: 'Per-child profiles, a plain-language weekly report for parents, and predictable costs.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Hero */}
      <section className="relative px-4 pt-20 pb-12 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/25 via-transparent to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-3xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/40 text-purple-200 text-xs mb-6">
            <Sparkles className="w-3.5 h-3.5" /> CBSE · NCERT-aligned · NCF-SE 2023
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-5">
            Every chapter.{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Every child.
            </span>
            <br />
            Taught the way they learn.
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-8">
            A learning companion for Grades 1–12 that teaches from the official NCERT
            textbooks, explains ideas visually, grades answers like a CBSE examiner, and
            adapts to what your child actually knows.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/learn"
              className="px-8 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all inline-flex items-center gap-2"
            >
              Choose your class <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-3.5 bg-gray-800/70 border border-gray-700 rounded-xl font-semibold text-gray-200 hover:text-white hover:border-purple-500/40 transition-all"
            >
              My dashboard
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Stages */}
      <section className="px-4 py-10">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {STAGES.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
            >
              <Link href={s.href} className="block h-full">
                <div className="h-full rounded-2xl bg-gray-800/60 border border-gray-700 hover:border-purple-500/50 transition-colors p-4">
                  <div className="text-purple-300 text-xs font-semibold uppercase tracking-wider">
                    {s.label}
                  </div>
                  <div className="text-white font-bold mt-1">{s.grades}</div>
                  <div className="text-gray-400 text-xs mt-1.5">{s.note}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="px-4 py-14">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
            Trustworthy by construction
          </h2>
          <p className="text-gray-400 text-center text-sm mb-10 max-w-xl mx-auto">
            Hallucination defeats the purpose of education technology — so nothing reaches a
            student unless it is grounded, verified, or deterministic.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6"
              >
                <p.icon className="w-6 h-6 text-purple-400 mb-3" />
                <h3 className="text-white font-semibold mb-1.5">{p.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{p.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How a session works */}
      <section className="px-4 py-14">
        <div className="max-w-4xl mx-auto rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" /> A chapter, end to end
          </h2>
          <ol className="grid sm:grid-cols-5 gap-4 text-sm">
            {[
              ['Diagnose', 'A 5-question check finds your starting level'],
              ['Learn', 'A grounded lesson with visual diagrams and citations'],
              ['Practice', 'Board-typology questions marked point by point'],
              ['Mock Test', 'A blueprint paper with a distribution scorecard'],
              ['Progress', 'Mastery per outcome — and what to do next'],
            ].map(([t, d], i) => (
              <li key={t}>
                <div className="text-purple-300 font-mono text-xs mb-1">{i + 1}</div>
                <div className="text-white font-semibold">{t}</div>
                <div className="text-gray-400 text-xs mt-1">{d}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="px-4 py-10 text-center text-xs text-gray-500">
        Agentic CoLearn · grounded in official NCERT &amp; CBSE sources · every mark, fact, and
        recommendation traceable
      </footer>
    </div>
  );
}
