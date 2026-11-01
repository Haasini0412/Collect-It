import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Share2,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  MessageCircle,
  HelpCircle,
  Send,
  Coins,
  Users,
  Calendar,
  Crown,
  Heart,
  Receipt,
  X,
  Lock,
  ArrowRight
} from 'lucide-react';
import { PublicCollectionData, ConfigResponse } from '../types';
import { THEMES } from '../utils/theme';
import { formatINR, formatCompactINR } from '../utils/currency';
import { ProgressRing } from '../components/ProgressRing';
import { ProgressBar } from '../components/ProgressBar';
import { fireFullConfetti } from '../utils/confetti';
import { AiBadge } from '../components/AiCard';

export const PublicCollectionPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<PublicCollectionData | null>(null);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [amount, setAmount] = useState<number>(500);

  // Unpaid roster list for fixed-mode
  const [unpaidList, setUnpaidList] = useState<Array<{ id: string; name: string }>>([]);
  const [rosterQuery, setRosterQuery] = useState('');

  // Payment states
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Floating "Ask the Ledger" Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'Hi! Ask me anything about this collection — where the money went, progress, or when the deadline is.',
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Milestone Celebration tracking
  const [celebratedMilestones, setCelebratedMilestones] = useState<Set<number>>(new Set());

  const fetchCollection = async (isBackground = false) => {
    if (!slug) return;
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch(`/api/c/${slug}`);
      if (res.ok) {
        const json: PublicCollectionData = await res.json();
        setData(json);

        if (json.collection.mode === 'fixed') {
          setAmount(json.collection.fixedAmount || 500);
        }

        // Milestone trigger
        const p = json.stats.percent;
        [25, 50, 75, 100].forEach(m => {
          if (p >= m && !celebratedMilestones.has(m)) {
            setCelebratedMilestones(prev => new Set(prev).add(m));
            if (!isBackground) fireFullConfetti();
          }
        });
      } else {
        setError('Collection not found or has been closed.');
      }
    } catch (e) {
      console.error('Fetch error:', e);
      setError('Network error loading collection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnpaidRoster = async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/c/${slug}/unpaid-members?q=${encodeURIComponent(rosterQuery)}&limit=40`);
      if (res.ok) {
        const list = await res.json();
        setUnpaidList(list);
      }
    } catch (e) {
      console.error('Roster fetch error:', e);
    }
  };

  useEffect(() => {
    fetchCollection();
    fetch('/api/config')
      .then(res => res.json())
      .then(setConfig)
      .catch(console.error);

    // 5-second polling (paused when tab hidden)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchCollection(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [slug]);

  useEffect(() => {
    if (data?.collection.mode === 'fixed') {
      fetchUnpaidRoster();
    }
  }, [slug, data?.collection.mode, rosterQuery]);

  // Handle Roster select
  const handleSelectMember = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedMemberId(val);
    if (val && val !== 'other') {
      const found = unpaidList.find(m => m.id === val);
      if (found) setName(found.name);
    } else if (val === 'other') {
      setName('');
    }
  };

  // Demo Payment Handler
  const handleDemoPay = async () => {
    if (!slug || !data) return;
    if (!name.trim()) {
      setPaymentError('Please enter your name.');
      return;
    }
    if (amount < 50 || amount > 200000) {
      setPaymentError('Amount must be between ₹50 and ₹2,00,000.');
      return;
    }

    try {
      setPaying(true);
      setPaymentError(null);
      const res = await fetch(`/api/c/${slug}/demo-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          payerName: name.trim(),
          payerEmail: email.trim() || null,
          note: note.trim() || null,
          isAnonymous,
          memberId: selectedMemberId !== 'other' && selectedMemberId ? selectedMemberId : null,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        navigate(`/c/${slug}/success?amount=${amount}&name=${encodeURIComponent(name)}&pid=${resData.paymentId}`);
      } else {
        setPaymentError(resData.error || 'Payment failed.');
      }
    } catch (e) {
      setPaymentError('Network error processing payment.');
    } finally {
      setPaying(false);
    }
  };

  // Send question in "Ask the Ledger" Chat
  const handleSendChat = async (questionText = chatQuestion) => {
    if (!questionText.trim() || chatLoading || !slug) return;

    const q = questionText.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: q }]);
    setChatQuestion('');
    setChatLoading(true);

    try {
      const res = await fetch(`/api/c/${slug}/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: data.answer }]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { sender: 'ai', text: data.error || "I'm having trouble retrieving that answer." },
        ]);
      }
    } catch (e) {
      setChatMessages(prev => [
        ...prev,
        { sender: 'ai', text: 'Network error. Please try again.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const copyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Contribute to "${data?.collection.title}" on CollectIt: ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-6 animate-pulse">
        <div className="h-44 bg-white/5 rounded-3xl" />
        <div className="h-64 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto text-2xl">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-white">Collection Not Found</h2>
        <p className="text-xs text-slate-400">{error || 'This link may have expired or closed.'}</p>
        <Link to="/" className="text-xs text-indigo-400 hover:underline">
          Go to CollectIt Home
        </Link>
      </div>
    );
  }

  const { collection, group, lead, stats, supporters, expenses, balance, spendingStory, spendingStoryAi } = data;
  const themeConfig = THEMES[collection.theme] || THEMES.aurora;
  const inrRate = config?.inrPerUsd || 88;
  const approxUsd = Math.max(0.5, Math.round((amount / inrRate) * 100) / 100).toFixed(2);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-24">
      {/* Themed Hero Card */}
      <div className="p-6 sm:p-8 rounded-3xl relative overflow-hidden glass-panel border border-white/10 shadow-2xl">
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${themeConfig.gradient}`} />
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2.5 rounded-2xl bg-white/5 border border-white/10">
                {collection.emoji}
              </span>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {group.emoji} {group.name}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{collection.title}</h1>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              {collection.purpose}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
              <span>Organized by <strong className="text-white">{lead.name}</strong></span>
              <span>·</span>
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{stats.daysLeft > 0 ? `${stats.daysLeft} days remaining` : 'Deadline passed'}</span>
              </span>
            </div>
          </div>

          {/* Quick Share Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={shareWhatsApp}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
              title="Share on WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={copyShare}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10"
              title="Copy share link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress Display */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-2">
              <div className="flex justify-between items-baseline font-mono">
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-white">
                    {formatINR(stats.raised)}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">raised of {formatINR(stats.target)} target</span>
                </div>
                <span className="font-extrabold text-lg text-emerald-400">{stats.percent}%</span>
              </div>
              <ProgressBar percent={stats.percent} theme={collection.theme} height={14} />

              {stats.percent >= 100 && (
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold text-center">
                  🎯 Target Goal Reached! Thank you for the generous support.
                </div>
              )}
            </div>

            <div className="md:col-span-4 flex justify-center md:justify-end">
              <ProgressRing percent={stats.percent} size={110} strokeWidth={9} theme={collection.theme} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Payment Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Payment Panel */}
        <div className="md:col-span-7 p-6 glass-panel space-y-5 border border-white/15">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="font-bold text-base text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>Contribute via PayPal</span>
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
              INR (₹) → USD
            </span>
          </div>

          {stats.isClosed ? (
            <div className="p-8 text-center space-y-2 rounded-2xl bg-white/5 border border-white/10">
              <Lock className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="font-bold text-white">Collection Closed</h3>
              <p className="text-xs text-slate-400">
                This fund is currently closed for new contributions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {paymentError}
                </div>
              )}

              {/* Fixed mode member selector */}
              {collection.mode === 'fixed' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Find Your Name on Roster:
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={handleSelectMember}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="" className="bg-white dark:bg-[#070B18] text-slate-500 dark:text-slate-400">
                      -- Select your name from roster ({unpaidList.length} pending) --
                    </option>
                    {unpaidList.map(m => (
                      <option key={m.id} value={m.id} className="bg-white dark:bg-[#070B18] text-slate-900 dark:text-white">
                        {m.name}
                      </option>
                    ))}
                    <option value="other" className="bg-white dark:bg-[#070B18] text-indigo-600 dark:text-indigo-300 font-semibold">
                      I'm not listed (Enter custom name)
                    </option>
                  </select>
                </div>
              )}

              {/* Name field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Your Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Priya Patel"
                  required
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Optional Email and Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Email for Receipt (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Supporter Note (Optional)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="e.g. Can't wait! 🪔"
                    maxLength={150}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Amount Selection */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">
                    {collection.mode === 'fixed' ? 'Fixed Share (Locked)' : 'Contribution Amount (₹)'}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">{formatINR(amount)}</span>
                </div>

                {collection.mode === 'goal' ? (
                  <div className="space-y-2">
                    {/* Chip shortcuts */}
                    <div className="grid grid-cols-4 gap-2">
                      {[100, 250, 500, 1000].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setAmount(chip)}
                          className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                            amount === chip
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          ₹{chip}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        min={50}
                        max={200000}
                        value={amount || ''}
                        onChange={e => setAmount(Number(e.target.value))}
                        className="w-full rounded-xl bg-white/5 border border-white/10 pl-8 pr-4 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between font-mono">
                    <span className="text-xs text-slate-400">Fixed share per member</span>
                    <span className="text-base font-bold text-white">{formatINR(amount)}</span>
                  </div>
                )}
              </div>

              {/* Live FX Conversion Note */}
              <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed font-mono">
                <span>You pay ₹{amount.toLocaleString('en-IN')} · PayPal charges ≈ ${approxUsd} (₹{inrRate} = $1).</span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Sandbox: use a PayPal sandbox buyer account. No real money moves.
                </p>
              </div>

              {/* Anonymous Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={e => setIsAnonymous(e.target.checked)}
                  className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Hide my name publicly on the supporter wall</span>
              </label>

              {/* Action Buttons: Demo Payment & PayPal */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleDemoPay}
                  disabled={paying}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {paying ? (
                    'Processing Contribution...'
                  ) : (
                    <>
                      <span>Pay ₹{amount.toLocaleString('en-IN')} (Instant Demo Checkout)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Trust Note */}
              <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Funds are collected securely via PayPal and held by CollectIt until the organizer settles them.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Supporter Wall */}
        <div className="md:col-span-5 p-6 glass-panel space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span>Supporters Wall ({supporters.length})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Live</span>
          </div>

          {supporters.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              Be the first supporter to contribute!
            </p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {supporters.map((sup, idx) => (
                <div
                  key={sup.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs hover:border-white/15 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {sup.isAnonymous ? '?' : sup.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-white flex items-center gap-1.5">
                        <span>{sup.name}</span>
                        {sup.isTopSupporter && (
                          <span
                            title="Top Supporter"
                            className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                          >
                            <Crown className="w-2.5 h-2.5" /> 👑 Top
                          </span>
                        )}
                      </p>
                      {sup.note && (
                        <p className="text-[11px] text-slate-400 italic">"{sup.note}"</p>
                      )}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">{formatINR(sup.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* "Where the Money Went" & AI Spending Story */}
      <div className="p-6 sm:p-8 glass-panel space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-cyan-400" />
              <span>Where the Money Went (Public Ledger)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Live transparency timeline of verified expenses and remaining pot balance.
            </p>
          </div>
          <AiBadge isAi={spendingStoryAi} />
        </div>

        {/* AI Spending Story Quote */}
        {spendingStory && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 via-pink-500/10 to-amber-500/10 border border-purple-500/25">
            <p className="text-xs sm:text-sm text-purple-200 leading-relaxed font-medium">
              "{spendingStory}"
            </p>
          </div>
        )}

        {/* Balance Bar & Public Transparency Strip */}
        <div className={`grid ${stats.paidOut && stats.paidOut > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-3 p-4 rounded-xl bg-white/5 border border-white/10 text-center font-mono text-xs`}>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Raised</span>
            <strong className="text-slate-900 dark:text-white text-sm">{formatINR(stats.raised)}</strong>
          </div>
          <div className="border-x border-white/10">
            <span className="text-rose-400 block text-[10px] uppercase">Spent (−)</span>
            <strong className="text-rose-400 text-sm">
              {formatINR(expenses.reduce((s, e) => s + e.amount, 0))}
            </strong>
          </div>
          {stats.paidOut && stats.paidOut > 0 && (
            <div className="border-r border-white/10">
              <span className="text-cyan-400 block text-[10px] uppercase">Disbursed (−)</span>
              <strong className="text-cyan-400 text-sm">{formatINR(stats.paidOut)}</strong>
            </div>
          )}
          <div>
            <span className="text-emerald-400 block text-[10px] uppercase">Remaining Pot (=)</span>
            <strong className="text-emerald-400 text-sm">{formatINR(balance)}</strong>
          </div>
        </div>

        {/* Public Payout Disclosure (Safeguard 2: only exposed as total without personal email) */}
        {stats.paidOut && stats.paidOut > 0 && (
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs flex items-center justify-between text-cyan-300">
            <span className="font-semibold">Paid out to organizer: {formatINR(stats.paidOut)}</span>
            <span className="text-[10px] text-cyan-200/80 font-mono">Verified Settlement</span>
          </div>
        )}

        {/* Expenses Timeline */}
        {expenses.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Recorded Expense Items
            </h4>
            <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
              {expenses.map(exp => (
                <div key={exp.id} className="p-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-white">{exp.description}</p>
                    <p className="text-[11px] text-slate-400">{exp.spentOn || 'General'}</p>
                  </div>
                  <span className="font-mono font-bold text-rose-400">−{formatINR(exp.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating "Ask the Ledger" Chat Widget Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {!chatOpen ? (
          <button
            onClick={() => setChatOpen(true)}
            className="px-4 py-3 rounded-full bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 hover:scale-105 shadow-2xl text-white font-bold text-xs flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Ask the Ledger</span>
          </button>
        ) : (
          <div className="w-80 sm:w-96 rounded-2xl glass-panel shadow-2xl border border-slate-200 dark:border-white/20 p-4 space-y-3 bg-white dark:bg-[#0d1226]/95 backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-300" />
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Ask the Ledger</h4>
                <AiBadge isAi={true} />
              </div>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages box */}
            <div className="h-60 overflow-y-auto space-y-2 p-1 text-xs">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-2.5 rounded-xl leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-br-none shadow-sm'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 text-xs italic flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-indigo-500 dark:border-slate-400 border-t-transparent rounded-full animate-spin" />
                    <span>Gemini is checking the ledger...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Suggestion Chips */}
            <div className="flex flex-wrap gap-1 text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => handleSendChat('Where was the money spent?')}
                className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-purple-300"
              >
                Where was it spent?
              </button>
              <button
                type="button"
                onClick={() => handleSendChat('How much balance is remaining?')}
                className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-purple-300"
              >
                Remaining balance?
              </button>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex gap-2 pt-1"
            >
              <input
                type="text"
                value={chatQuestion}
                onChange={e => setChatQuestion(e.target.value)}
                placeholder="Ask anything about this fund..."
                maxLength={300}
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatQuestion.trim()}
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
