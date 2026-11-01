import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  QrCode,
  TrendingUp,
  MessageSquare,
  Wallet,
  Zap,
  Globe2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ProgressRing } from '../components/ProgressRing';
import { formatINR } from '../utils/currency';

export const LandingPage: React.FC = () => {
  const { user, loginAsDemo } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const handleStart = () => {
    if (!user) {
      loginAsDemo();
    }
    navigate('/dashboard');
  };

  const tickerItems = [
    'Priya just paid ₹500 · Farewell Party Fund',
    'Maria F. (Spain) contributed ₹25,00,000 · TechNova Sponsorship',
    'Rohan paid ₹6,000 · Goa Trip',
    'Anonymous gave ₹1,000 · Diwali House Party',
    'James O. (Kenya) contributed ₹10,000 · TechNova Sponsorship',
  ];

  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* Background Aurora Blobs */}
      <div
        className={`absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full blur-[130px] pointer-events-none -z-10 animate-pulse-glow ${
          isDark ? 'bg-violet-600/20' : 'bg-violet-400/15'
        }`}
      />
      <div
        className={`absolute top-[20%] right-[10%] w-[450px] h-[450px] rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-glow ${
          isDark ? 'bg-cyan-500/20' : 'bg-cyan-400/15'
        }`}
      />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Badges Strip */}
            <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isDark
                    ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                Powered by PayPal
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isDark
                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/25'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                ✨ Powered by Gemini AI
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isDark
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                🇮🇳 Made for India (₹)
              </span>
            </div>

            {/* Main Headline */}
            <h1
              className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              From 5 friends to 5,000 students,{' '}
              <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
                one link
              </span>{' '}
              collects it all.
            </h1>

            {/* Subline */}
            <p
              className={`text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed ${
                isDark ? 'text-slate-300' : 'text-slate-600 font-medium'
              }`}
            >
              Describe it. AI sets it up. Share one link or QR code. Members pay with PayPal in rupees. Live tracker shows who paid, and Gemini AI drafts personalized WhatsApp nudges.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                onClick={handleStart}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                to="/c/cs-farewell-2026"
                className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm border flex items-center justify-center gap-2 transition-all ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                }`}
              >
                <span>View Live Demo Collection</span>
              </Link>
            </div>

            <p
              className={`text-xs flex items-center justify-center lg:justify-start gap-2 pt-1 ${
                isDark ? 'text-slate-400' : 'text-slate-500 font-medium'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>No PayPal login required for members · Instant demo mode ready</span>
            </p>
          </div>

          {/* Right Floating Glass Mock Card */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div
              className={`w-full max-w-md p-6 glass-panel relative border transition-all duration-500 transform hover:-translate-y-1 ${
                isDark
                  ? 'shadow-2xl shadow-indigo-950/40 border-white/15 hover:border-indigo-500/40'
                  : 'bg-white shadow-xl shadow-slate-900/10 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-xl flex items-center justify-center border border-pink-500/30">
                    🎉
                  </div>
                  <div>
                    <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Farewell Party Fund
                    </h3>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      CS Batch 2026 · Fixed ₹500/head
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>

              {/* Progress Body */}
              <div className="py-6 flex items-center justify-between gap-6">
                <div className="space-y-1">
                  <p className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Total Raised
                  </p>
                  <p className={`text-3xl font-extrabold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {formatINR(4000)}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    of ₹6,000 target · 8 of 12 paid
                  </p>
                </div>
                <ProgressRing percent={67} size={110} strokeWidth={9} theme="candy" />
              </div>

              {/* AI Insight Bubble */}
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  isDark
                    ? 'bg-gradient-to-r from-violet-500/15 via-pink-500/15 to-amber-500/15 border-purple-500/30'
                    : 'bg-purple-50/70 border-purple-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-purple-200' : 'text-purple-900'}`}>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Gemini AI Forecast</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    On track
                  </span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-purple-200/90' : 'text-purple-800'}`}>
                  "Pace is ₹660/day. You are on track to complete funding 4 days before deadline. 4 members pending."
                </p>
              </div>

              {/* Recent supporter pill */}
              <div
                className={`mt-4 flex items-center justify-between text-xs pt-3 border-t ${
                  isDark ? 'border-white/10 text-slate-300' : 'border-slate-100 text-slate-600'
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Priya Patel just paid ₹500</span>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">2m ago</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee Ticker */}
      <div
        className={`w-full border-y py-3 overflow-hidden backdrop-blur-sm ${
          isDark
            ? 'bg-white/[0.03] border-white/10'
            : 'bg-slate-100/80 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
          {tickerItems.concat(tickerItems).map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs font-mono font-medium ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Animated Stat Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6 glass-panel">
            <p className="text-3xl sm:text-4xl font-extrabold font-mono bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              5,000+
            </p>
            <p className={`text-sm font-bold mt-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Students & Members
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Handled smoothly with bulk import and self-join links
            </p>
          </div>

          <div className="p-6 glass-panel">
            <p className="text-3xl sm:text-4xl font-extrabold font-mono bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              ₹0 Chasing
            </p>
            <p className={`text-sm font-bold mt-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Zero Awkward Follow-ups
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Gemini AI writes tone-crafted WhatsApp reminders
            </p>
          </div>

          <div className="p-6 glass-panel">
            <p className="text-3xl sm:text-4xl font-extrabold font-mono bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              100%
            </p>
            <p className={`text-sm font-bold mt-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Transparent Public Ledger
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Where the money went, remaining balance & AI Q&A
            </p>
          </div>
        </div>
      </section>

      {/* How it Works (5 Steps) */}
      <section
        className={`max-w-7xl mx-auto px-4 sm:px-6 py-16 border-t ${
          isDark ? 'border-white/10' : 'border-slate-200'
        }`}
      >
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className={`text-2xl sm:text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            How CollectIt Works
          </h2>
          <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            No messy spreadsheets, no screenshot verification, no bank statement hunting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            {
              step: '01',
              title: 'Add People in Bulk',
              desc: 'Paste from Excel, upload CSV, or share a /join QR link for 5,000+ member fests.',
              icon: Users,
            },
            {
              step: '02',
              title: 'Describe it to AI',
              desc: 'Type "farewell party for 30 friends around ₹15,000" and Gemini sets up target, share & deadline.',
              icon: Sparkles,
            },
            {
              step: '03',
              title: 'Share One Link',
              desc: 'Send a single themed link or QR code to the group chat or print on campus posters.',
              icon: QrCode,
            },
            {
              step: '04',
              title: 'Members Pay via PayPal',
              desc: 'Zero account friction. Fixed or custom amounts in ₹ converted seamlessly into checkout.',
              icon: Wallet,
            },
            {
              step: '05',
              title: 'AI Nudges & Ledger',
              desc: 'Live paid/unpaid list, AI WhatsApp reminders, expense breakdown, and one-click payout.',
              icon: TrendingUp,
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="p-5 glass-panel relative group hover:border-indigo-500/40 transition-all"
              >
                <span
                  className={`font-mono text-2xl font-black transition-colors ${
                    isDark
                      ? 'text-white/20 group-hover:text-indigo-400/40'
                      : 'text-slate-300 group-hover:text-indigo-600/40'
                  }`}
                >
                  {item.step}
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center my-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {item.title}
                </h4>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bento Grid Features */}
      <section
        className={`max-w-7xl mx-auto px-4 sm:px-6 py-16 border-t ${
          isDark ? 'border-white/10' : 'border-slate-200'
        }`}
      >
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            Engineered for Hackathons & Real Life
          </span>
          <h2 className={`text-2xl sm:text-3xl font-extrabold mt-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Six Real AI Features + Full PayPal v2 Integration
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: AI Creator */}
          <div className="p-6 glass-panel space-y-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              ✨ AI Collection Creator
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Describe your event in plain English. Gemini auto-calculates per-head fixed shares, sets deadline, picks the color theme, and writes a warm purpose blurb.
            </p>
          </div>

          {/* Card 2: AI Smart Reminders */}
          <div className="p-6 glass-panel space-y-3">
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              💬 AI WhatsApp Reminders
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Tone selector (Friendly / Funny / Formal / Urgent). One-click personalized WhatsApp message with deep link for each unpaid friend or student.
            </p>
          </div>

          {/* Card 3: AI Insights & Forecast */}
          <div className="p-6 glass-panel space-y-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              📈 AI Forecast & Insights
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Computes daily velocity and projected completion date. Translates math into 3 sharp human observations and an actionable recommendation.
            </p>
          </div>

          {/* Card 4: AI Member Clean-up */}
          <div className="p-6 glass-panel space-y-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              🧹 AI Member Clean-up
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Takes messy unstructured text with bullets, emojis, and phone numbers and outputs clean, capitalized names with validated 10-digit phone tags.
            </p>
          </div>

          {/* Card 5: Ask the Ledger Assistant */}
          <div className="p-6 glass-panel space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Globe2 className="w-5 h-5" />
            </div>
            <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              🤖 "Ask the Ledger" Chat
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Public floating assistant on the pay page. Answers queries like "where was the money spent?" or "how much is left?" strictly from public ledger data.
            </p>
          </div>

          {/* Card 6: Settlement & Payout */}
          <div className="p-6 glass-panel space-y-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              💸 PayPal Settlement & Payout
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Full cycle: funds collected into CollectIt escrow, expenses deducted, and remaining balance settled out to the Lead's PayPal email.
            </p>
          </div>
        </div>
      </section>

      {/* Built with PayPal + AI Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div
          className={`rounded-3xl p-8 sm:p-12 relative overflow-hidden border ${
            isDark
              ? 'bg-gradient-to-r from-violet-900/40 via-indigo-900/40 to-cyan-900/30 border-white/15'
              : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 text-white border-transparent shadow-xl shadow-indigo-600/20'
          }`}
        >
          <div className="max-w-2xl space-y-4">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Ready to collect without the headache?
            </h3>
            <p className="text-sm text-indigo-100 leading-relaxed font-medium">
              CollectIt is completely functional with sample datasets pre-loaded. Test the AI Collection Creator, simulate payments, or connect your PayPal sandbox credentials.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={handleStart}
                className="px-6 py-3 rounded-xl text-sm font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all"
              >
                Launch Lead Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
