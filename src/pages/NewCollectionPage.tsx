import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Check,
  Copy,
  Share2,
  QrCode,
  Download,
  Calendar,
  Coins,
  Smile,
  Layers,
  Palette
} from 'lucide-react';
import { THEMES, COLLECTION_TEMPLATES } from '../utils/theme';
import { CollectionTheme, CollectionMode, Group } from '../types';
import { formatINR } from '../utils/currency';
import { fireFullConfetti } from '../utils/confetti';
import { AiBadge } from '../components/AiCard';

export const NewCollectionPage: React.FC = () => {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [memberCount, setMemberCount] = useState(10);

  // Form Fields
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [emoji, setEmoji] = useState('🎉');
  const [theme, setTheme] = useState<CollectionTheme>('candy');
  const [mode, setMode] = useState<CollectionMode>('fixed');
  const [amount, setAmount] = useState<number>(500);
  const [deadline, setDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [aiMessage, setAiMessage] = useState('Gemini is analyzing brief...');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Share Modal after creation
  const [createdCollection, setCreatedCollection] = useState<{ id: string; slug: string; title: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/groups/${groupId}`)
      .then(res => res.json())
      .then(data => {
        if (data.group) {
          setGroup(data.group);
          setMemberCount(data.group.memberCount || 10);
        }
      })
      .catch(console.error);
  }, [groupId]);

  // AI Creator Handler
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setAiLoading(true);
      setError(null);

      const messages = [
        'Gemini is analyzing your event brief...',
        'Computing target amounts in Indian Rupees (₹)...',
        'Selecting color theme and crafting purpose...',
      ];
      let msgIdx = 0;
      const interval = setInterval(() => {
        msgIdx = (msgIdx + 1) % messages.length;
        setAiMessage(messages[msgIdx]);
      }, 700);

      const res = await fetch('/api/ai/create-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, memberCount }),
      });
      clearInterval(interval);

      if (res.ok) {
        const data = await res.json();
        // Animate field fills
        setTitle(data.title || '');
        setPurpose(data.purpose || '');
        setEmoji(data.emoji || '🎉');
        setTheme(data.theme || 'aurora');
        setMode(data.mode || 'fixed');
        setAmount(data.mode === 'fixed' ? (data.fixedAmount || 500) : (data.goalAmount || 10000));

        if (data.deadlineDaysFromToday) {
          const d = new Date();
          d.setDate(d.getDate() + data.deadlineDaysFromToday);
          setDeadline(d.toISOString().split('T')[0]);
        }

        setAiSuccess(true);
        setTimeout(() => setAiSuccess(false), 3000);
      }
    } catch (e) {
      console.error('AI creator error:', e);
      setError('Failed to generate collection from AI.');
    } finally {
      setAiLoading(false);
    }
  };

  // Template select
  const applyTemplate = (t: typeof COLLECTION_TEMPLATES[0]) => {
    setTitle(t.title);
    setPurpose(t.purpose);
    setEmoji(t.emoji);
    setTheme(t.theme);
    setMode(t.mode);
    setAmount(t.amount);
  };

  const calculatedTarget = mode === 'fixed' ? amount * Math.max(memberCount, 1) : amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          title: title.trim(),
          purpose: purpose.trim(),
          emoji,
          theme,
          mode,
          goalAmount: mode === 'goal' ? amount : null,
          fixedAmount: mode === 'fixed' ? amount : null,
          deadline: new Date(deadline).toISOString(),
        }),
      });

      if (res.ok) {
        const col = await res.json();
        fireFullConfetti();
        setCreatedCollection({ id: col.id, slug: col.slug, title: col.title });
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to save collection.');
      }
    } catch (e) {
      setError('Network error while saving collection.');
    } finally {
      setSubmitting(false);
    }
  };

  const collectionPublicUrl = createdCollection
    ? `${window.location.origin}/c/${createdCollection.slug}`
    : '';

  const copyShareLink = () => {
    navigator.clipboard.writeText(collectionPublicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Contribute to "${createdCollection?.title}" on CollectIt: ${collectionPublicUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <span>Create Collection</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Group: <span className="font-semibold text-slate-900 dark:text-white">{group?.name || 'Group'}</span> ({memberCount} members)
        </p>
      </div>

      {/* AI Creator Box */}
      <div className="rounded-2xl p-[1px] bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 shadow-xl shadow-indigo-950/20">
        <div className="rounded-[15px] p-5 bg-white dark:bg-[#0d1226]/95 backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-300 animate-pulse" />
              <span>AI Collection Creator</span>
            </span>
            <AiBadge isAi={true} />
          </div>

          <p className="text-xs text-purple-950 dark:text-purple-200/90 leading-relaxed font-medium">
            Type what you're collecting for in plain English. Gemini auto-calculates split shares, suggests theme and deadline.
          </p>

          <div className="relative">
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. farewell party for 30 friends, around ₹15,000, by end of next month"
              rows={2}
              className="w-full rounded-xl bg-slate-50 dark:bg-white/5 border border-purple-200 dark:border-purple-500/30 p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-400">
              <span className="font-medium">Try:</span>
              <button
                type="button"
                onClick={() => setAiPrompt('farewell party for 30 friends, around ₹15,000, by end of next month')}
                className="hover:text-purple-300 underline"
              >
                Farewell party ₹15k
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setAiPrompt('tech fest stage sponsorship pool ₹5,00,000 for next 3 weeks')}
                className="hover:text-purple-300 underline"
              >
                Fest Sponsorship ₹5L
              </button>
            </div>

            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={aiLoading || !aiPrompt.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 hover:opacity-95 text-white disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all"
            >
              {aiLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{aiMessage}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{aiSuccess ? '✨ Filled by Gemini!' : 'Generate with AI'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Template Chips */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Or Quick Start from Template
        </span>
        <div className="flex flex-wrap gap-2">
          {COLLECTION_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyTemplate(tmpl)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <span>{tmpl.emoji}</span>
              <span>{tmpl.title}</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {tmpl.mode === 'fixed' ? `₹${tmpl.amount}` : `₹${tmpl.amount}`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="p-6 glass-panel space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Title and Emoji */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Collection Title</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              className="w-12 h-11 text-center text-xl rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              maxLength={4}
            />
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Farewell Party Fund, Goa Trip Deposit, Fest Pass"
              maxLength={60}
              required
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Purpose */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Purpose (Publicly visible)</label>
          <textarea
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            placeholder="Tell supporters what the funds will be used for..."
            maxLength={200}
            rows={2}
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Mode Toggle */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Collection Mode</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('fixed')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                mode === 'fixed'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <p className="font-bold text-xs flex items-center justify-between">
                <span>Fixed-Share Mode</span>
                {mode === 'fixed' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Each member pays an equal fixed amount.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode('goal')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                mode === 'goal'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <p className="font-bold text-xs flex items-center justify-between">
                <span>Goal Target Pool</span>
                {mode === 'goal' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Open contributions; supporters choose any amount.
              </p>
            </button>
          </div>
        </div>

        {/* Amount Input with Live Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              {mode === 'fixed' ? 'Fixed Share per Head (₹)' : 'Target Goal Amount (₹)'}
            </label>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-emerald-400 font-bold">
              INR (₹)
            </span>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">
              ₹
            </span>
            <input
              type="number"
              min={50}
              max={mode === 'fixed' ? 200000 : 10000000}
              value={amount || ''}
              onChange={e => setAmount(Number(e.target.value))}
              required
              className="w-full rounded-xl bg-white/5 border border-white/10 pl-8 pr-4 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Live Target Calculation Preview */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 flex items-center justify-between font-mono">
            <span>Calculated Target:</span>
            <span className="text-sm font-extrabold text-emerald-400">
              {mode === 'fixed' ? (
                <>
                  ₹{amount.toLocaleString('en-IN')} × {memberCount} members ={' '}
                  {formatINR(calculatedTarget)}
                </>
              ) : (
                <>{formatINR(calculatedTarget)}</>
              )}
            </span>
          </div>
        </div>

        {/* Theme Swatches */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span>Color Theme Swatches</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {(Object.keys(THEMES) as CollectionTheme[]).map(tKey => {
              const th = THEMES[tKey];
              const isSelected = theme === tKey;
              return (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => setTheme(tKey)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'border-white scale-105 shadow-lg'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`w-full h-5 rounded-lg bg-gradient-to-r ${th.gradient} mb-1.5`} />
                  <span className="text-[11px] font-semibold text-white capitalize">{th.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Deadline */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Target Deadline</span>
          </label>
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            required
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/group/${groupId}`)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Launch Collection & Get Link'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Share Modal on Success */}
      {createdCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel max-w-md w-full p-6 text-center space-y-5 border border-white/20 shadow-2xl animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
              🎉
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Collection is Live!</h3>
              <p className="text-xs text-slate-400">{createdCollection.title}</p>
            </div>

            {/* Link Box */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-300 truncate mr-2">
                {collectionPublicUrl}
              </span>
              <button
                onClick={copyShareLink}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {/* QR Preview */}
            <div className="p-3 bg-white rounded-xl inline-block shadow-lg">
              <img
                src={`/api/qr/${createdCollection.slug}.png`}
                alt="QR Code"
                className="w-36 h-36 mx-auto"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={shareWhatsApp}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share WhatsApp</span>
              </button>
              <a
                href={`/api/qr/${createdCollection.slug}.png?download=1`}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white flex items-center justify-center gap-1.5 border border-white/10"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR</span>
              </a>
            </div>

            <button
              onClick={() => navigate(`/manage/${createdCollection.id}`)}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5"
            >
              <span>Go to Organizer Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
