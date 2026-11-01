import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { fireFullConfetti } from '../utils/confetti';

export const JoinGroupPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();

  const [group, setGroup] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/join/${code}`)
      .then(res => {
        if (!res.ok) throw new Error('Group not found');
        return res.json();
      })
      .then(data => setGroup(data))
      .catch(err => setError('This join link is invalid or expired.'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`/api/join/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        fireFullConfetti();
        setJoined(true);
        setAlreadyMember(Boolean(resData.alreadyMember));
      } else {
        setError(resData.error || 'Failed to join group.');
      }
    } catch (e) {
      setError('Network error while joining.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center animate-pulse space-y-4">
        <div className="h-12 w-12 bg-white/10 rounded-2xl mx-auto" />
        <div className="h-6 w-48 bg-white/10 rounded-lg mx-auto" />
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto text-2xl">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-white">Join Link Invalid</h2>
        <p className="text-xs text-slate-400">{error}</p>
        <Link to="/" className="text-xs text-indigo-400 hover:underline">
          Go to CollectIt Home
        </Link>
      </div>
    );
  }

  if (group && !group.joinOpen) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto text-2xl">
          🔒
        </div>
        <h2 className="text-xl font-bold text-white">Joining is Closed</h2>
        <p className="text-xs text-slate-400">
          The organizer has currently paused self-enrollment for <strong className="text-white">{group.name}</strong>.
        </p>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-3xl">
          🎉
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-white">
            {alreadyMember ? "You're already on the list!" : "You're in!"}
          </h2>
          <p className="text-xs text-slate-300">
            Welcome to <strong className="text-white">{group.name}</strong>.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            The organizer will share collection payment links directly with you.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to="/"
            className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white inline-block"
          >
            Learn more about CollectIt
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="p-8 glass-panel space-y-6 border border-white/15 shadow-2xl">
        <div className="text-center space-y-2">
          <span className="text-4xl p-3 rounded-2xl bg-white/5 border border-white/10 inline-block">
            {group.emoji}
          </span>
          <h1 className="text-2xl font-extrabold text-white">Join {group.name}</h1>
          <p className="text-xs text-slate-400">
            Self-register in the group roster to receive payment links and group collections.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              required
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">WhatsApp Mobile (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Email Address (Optional)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@college.edu"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
          >
            {submitting ? 'Registering...' : 'Join Group Roster'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
