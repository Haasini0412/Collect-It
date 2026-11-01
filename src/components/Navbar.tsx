import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  Sun,
  Moon,
  Plus,
  LayoutDashboard,
  RotateCcw,
  Check,
  User,
  LogOut,
  ChevronDown,
  Bell
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fireMiniConfetti } from '../utils/confetti';
import { InAppNotification } from '../types';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, isDemoLead, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  const isDark = theme === 'dark';

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/me/notifications');
      if (res.ok) {
        const list = await res.json();
        setNotifications(list);
      }
    } catch (e) {
      // quiet catch
    }
  };

  React.useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user?.uid]);

  const handleMarkNotificationsRead = async () => {
    try {
      await fetch('/api/me/notifications/read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      if (res.ok) {
        setSeedSuccess(true);
        fireMiniConfetti();
        setTimeout(() => setSeedSuccess(false), 3000);
        if (location.pathname === '/dashboard') {
          window.location.reload();
        } else {
          navigate('/dashboard');
        }
      }
    } catch (e) {
      console.error('Seed demo error:', e);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full backdrop-blur-xl border-b transition-colors duration-200 ${
        isDark
          ? 'bg-[#070B18]/85 border-white/10'
          : 'bg-white/90 border-slate-200 shadow-sm shadow-slate-900/5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <span className="font-extrabold text-xl leading-none">₹</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span
                className={`font-bold text-lg tracking-tight bg-clip-text text-transparent ${
                  isDark
                    ? 'bg-gradient-to-r from-white via-indigo-200 to-cyan-300'
                    : 'bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-600'
                }`}
              >
                CollectIt
              </span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                ₹ + AI
              </span>
            </div>
          </div>
        </Link>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium">
          <Link
            to="/dashboard"
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              location.pathname === '/dashboard'
                ? isDark
                  ? 'bg-white/10 text-white font-semibold'
                  : 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/60'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            to="/group/new"
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <Plus className="w-4 h-4" />
            New Group
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Quick Demo Data Seed Button */}
          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            title="Populate test groups, collections & payments"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {seedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Demo Loaded!</span>
              </>
            ) : (
              <>
                <RotateCcw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
                <span>Load Demo Data</span>
              </>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
            title={isDark ? 'Switch to Daylight mode' : 'Switch to Dark mode'}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all border ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* In-App Notifications Bell for Lead (Safeguard F) */}
          {user && (
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  if (dropdownOpen) setDropdownOpen(false);
                }}
                aria-label="Notifications"
                title="Activity & Security Alerts"
                className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all border ${
                  isDark
                    ? 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
                }`}
              >
                <Bell className="w-4 h-4" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div
                    className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl glass-dropdown z-50 p-4 border shadow-2xl space-y-3 ${
                      isDark
                        ? 'bg-[#0d1226]/95 border-white/15 text-slate-200'
                        : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/10'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-indigo-500" />
                        <h4 className="font-bold text-xs">Alerts & Activity</h4>
                        {notifications.filter(n => !n.read).length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20">
                            {notifications.filter(n => !n.read).length} new
                          </span>
                        )}
                      </div>
                      {notifications.some(n => !n.read) && (
                        <button
                          onClick={handleMarkNotificationsRead}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                      {notifications.length === 0 ? (
                        <p className="text-center py-6 text-slate-400 text-xs">No notifications yet.</p>
                      ) : (
                        notifications.slice(0, 10).map(n => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-xl border transition-colors ${
                              !n.read
                                ? isDark
                                  ? 'bg-indigo-950/30 border-indigo-500/30 text-white'
                                  : 'bg-indigo-50/70 border-indigo-200 text-slate-900 font-medium'
                                : isDark
                                ? 'bg-white/5 border-white/5 text-slate-300'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs">{n.title}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                              {n.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Auth State */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                  isDark
                    ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                }`}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                    {user.name.charAt(0)}
                  </div>
                )}
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {user.name.split(' ')[0]}
                </span>
                {isDemoLead && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 font-semibold">
                    Lead
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div
                    className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl p-2 z-50 border text-xs ${
                      isDark
                        ? 'bg-[#0F172A] border-white/10 text-slate-200'
                        : 'bg-white border-slate-200 text-slate-800 shadow-xl'
                    }`}
                  >
                    <div className={`px-3 py-2 border-b mb-1 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.name}</p>
                      <p className={`truncate text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {user.email}
                      </p>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                      Dashboard
                    </Link>
                    <Link
                      to="/group/new"
                      onClick={() => setDropdownOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Plus className="w-4 h-4 text-cyan-500" />
                      Create New Group
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleSeedDemo();
                      }}
                      className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-white/10 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset to Sample Data
                    </button>
                    <div className={`my-1 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`} />
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
              >
                Open Dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
