import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Users,
  Coins,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  RotateCcw,
  BarChart3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatINR, formatCompactINR } from '../utils/currency';
import { THEMES } from '../utils/theme';
import { CollectionTheme } from '../types';

interface DashboardData {
  summary: {
    totalRaised: number;
    activeCollections: number;
    supporters: number;
    pendingMembers: number;
  };
  groups: Array<{
    id: string;
    name: string;
    type: string;
    emoji: string;
    memberCount: number;
    collectionsCount: number;
    totalRaised: number;
  }>;
  collections: Array<{
    id: string;
    title: string;
    slug: string;
    emoji: string;
    theme: CollectionTheme;
    mode: 'goal' | 'fixed';
    status: 'active' | 'closed';
    raised: number;
    target: number;
    percent: number;
  }>;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Fetch dashboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      if (res.ok) {
        await fetchDashboard();
      }
    } catch (e) {
      console.error('Seed demo error:', e);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-white/10 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white/5 rounded-2xl border border-white/10" />
          ))}
        </div>
        <div className="h-64 bg-white/5 rounded-2xl border border-white/10" />
      </div>
    );
  }

  const summary = data?.summary || { totalRaised: 0, activeCollections: 0, supporters: 0, pendingMembers: 0 };
  const groups = data?.groups || [];
  const collections = data?.collections || [];

  // Chart data for per-collection raised
  const chartData = collections.slice(0, 6).map(c => ({
    name: c.title.length > 14 ? `${c.title.slice(0, 12)}...` : c.title,
    raised: c.raised,
    target: c.target,
    theme: c.theme,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Welcome back, {user?.name.split(' ')[0] || 'Lead'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Overview of your active group collections, payments, and member statuses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Seeding...' : 'Load Demo Data'}</span>
          </button>

          <Link
            to="/group/new"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Group</span>
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Raised */}
        <div className="p-5 glass-panel relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Total Raised</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {formatINR(summary.totalRaised)}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <span>{formatCompactINR(summary.totalRaised)} across all groups</span>
            </p>
          </div>
        </div>

        {/* Card 2: Active Collections */}
        <div className="p-5 glass-panel relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Active Collections</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {summary.activeCollections}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {collections.length} total created
            </p>
          </div>
        </div>

        {/* Card 3: Total Supporters */}
        <div className="p-5 glass-panel relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Completed Payments</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {summary.supporters}
            </p>
            <p className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-1 font-medium">
              Captured via PayPal & Demo
            </p>
          </div>
        </div>

        {/* Card 4: Pending Members */}
        <div className="p-5 glass-panel relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Pending Reminders</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {summary.pendingMembers}
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
              Unpaid roster members
            </p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      {collections.length > 0 && (
        <div className="p-6 glass-panel space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <span>Collection Progress Overview (₹)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Comparing funds raised vs targets in Indian Rupees</p>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <XAxis
                  dataKey="name"
                  stroke={isDark ? '#94A3B8' : '#64748B'}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }}
                />
                <YAxis
                  stroke={isDark ? '#94A3B8' : '#64748B'}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }}
                  tickFormatter={val => formatCompactINR(val)}
                />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.04)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 text-xs space-y-1 shadow-xl rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1226]">
                          <p className="font-bold text-slate-900 dark:text-white">{d.name}</p>
                          <p className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">Raised: {formatINR(d.raised)}</p>
                          <p className="text-slate-500 dark:text-slate-400 font-mono">Target: {formatINR(d.target)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="raised" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => {
                    const themeObj = THEMES[entry.theme] || THEMES.aurora;
                    return <Cell key={`cell-${index}`} fill={themeObj.fromColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Groups Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Your Groups</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold">
              {groups.length}
            </span>
          </h2>
          <Link
            to="/group/new"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-semibold flex items-center gap-1"
          >
            <span>+ Add Group</span>
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="p-12 glass-panel text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto text-2xl">
              👥
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white">No Groups Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Create your first group (class, friends, club, or fest committee) or load sample data.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={handleSeedDemo}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10"
              >
                Load Demo Data
              </button>
              <Link
                to="/group/new"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Create Group
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map(group => (
              <div
                key={group.id}
                onClick={() => navigate(`/group/${group.id}`)}
                className="p-5 glass-panel hover:border-indigo-500/40 cursor-pointer transition-all hover:-translate-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                      {group.emoji || '👥'}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                        {group.name}
                      </h3>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/5">
                        {group.type}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-white/10 text-center">
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Members</p>
                    <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">{group.memberCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Collections</p>
                    <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">{group.collectionsCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Raised</p>
                    <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {formatCompactINR(group.totalRaised)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collections Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>All Collections</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold">
              {collections.length}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map(col => {
            const themeConfig = THEMES[col.theme] || THEMES.aurora;
            return (
              <div
                key={col.id}
                onClick={() => navigate(`/manage/${col.id}`)}
                className="p-5 glass-panel hover:border-indigo-500/40 cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden"
              >
                {/* Theme strip top */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${themeConfig.gradient}`} />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                      {col.emoji}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                        {col.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-mono">
                          {col.mode === 'fixed' ? 'Fixed Share' : 'Goal Pool'}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            col.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-500/10 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {col.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatINR(col.raised)}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">of {formatINR(col.target)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${themeConfig.gradient}`}
                      style={{ width: `${col.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <span>{col.percent}% funded</span>
                    <span className="text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-1 font-medium">
                      Manage <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
