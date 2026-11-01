import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Copy,
  Check,
  Share2,
  QrCode,
  Download,
  Calendar,
  Users,
  Coins,
  TrendingUp,
  Clock,
  MessageSquare,
  Wallet,
  Receipt,
  Plus,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Send,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  History,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ManageStatsResponse, CollectionTheme } from '../types';
import { THEMES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { formatINR, formatCompactINR, formatPhoneDisplay } from '../utils/currency';
import { fireFullConfetti, fireMiniConfetti } from '../utils/confetti';
import { ProgressBar } from '../components/ProgressBar';
import { AiCard, AiBadge } from '../components/AiCard';

export const ManagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [data, setData] = useState<ManageStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Tracker Tab
  const [trackerTab, setTrackerTab] = useState<'unpaid' | 'paid' | 'all'>('unpaid');
  const [searchMember, setSearchMember] = useState('');

  // AI Reminders
  const [reminderTone, setReminderTone] = useState<'Friendly' | 'Funny' | 'Formal' | 'Urgent'>('Friendly');
  const [reminders, setReminders] = useState<Array<{ memberId: string; name: string; phone?: string | null; message: string }>>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [copiedReminderId, setCopiedReminderId] = useState<string | null>(null);

  // AI Insights
  const [aiInsights, setAiInsights] = useState<{ insights: string[]; action: string; status: 'on_track' | 'at_risk' | 'behind'; ai: boolean } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expSpentOn, setExpSpentOn] = useState('');
  const [expSubmitting, setExpSubmitting] = useState(false);

  // Settlement & Payout States (Safeguards A-F)
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null);
  const [showPayoutConfirmModal, setShowPayoutConfirmModal] = useState(false);

  // Email Verification Modal States (Safeguard C)
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [emailStep, setEmailStep] = useState<'email' | 'code'>('email');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [demoCodeBanner, setDemoCodeBanner] = useState<string | null>(null);

  // Live Toast for new payments
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const prevSupporterCountRef = useRef<number>(0);

  const fetchData = async (isBackground = false) => {
    if (!id) return;
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      const res = await fetch(`/api/manage/${id}/stats`);
      if (res.ok) {
        const json: ManageStatsResponse = await res.json();
        // Detect newly arrived payment
        if (prevSupporterCountRef.current > 0 && json.stats.supportersCount > prevSupporterCountRef.current) {
          const newest = json.payments[0];
          if (newest) {
            setLiveToast(`🎉 ${newest.payerName} just contributed ${formatINR(newest.amount)}!`);
            fireMiniConfetti();
            setTimeout(() => setLiveToast(null), 4000);
          }
        }
        prevSupporterCountRef.current = json.stats.supportersCount;
        setData(json);
      }
    } catch (e) {
      console.error('Fetch manage stats error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 5-second polling interval (paused when page hidden)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  // Load AI Insights
  const fetchAiInsights = async () => {
    if (!id) return;
    try {
      setInsightsLoading(true);
      const res = await fetch(`/api/manage/${id}/ai/insights`);
      if (res.ok) {
        const json = await res.json();
        setAiInsights(json);
      }
    } catch (e) {
      console.error('AI insights error:', e);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    if (data) {
      fetchAiInsights();
      fetchReminders();
    }
  }, [id, data?.collection.id]);

  // Generate Reminders
  const fetchReminders = async (tone = reminderTone) => {
    if (!id) return;
    try {
      setRemindersLoading(true);
      const res = await fetch(`/api/manage/${id}/ai/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone, offset: 0 }),
      });
      if (res.ok) {
        const json = await res.json();
        setReminders(json.reminders || []);
      }
    } catch (e) {
      console.error('Reminders error:', e);
    } finally {
      setRemindersLoading(false);
    }
  };

  // Toggle Collection Active / Closed
  const handleToggleStatus = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/manage/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        await fetchData(true);
      }
    } catch (e) {
      console.error('Toggle status error:', e);
    }
  };

  // Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !expDescription.trim() || !expAmount) return;

    try {
      setExpSubmitting(true);
      const res = await fetch(`/api/manage/${id}/expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: expDescription.trim(),
          amount: parseFloat(expAmount),
          spentOn: expSpentOn.trim(),
        }),
      });
      if (res.ok) {
        setExpDescription('');
        setExpAmount('');
        setExpSpentOn('');
        setShowExpenseModal(false);
        await fetchData(true);
      }
    } catch (e) {
      console.error('Add expense error:', e);
    } finally {
      setExpSubmitting(false);
    }
  };

  // Start Email Verification (Safeguard C)
  const handleStartEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    try {
      setEmailLoading(true);
      setEmailError(null);
      setEmailSuccess(null);
      const res = await fetch('/api/me/paypal-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const resData = await res.json();
      if (!res.ok) {
        setEmailError(resData.error || 'Failed to start verification.');
      } else if (resData.verified) {
        setEmailSuccess(resData.message || 'Email verified successfully via Google account!');
        setTimeout(() => {
          setShowEmailModal(false);
          fetchData(true);
        }, 1200);
      } else {
        setEmailStep('code');
        if (resData.demoCode) {
          setDemoCodeBanner(resData.demoCode);
          setVerifyCode(resData.demoCode);
        }
        setEmailSuccess(resData.message || 'Verification code sent to your email.');
      }
    } catch (e) {
      setEmailError('Network error starting email verification.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Submit Verification Code (Safeguard C)
  const handleSubmitVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;
    try {
      setEmailLoading(true);
      setEmailError(null);
      setEmailSuccess(null);
      const res = await fetch('/api/me/paypal-email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      const resData = await res.json();
      if (!res.ok) {
        setEmailError(resData.error || 'Invalid code.');
      } else {
        setEmailSuccess(resData.message || 'Email verified successfully!');
        setTimeout(() => {
          setShowEmailModal(false);
          setEmailStep('email');
          setEmailInput('');
          setVerifyCode('');
          setDemoCodeBanner(null);
          fetchData(true);
        }, 1500);
      }
    } catch (e) {
      setEmailError('Network error submitting verification code.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Initiate Payout (Triggers Confirmation Modal)
  const handleRequestPayoutPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !data) return;
    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt < 100) {
      setPayoutMessage('❌ Minimum payout amount is ₹100.');
      return;
    }
    if (amt > data.stats.available) {
      setPayoutMessage(`❌ Amount exceeds available balance of ${formatINR(data.stats.available)}.`);
      return;
    }
    setShowPayoutConfirmModal(true);
  };

  // Execute Payout (Safeguards A, B, D, E, F - Server Decides Destination)
  const handleExecutePayout = async () => {
    if (!id || !payoutAmount || !data) return;

    try {
      setPayoutSubmitting(true);
      setPayoutMessage(null);
      setShowPayoutConfirmModal(false);

      // SAFEGUARD A: Fixed destination. The browser NEVER sends an email or destination!
      const res = await fetch(`/api/manage/${id}/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(payoutAmount),
        }),
      });
      const resData = await res.json();
      if (res.ok) {
        fireFullConfetti();
        setPayoutMessage(
          resData.isSimulated
            ? `✅ Simulated payout of ₹${parseFloat(payoutAmount).toLocaleString('en-IN')} sent to ${resData.destinationEmailMasked} (Sandbox mode).`
            : `✅ Live PayPal payout of ₹${parseFloat(payoutAmount).toLocaleString('en-IN')} dispatched to ${resData.destinationEmailMasked}!`
        );
        setPayoutAmount('');
        await fetchData(true);
      } else {
        setPayoutMessage(`❌ ${resData.error || 'Payout request failed.'}`);
      }
    } catch (e) {
      setPayoutMessage('❌ Network error processing payout.');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const copyShareLink = () => {
    if (!data) return;
    const url = `${window.location.origin}/c/${data.collection.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyReminderText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReminderId(id);
    setTimeout(() => setCopiedReminderId(null), 2000);
  };

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-40 bg-white/5 rounded-3xl" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const { collection, group, stats, forecast, timeline, payments, paidMembers, unpaidMembers, expenses, payouts } = data;
  const themeConfig = THEMES[collection.theme] || THEMES.aurora;
  const publicUrl = `${window.location.origin}/c/${collection.slug}`;

  // Doughnut Chart Data (Paid vs Unpaid)
  const doughnutData = [
    { name: 'Paid', value: stats.totalMembers - stats.unpaidCount, color: '#34D399' },
    { name: 'Unpaid', value: stats.unpaidCount, color: '#FBBF24' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Live Payment Toast Notification */}
      {liveToast && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="font-semibold text-xs sm:text-sm">{liveToast}</span>
        </div>
      )}

      {/* Top Themed Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl relative overflow-hidden glass-panel border border-white/10">
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${themeConfig.gradient}`} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-600/15 via-transparent to-transparent pointer-events-none -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2.5 rounded-2xl bg-white/5 border border-white/10">
                {collection.emoji}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{collection.title}</h1>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      collection.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}
                  >
                    {collection.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {group.name} · {collection.mode === 'fixed' ? `Fixed Share ₹${collection.fixedAmount}/head` : 'Goal Target Pool'}
                </p>
              </div>
            </div>

            {/* Public Link Box */}
            <div className="flex items-center gap-2 text-xs pt-1">
              <span className="text-slate-400">Public Link:</span>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-indigo-300 hover:text-white flex items-center gap-1 underline"
              >
                <span>/c/{collection.slug}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={copyShareLink}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Copy share link"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleToggleStatus}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1.5 transition-all"
            >
              {collection.status === 'active' ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Close Fund</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Re-open Fund</span>
                </>
              )}
            </button>

            <a
              href={`/api/qr/${collection.slug}.png?download=1`}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>QR PNG</span>
            </a>

            <a
              href={`/api/manage/${collection.id}/export.csv`}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>

            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
              title="Refresh stats"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="font-bold text-white text-base">
              {formatINR(stats.raised)}{' '}
              <span className="text-slate-400 text-xs font-normal">raised of {formatINR(stats.target)}</span>
            </span>
            <span className="text-emerald-400 font-extrabold text-sm">{stats.percent}% Funded</span>
          </div>
          <ProgressBar percent={stats.percent} theme={collection.theme} height={14} />
        </div>
      </div>

      {/* 6 Key Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 glass-panel text-center">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Raised</p>
          <p className="text-xl font-extrabold font-mono text-emerald-400 mt-1">
            {formatCompactINR(stats.raised)}
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{formatINR(stats.raised)}</p>
        </div>

        <div className="p-4 glass-panel text-center">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Target</p>
          <p className="text-xl font-extrabold font-mono text-white mt-1">
            {formatCompactINR(stats.target)}
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{formatINR(stats.target)}</p>
        </div>

        <div className="p-4 glass-panel text-center">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Funded %</p>
          <p className="text-xl font-extrabold font-mono text-indigo-400 mt-1">
            {stats.percent}%
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">of goal</p>
        </div>

        <div className="p-4 glass-panel text-center">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Supporters</p>
          <p className="text-xl font-extrabold font-mono text-cyan-400 mt-1">
            {stats.supportersCount}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">completed</p>
        </div>

        <div className="p-4 glass-panel text-center">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Unpaid</p>
          <p className="text-xl font-extrabold font-mono text-amber-400 mt-1">
            {stats.unpaidCount}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">of {stats.totalMembers}</p>
        </div>

        <div className="p-4 glass-panel text-center">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Days Left</p>
          <p className="text-xl font-extrabold font-mono text-white mt-1">
            {stats.daysLeft}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">days</p>
        </div>
      </div>

      {/* ✨ AI Insights & Forecast Card */}
      <AiCard isAi={aiInsights?.ai ?? true} title="✨ AI Forecast & Actionable Insights">
        {insightsLoading ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-purple-200">Gemini is analyzing payment velocity and projections...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3 font-mono text-xs text-slate-300">
                <span>
                  Velocity:{' '}
                  <strong className="text-white">
                    {formatINR(Math.round(forecast.pacePerDay))}/day
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Projected Total:{' '}
                  <strong className="text-emerald-400 font-bold">
                    {formatINR(forecast.projectedTotal)}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Completion:{' '}
                  <strong className="text-white">{forecast.projectedCompletionDate}</strong>
                </span>
              </div>

              {/* Status Chip */}
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  forecast.status === 'on_track'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : forecast.status === 'at_risk'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {forecast.status.replace('_', ' ')}
              </span>
            </div>

            {/* 3 Plain-English Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(aiInsights?.insights || [
                `Raised ${formatINR(stats.raised)} (${stats.percent}% of target).`,
                `Velocity is ${formatINR(Math.round(forecast.pacePerDay))}/day across ${stats.supportersCount} supporters.`,
                `${stats.daysLeft} days remaining before the deadline.`,
              ]).map((text, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200">
                  <span className="text-indigo-400 font-bold mr-1.5">#{i + 1}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* High Impact Action */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-violet-500/10 via-pink-500/10 to-amber-500/10 border border-purple-500/25 flex items-start gap-2 text-xs">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-purple-200">Recommended Action:</span>
                <p className="text-purple-100 mt-0.5">
                  {aiInsights?.action ||
                    `Send targeted WhatsApp reminders to the ${stats.unpaidCount} unpaid members.`}
                </p>
              </div>
            </div>
          </div>
        )}
      </AiCard>

      {/* Charts Section: Cumulative Line + Paid/Unpaid Doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cumulative Raised Area Chart */}
        <div className="lg:col-span-2 p-6 glass-panel space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Cumulative Collections Growth (₹)</span>
              </h3>
              <p className="text-[11px] text-slate-400">Daily trajectory of received payments</p>
            </div>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34D399" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke={isDark ? '#94A3B8' : '#64748B'}
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }}
                />
                <YAxis
                  stroke={isDark ? '#94A3B8' : '#64748B'}
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }}
                  tickFormatter={v => formatCompactINR(v)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-2.5 text-xs font-mono shadow-xl rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1226] space-y-1">
                          <p className="text-slate-500 dark:text-slate-400">{d.date}</p>
                          <p className="text-emerald-600 dark:text-emerald-400 font-bold">Total: {formatINR(d.cumulative)}</p>
                          <p className="text-slate-700 dark:text-slate-300">Added: {formatINR(d.amount)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#34D399"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Paid vs Unpaid Doughnut Chart */}
        <div className="p-6 glass-panel space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Roster Participation</span>
            </h3>
            <p className="text-[11px] text-slate-400">Paid supporters vs pending members</p>
          </div>

          <div className="h-44 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={doughnutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {doughnutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="font-mono text-xl font-extrabold text-white">
                {stats.totalMembers > 0
                  ? Math.round(((stats.totalMembers - stats.unpaidCount) / stats.totalMembers) * 100)
                  : 0}
                %
              </span>
              <span className="text-[9px] uppercase font-bold text-slate-400">Roster Paid</span>
            </div>
          </div>

          <div className="flex justify-around text-xs font-mono pt-2 border-t border-white/10">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{stats.totalMembers - stats.unpaidCount} Paid</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{stats.unpaidCount} Unpaid</span>
            </span>
          </div>
        </div>
      </div>

      {/* ✨ AI Smart Reminders Panel */}
      <AiCard isAi={true} title="💬 AI WhatsApp Reminders">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-300">
              Personalized reminder drafts for your {unpaidMembers.length} unpaid members.
            </p>

            {/* Tone Selector */}
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10 text-xs">
              {(['Friendly', 'Funny', 'Formal', 'Urgent'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setReminderTone(t);
                    fetchReminders(t);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    reminderTone === t
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {remindersLoading ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-purple-200">Gemini is drafting {reminderTone.toLowerCase()} reminders...</p>
            </div>
          ) : reminders.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              🎉 Everyone on the roster has paid! No reminders needed.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {reminders.slice(0, 6).map((rem, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{rem.name}</span>
                      {rem.phone && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatPhoneDisplay(rem.phone)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 font-mono bg-black/20 p-2 rounded-lg leading-relaxed">
                      "{rem.message}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      onClick={() => copyReminderText(rem.message, rem.memberId)}
                      className="px-2 py-1 rounded-lg text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 flex items-center gap-1 text-[11px]"
                    >
                      {copiedReminderId === rem.memberId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedReminderId === rem.memberId ? 'Copied' : 'Copy'}</span>
                    </button>

                    {rem.phone ? (
                      <a
                        href={`https://wa.me/${rem.phone}?text=${encodeURIComponent(rem.message)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 text-[11px] shadow-sm"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send WhatsApp</span>
                      </a>
                    ) : (
                      <button
                        onClick={() => copyReminderText(rem.message, rem.memberId)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 text-[11px]"
                      >
                        Copy for DM
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AiCard>

      {/* Paid / Unpaid Tracker Table */}
      <div className="p-6 glass-panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-white">Paid / Unpaid Member Tracker</h3>
            <p className="text-xs text-slate-400">Search and track each member's payment status</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setTrackerTab('unpaid')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  trackerTab === 'unpaid'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unpaid ({unpaidMembers.length})
              </button>
              <button
                onClick={() => setTrackerTab('paid')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  trackerTab === 'paid'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Paid ({paidMembers.length})
              </button>
              <button
                onClick={() => setTrackerTab('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  trackerTab === 'all'
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({stats.totalMembers})
              </button>
            </div>

            <input
              type="text"
              value={searchMember}
              onChange={e => setSearchMember(e.target.value)}
              placeholder="Filter names..."
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-36 sm:w-48"
            />
          </div>
        </div>

        <div className="border border-white/10 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white/5 text-slate-400 sticky top-0 backdrop-blur-md">
              <tr>
                <th className="p-3">Member Name</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Status</th>
                <th className="p-3">Amount</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {/* Unpaid rows */}
              {(trackerTab === 'unpaid' || trackerTab === 'all') &&
                unpaidMembers
                  .filter(m => m.name.toLowerCase().includes(searchMember.toLowerCase()))
                  .map(m => (
                    <tr key={m.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-white">{m.name}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">
                        {m.phone ? formatPhoneDisplay(m.phone) : (m.email || '—')}
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Pending
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">
                        ₹{collection.fixedAmount || '—'}
                      </td>
                      <td className="p-3 text-right">
                        {m.phone ? (
                          <a
                            href={`https://wa.me/${m.phone}?text=${encodeURIComponent(`Hi ${m.name.split(' ')[0]}! Quick reminder to pay ₹${collection.fixedAmount || 500} for "${collection.title}": ${publicUrl}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px] inline-flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Remind</span>
                          </a>
                        ) : (
                          <button
                            onClick={() => copyShareLink()}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px]"
                          >
                            Copy Link
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

              {/* Paid rows */}
              {(trackerTab === 'paid' || trackerTab === 'all') &&
                paidMembers
                  .filter(m => m.name.toLowerCase().includes(searchMember.toLowerCase()))
                  .map(m => (
                    <tr key={m.id} className="hover:bg-white/[0.02] bg-emerald-500/[0.02]">
                      <td className="p-3 font-semibold text-white">{m.name}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">
                        {m.phone ? formatPhoneDisplay(m.phone) : (m.email || '—')}
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max">
                          <Check className="w-2.5 h-2.5" /> Paid
                        </span>
                      </td>
                      <td className="p-3 font-mono text-emerald-400 font-bold">
                        {formatINR(m.amountPaid)}
                      </td>
                      <td className="p-3 text-right text-[11px] text-slate-500 font-mono">
                        {new Date(m.paidAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spending Ledger & Settlement Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Spending Ledger */}
        <div className="lg:col-span-7 p-6 glass-panel space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-cyan-400" />
                <span>"Where the Money Went" Ledger</span>
              </h3>
              <p className="text-xs text-slate-400">
                Post expenses to show full transparent accounting on the public page.
              </p>
            </div>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </button>
          </div>

          {/* Formula Strip: Raised - Spent = Balance */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 grid grid-cols-3 gap-2 text-center font-mono">
            <div>
              <p className="text-[10px] text-slate-400 uppercase">Total Collected</p>
              <p className="text-base font-bold text-white mt-1">{formatINR(stats.raised)}</p>
            </div>
            <div className="border-x border-white/10">
              <p className="text-[10px] text-rose-400 uppercase">Total Spent (−)</p>
              <p className="text-base font-bold text-rose-400 mt-1">{formatINR(stats.spent)}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-400 uppercase">Pot Balance (=)</p>
              <p className="text-base font-bold text-emerald-400 mt-1">
                {formatINR(Math.max(0, stats.raised - stats.spent))}
              </p>
            </div>
          </div>

          {/* Expense Timeline List */}
          {expenses.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              No expenses posted yet. Every rupee raised is still in the pot.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {expenses.map(exp => (
                <div
                  key={exp.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">{exp.description}</p>
                    <p className="text-[11px] text-slate-400">{exp.spentOn || 'General expense'}</p>
                  </div>
                  <div className="text-right font-mono">
                    <p className="font-bold text-rose-400">−{formatINR(exp.amount)}</p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(exp.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settlement & Payout Card (Safeguards A-F) */}
        <div className="lg:col-span-5 p-6 glass-panel space-y-4 border border-indigo-500/25">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Settlement & Payout</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Safe organizer payout destination governed by server rules
              </p>
            </div>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Safeguards Active">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>

          {/* Row 1: Payout PayPal account row with status badge */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Payout PayPal account</span>
              {data.payoutConfig?.paypalEmailVerified ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Verified ✅
                </span>
              ) : data.payoutConfig?.pendingPaypalEmail ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Pending code ⏳
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Not set ⚠️
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-xs font-semibold text-white">
                {data.payoutConfig?.paypalEmailVerified
                  ? data.payoutConfig.paypalEmailMasked
                  : data.payoutConfig?.pendingPaypalEmail
                  ? `Pending: ${data.payoutConfig.pendingPaypalEmail}`
                  : 'No verified PayPal account'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEmailError(null);
                  setEmailSuccess(null);
                  setDemoCodeBanner(null);
                  setEmailStep(data.payoutConfig?.pendingPaypalEmail ? 'code' : 'email');
                  setShowEmailModal(true);
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-colors"
              >
                {data.payoutConfig?.paypalEmailVerified ? 'Change' : 'Set Account'}
              </button>
            </div>
          </div>

          {/* Safeguard D: 24-hour cooling notice banner */}
          {data.payoutConfig?.coolingActive && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400 animate-pulse" />
              <div>
                <p className="font-bold">24-Hour Security Pause Active</p>
                <p className="text-[11px] text-amber-200/90 mt-0.5">
                  Payouts are paused for {data.payoutConfig.coolingHoursLeft}h after changing your PayPal email, for your protection.
                </p>
              </div>
            </div>
          )}

          {/* Available for Payout Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/25">
            <p className="text-xs uppercase font-semibold text-emerald-400">Available for Payout</p>
            <p className="text-3xl font-extrabold font-mono text-white mt-1">
              {formatINR(stats.available)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Collected ({formatINR(stats.raised)}) − Expenses ({formatINR(stats.spent)}) − Paid Out ({formatINR(stats.paidOut || 0)})
            </p>
          </div>

          {payoutMessage && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-medium">
              {payoutMessage}
            </div>
          )}

          {/* Blocked Reason Plain Text */}
          {!data.payoutConfig?.canRequestPayout && (
            <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 text-xs space-y-2">
              <div className="flex items-start gap-2 text-slate-300">
                <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="font-medium">{data.payoutConfig?.blockedReason}</p>
              </div>
              {collection.status === 'active' && (
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  className="w-full py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow"
                >
                  Close Fund to Enable Payout
                </button>
              )}
            </div>
          )}

          {/* Payout Request Form (Fixed Destination: Server Decides Destination) */}
          <form onSubmit={handleRequestPayoutPrompt} className="space-y-3 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-300">Payout Amount (₹)</label>
                <span className="text-[11px] text-slate-400 font-mono">Min ₹100</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  max={stats.available}
                  min={100}
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  placeholder={`Max ${stats.available}`}
                  disabled={!data.payoutConfig?.canRequestPayout}
                  required
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={!data.payoutConfig?.canRequestPayout}
                  onClick={() => setPayoutAmount(String(stats.available))}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-slate-300 font-mono font-semibold disabled:opacity-50"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Small Security Line (Mandated in Addendum v4.1 Section 5) */}
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 italic">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Payouts only go to your verified PayPal account.</span>
            </p>

            <button
              type="submit"
              disabled={payoutSubmitting || !data.payoutConfig?.canRequestPayout || stats.available < 100}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              {payoutSubmitting ? 'Processing Payout...' : 'Request Payout to PayPal'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Payout History List */}
          {payouts.length > 0 && (
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Payout History</p>
              {payouts.map(po => (
                <div key={po.id} className="p-2.5 rounded-xl bg-white/5 text-[11px] flex justify-between items-center border border-white/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{formatINR(po.amount)}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                        {po.isSimulated ? 'Simulated (sandbox)' : 'Sent'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">
                      → {po.destinationEmailMasked || po.paypalEmail}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(po.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Activity List under Payout History, built from auditLogs (Mandated in Addendum v4.1 Section 5) */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-400" />
                <span>Security & Payout Activity</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">Audit Log</span>
            </div>

            {(!data.activity || data.activity.length === 0) ? (
              <p className="text-[11px] text-slate-500 italic py-2 text-center">No security actions recorded yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {data.activity.map(act => {
                  let badgeColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                  let label = act.type.replace(/_/g, ' ');

                  if (act.type === 'payout_sent') {
                    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
                    label = 'Payout Sent';
                  } else if (act.type === 'payout_requested') {
                    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/25';
                    label = 'Payout Requested';
                  } else if (act.type === 'paypal_email_verified') {
                    badgeColor = 'bg-teal-500/10 text-teal-400 border-teal-500/25';
                    label = 'Email Verified';
                  } else if (act.type === 'paypal_email_set') {
                    badgeColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25';
                    label = 'Email Set';
                  } else if (act.type === 'payout_blocked' || act.type === 'payout_failed') {
                    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/25';
                    label = act.type === 'payout_blocked' ? 'Payout Blocked' : 'Payout Failed';
                  }

                  return (
                    <div key={act.id} className="p-2 rounded-lg bg-white/5 border border-white/5 text-[10px] flex items-center justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase tracking-tight text-[9px] border ${badgeColor}`}>
                            {label}
                          </span>
                          {act.amount && (
                            <span className="font-mono font-bold text-white">{formatINR(act.amount)}</span>
                          )}
                        </div>
                        <p className="text-slate-400 truncate">{act.reason}</p>
                      </div>
                      <span className="text-slate-500 font-mono text-[9px] shrink-0">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Payout (Mandated in Addendum v4.1 Section 5) */}
      {showPayoutConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel max-w-md w-full p-6 space-y-4 border border-white/20 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Confirm Payout Request</h3>
                <p className="text-xs text-slate-400">Fixed destination verification</p>
              </div>
            </div>

            {/* Exact required text from Addendum v4.1 Section 5 */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <p className="text-sm font-semibold text-white leading-relaxed">
                Send {formatINR(parseFloat(payoutAmount))} to {data.payoutConfig?.paypalEmailMasked}? This account is verified and cannot be changed in this request.
              </p>
              <p className="text-xs text-slate-400 italic">
                Payouts only go to your verified PayPal account.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPayoutConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePayout}
                disabled={payoutSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
              >
                {payoutSubmitting ? 'Processing...' : 'Confirm & Dispatch Payout'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Verification Modal (Safeguard C: Email verification flow) */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel max-w-md w-full p-6 space-y-4 border border-white/20 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Verify PayPal Payout Account</h3>
                  <p className="text-[11px] text-slate-400">Safeguard C: 2-step verification & cooling</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            {emailError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {emailError}
              </div>
            )}

            {emailSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{emailSuccess}</span>
              </div>
            )}

            {/* Step 1: Input Email */}
            {emailStep === 'email' ? (
              <form onSubmit={handleStartEmailVerification} className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your PayPal account email. If it matches your Google sign-in email, it is verified immediately. Otherwise, a 6-digit confirmation code will be sent.
                </p>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">PayPal Account Email</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="e.g. organizer@paypal.com"
                    required
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Security Notice:</p>
                  <p>• Changing your verified email activates a 24-hour security cooling period on payouts.</p>
                  <p>• Payouts can only be disbursed to this verified address.</p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
                  >
                    {emailLoading ? 'Verifying...' : 'Continue'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Input 6-Digit Code */
              <form onSubmit={handleSubmitVerifyCode} className="space-y-3">
                <p className="text-xs text-slate-300">
                  Enter the 6-digit code sent to verify this PayPal address.
                </p>

                {/* Demo Mode Banner (Required by Addendum v4.1 Safeguard C.2) */}
                {demoCodeBanner && (
                  <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                        Demo mode: in production this code is emailed
                      </span>
                      <button
                        type="button"
                        onClick={() => setVerifyCode(demoCodeBanner)}
                        className="text-[10px] text-indigo-400 underline font-semibold hover:text-indigo-200"
                      >
                        Auto-fill
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold tracking-widest text-indigo-300 bg-white/5 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                        {demoCodeBanner}
                      </span>
                      <span className="text-[11px] text-slate-400">Click Auto-fill or type above</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">6-Digit Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full text-center text-lg tracking-[0.3em] font-mono font-bold rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 text-center">Valid for 10 minutes · Max 5 attempts</p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setEmailStep('email')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    ← Change Email
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEmailModal(false)}
                      className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={emailLoading || verifyCode.length !== 6}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5"
                    >
                      {emailLoading ? 'Verifying...' : 'Verify Code'}
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel max-w-md w-full p-6 space-y-4 border border-white/20">
            <h3 className="font-bold text-base text-white">Record New Expense</h3>
            <p className="text-xs text-slate-400">
              Deducts from available settlement balance and updates public transparency timeline.
            </p>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Expense Title</label>
                <input
                  type="text"
                  value={expDescription}
                  onChange={e => setExpDescription(e.target.value)}
                  placeholder="e.g. Venue booking deposit, DJ sound system"
                  required
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Amount (₹)</label>
                <input
                  type="number"
                  min={1}
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                  placeholder="1500"
                  required
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Item Details / Vendor</label>
                <input
                  type="text"
                  value={expSpentOn}
                  onChange={e => setExpSpentOn(e.target.value)}
                  placeholder="e.g. Paid to Royal Banquet Hall"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                >
                  {expSubmitting ? 'Posting...' : 'Post Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
