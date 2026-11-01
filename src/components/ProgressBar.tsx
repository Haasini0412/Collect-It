import React from 'react';
import { THEMES } from '../utils/theme';
import { CollectionTheme } from '../types';

interface ProgressBarProps {
  percent: number;
  theme?: CollectionTheme;
  height?: number;
  showMilestones?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  theme = 'aurora',
  height = 14,
  showMilestones = true,
}) => {
  const themeConfig = THEMES[theme] || THEMES.aurora;
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className="w-full space-y-1.5">
      <div
        className="w-full rounded-full bg-white/10 dark:bg-white/10 light:bg-slate-200 relative overflow-hidden"
        style={{ height }}
      >
        {/* Animated fill */}
        <div
          className={`h-full rounded-full bg-gradient-to-r ${themeConfig.gradient} transition-all duration-1000 ease-out relative`}
          style={{ width: `${clamped}%` }}
        >
          {/* Shimmer sweep */}
          <div className="absolute inset-0 animate-shimmer opacity-40" />
          {/* Glowing knob */}
          {clamped > 2 && (
            <div className="absolute right-0 top-0 bottom-0 w-3 rounded-full bg-white shadow-lg shadow-white/80" />
          )}
        </div>

        {/* Milestone ticks at 25, 50, 75 */}
        {showMilestones && (
          <>
            <div className="absolute top-0 bottom-0 left-[25%] w-[1.5px] bg-white/30 z-10" />
            <div className="absolute top-0 bottom-0 left-[50%] w-[1.5px] bg-white/30 z-10" />
            <div className="absolute top-0 bottom-0 left-[75%] w-[1.5px] bg-white/30 z-10" />
          </>
        )}
      </div>

      {showMilestones && (
        <div className="flex justify-between text-[10px] font-mono font-medium text-slate-400 px-0.5">
          <span>0%</span>
          <span className={clamped >= 25 ? 'text-indigo-400 font-bold' : ''}>25%</span>
          <span className={clamped >= 50 ? 'text-indigo-400 font-bold' : ''}>50%</span>
          <span className={clamped >= 75 ? 'text-indigo-400 font-bold' : ''}>75%</span>
          <span className={clamped >= 100 ? 'text-emerald-400 font-bold' : ''}>100% 🎯</span>
        </div>
      )}
    </div>
  );
};
