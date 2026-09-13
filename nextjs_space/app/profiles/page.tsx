'use client';

/**
 * Family profiles — one profile per child on a shared device. Selecting a
 * profile scopes all mastery, attempts, and reports to that child. No
 * passwords in the prototype (deliberately not fake security).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserRound, Plus, Loader2, CheckCircle2 } from 'lucide-react';

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('6');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetch('/api/profiles')
      .then((r) => r.json())
      .then((d) => {
        setProfiles(d.profiles ?? []);
        setActiveId(d.activeId ?? null);
      })
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const select = async (id: string) => {
    setBusy(true);
    try {
      await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectId: id }),
      });
      router.push('/dashboard');
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, grade }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Failed');
      router.push('/dashboard');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create profile');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white">Who&apos;s learning today?</h1>
          <p className="text-gray-400 mt-1">
            Each child gets their own mastery model, practice history, and parent report.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {profiles.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => !busy && select(p.id)}
              onKeyDown={(e) => e.key === 'Enter' && !busy && select(p.id)}
              className={`text-left rounded-2xl border p-5 transition-all cursor-pointer ${
                p.id === activeId
                  ? 'bg-purple-500/15 border-purple-500/60'
                  : 'bg-gray-800/60 border-gray-700 hover:border-purple-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <UserRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-medium flex items-center gap-2">
                    {p.name}
                    {p.id === activeId && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="text-xs text-gray-400">
                    {p.grade ? `Grade ${p.grade}` : 'Grade not set'}
                    {' · '}
                    {p.preferredLanguages?.length
                      ? ['English', ...p.preferredLanguages.map((l: string) => (l === 'hi' ? 'हिन्दी' : 'తెలుగు'))].join(' → ')
                      : 'English'}
                  </div>
                </div>
              </div>
              <div
                className="mt-3 flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[11px] text-gray-500">Learning languages:</span>
                <select
                  value={(p.preferredLanguages ?? []).join(',') || 'none'}
                  onChange={async (e) => {
                    const v = e.target.value;
                    const languages = v === 'none' ? [] : v.split(',');
                    await fetch('/api/profiles', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ setLanguagesFor: p.id, languages }),
                    });
                    load();
                  }}
                  className="text-[11px] rounded-lg bg-gray-700/60 border border-gray-600 text-gray-200 px-2 py-1"
                >
                  <option value="none">English only</option>
                  <option value="hi">English → हिन्दी</option>
                  <option value="te">English → తెలుగు</option>
                  <option value="hi,te">English → हिन्दी → తెలుగు</option>
                  <option value="te,hi">English → తెలుగు → हिन्दी</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-gray-800/60 border border-gray-700 p-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-400" /> Add a child
          </h2>
          <div className="flex flex-wrap gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="flex-1 min-w-40 rounded-xl bg-gray-700/40 border border-gray-600 focus:border-purple-500/60 focus:outline-none px-4 py-2.5 text-sm text-white placeholder-gray-500"
            />
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="rounded-xl bg-gray-700/40 border border-gray-600 text-white text-sm px-3 py-2.5"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
            <button
              onClick={create}
              disabled={busy || name.trim().length < 2}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all disabled:opacity-40 inline-flex items-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Start learning
            </button>
          </div>
          {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
          <p className="text-xs text-gray-500 mt-4">
            Profiles are for one family device and carry no passwords — full sign-in arrives with
            the production release.
          </p>
        </div>
      </div>
    </div>
  );
}
