import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewGroupPage } from './pages/NewGroupPage';
import { GroupPage } from './pages/GroupPage';
import { NewCollectionPage } from './pages/NewCollectionPage';
import { ManagePage } from './pages/ManagePage';
import { PublicCollectionPage } from './pages/PublicCollectionPage';
import { JoinGroupPage } from './pages/JoinGroupPage';
import { SuccessPage } from './pages/SuccessPage';
import { ReceiptPage } from './pages/ReceiptPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { Sun, Moon, Sparkles, ShieldCheck } from 'lucide-react';

const Footer: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <footer className="w-full border-t border-white/10 dark:border-white/10 light:border-slate-200 py-8 bg-[#070B18]/50 dark:bg-[#070B18]/50 light:bg-slate-100/50 mt-auto text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-white text-sm">CollectIt</span>
          <span>·</span>
          <span>Group Money Collector with PayPal & Gemini AI</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            PayPal Orders v2
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 text-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Gemini AI
          </span>
          <span>·</span>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-300" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </footer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-200 selection:bg-indigo-500 selection:text-white">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/group/new" element={<NewGroupPage />} />
                <Route path="/group/:id" element={<GroupPage />} />
                <Route path="/group/:id/collection/new" element={<NewCollectionPage />} />
                <Route path="/manage/:id" element={<ManagePage />} />
                <Route path="/c/:slug" element={<PublicCollectionPage />} />
                <Route path="/join/:code" element={<JoinGroupPage />} />
                <Route path="/c/:slug/success" element={<SuccessPage />} />
                <Route path="/receipt/:id" element={<ReceiptPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
