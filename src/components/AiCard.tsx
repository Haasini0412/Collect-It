import React from 'react';
import { Sparkles, Cpu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface AiCardProps {
  isAi?: boolean;
  title?: string;
  badgeText?: string;
  className?: string;
  children: React.ReactNode;
}

export const AiBadge: React.FC<{ isAi?: boolean }> = ({ isAi = true }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (isAi) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          isDark
            ? 'bg-gradient-to-r from-violet-500/20 via-pink-500/20 to-amber-500/20 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-500/10'
            : 'bg-purple-50 text-purple-700 border border-purple-200 shadow-sm'
        }`}
      >
        <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
        <span>✨ AI</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
        isDark
          ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
          : 'bg-slate-100 text-slate-600 border border-slate-200'
      }`}
    >
      <Cpu className="w-3 h-3 text-slate-500" />
      <span>Basic mode</span>
    </span>
  );
};

export const AiCard: React.FC<AiCardProps> = ({
  isAi = true,
  title,
  badgeText,
  className = '',
  children,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`relative rounded-2xl p-[1px] ${
        isAi
          ? 'bg-gradient-to-r from-violet-600/40 via-pink-600/40 to-amber-500/40 shadow-xl shadow-indigo-950/20'
          : isDark
          ? 'border border-white/10'
          : 'border border-slate-200'
      } ${className}`}
    >
      <div
        className={`rounded-[15px] p-5 h-full backdrop-blur-xl ${
          isDark
            ? 'bg-[#0d1226]/95 text-slate-100'
            : 'bg-white text-slate-900 border border-slate-100 shadow-sm'
        }`}
      >
        {(title || badgeText) && (
          <div className="flex items-center justify-between gap-3 mb-4">
            {title && (
              <h3
                className={`font-semibold text-base flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-slate-900 font-bold'
                }`}
              >
                {title}
              </h3>
            )}
            <AiBadge isAi={isAi} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
