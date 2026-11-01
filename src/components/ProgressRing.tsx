import React from 'react';
import { THEMES } from '../utils/theme';
import { CollectionTheme } from '../types';

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  theme?: CollectionTheme;
  showText?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percent,
  size = 140,
  strokeWidth = 10,
  theme = 'aurora',
  showText = true,
}) => {
  const themeConfig = THEMES[theme] || THEMES.aurora;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clampedPercent / 100) * circumference;

  const gradientId = `ring-grad-${theme}-${size}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={themeConfig.fromColor} />
            <stop offset="50%" stopColor={themeConfig.midColor} />
            <stop offset="100%" stopColor={themeConfig.toColor} />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/10 dark:text-white/10 light:text-slate-200"
        />
        {/* Animated fill circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono font-extrabold text-2xl tracking-tight text-white dark:text-white light:text-slate-900">
            {Math.round(percent)}%
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            funded
          </span>
        </div>
      )}
    </div>
  );
};
