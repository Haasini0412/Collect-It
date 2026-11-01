import { CollectionTheme } from '../types';

export interface ThemeConfig {
  id: CollectionTheme;
  name: string;
  gradient: string; // Tailwind gradient classes
  fromColor: string;
  midColor: string;
  toColor: string;
  qrColor: string; // Hex for QRCode rendering
  bgGlow: string;
  badgeBorder: string;
}

export const THEMES: Record<CollectionTheme, ThemeConfig> = {
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    gradient: 'from-[#6366F1] via-[#8B5CF6] to-[#22D3EE]',
    fromColor: '#6366F1',
    midColor: '#8B5CF6',
    toColor: '#22D3EE',
    qrColor: '#6366F1',
    bgGlow: 'rgba(99, 102, 241, 0.25)',
    badgeBorder: 'border-indigo-500/30',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    gradient: 'from-[#F97316] via-[#EC4899] to-[#8B5CF6]',
    fromColor: '#F97316',
    midColor: '#EC4899',
    toColor: '#8B5CF6',
    qrColor: '#F97316',
    bgGlow: 'rgba(249, 115, 22, 0.25)',
    badgeBorder: 'border-orange-500/30',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    gradient: 'from-[#0EA5E9] via-[#06B6D4] to-[#34D399]',
    fromColor: '#0EA5E9',
    midColor: '#06B6D4',
    toColor: '#34D399',
    qrColor: '#0EA5E9',
    bgGlow: 'rgba(14, 165, 233, 0.25)',
    badgeBorder: 'border-cyan-500/30',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    gradient: 'from-[#16A34A] via-[#10B981] to-[#84CC16]',
    fromColor: '#16A34A',
    midColor: '#10B981',
    toColor: '#84CC16',
    qrColor: '#10B981',
    bgGlow: 'rgba(16, 185, 129, 0.25)',
    badgeBorder: 'border-emerald-500/30',
  },
  candy: {
    id: 'candy',
    name: 'Candy',
    gradient: 'from-[#F472B6] via-[#C084FC] to-[#60A5FA]',
    fromColor: '#F472B6',
    midColor: '#C084FC',
    toColor: '#60A5FA',
    qrColor: '#F472B6',
    bgGlow: 'rgba(244, 114, 182, 0.25)',
    badgeBorder: 'border-pink-500/30',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    gradient: 'from-[#1E293B] via-[#4338CA] to-[#0EA5E9]',
    fromColor: '#4338CA',
    midColor: '#3B82F6',
    toColor: '#0EA5E9',
    qrColor: '#38BDF8',
    bgGlow: 'rgba(67, 56, 202, 0.35)',
    badgeBorder: 'border-indigo-400/30',
  },
};

export const COLLECTION_TEMPLATES = [
  {
    title: 'Farewell Party Fund',
    emoji: '🎓',
    mode: 'fixed' as const,
    amount: 500,
    theme: 'candy' as CollectionTheme,
    purpose: 'Collecting for venue, buffet, and batch mementos for our graduating seniors.',
  },
  {
    title: 'Class Trip to Goa',
    emoji: '✈️',
    mode: 'fixed' as const,
    amount: 5000,
    theme: 'ocean' as CollectionTheme,
    purpose: 'Hotel bookings, chartered bus, and beach resort pool passes.',
  },
  {
    title: 'Fest Registration Fee',
    emoji: '🎟️',
    mode: 'fixed' as const,
    amount: 250,
    theme: 'aurora' as CollectionTheme,
    purpose: 'All-access delegate pass, welcome kit, and competition entry.',
  },
  {
    title: 'Sponsorship Pool',
    emoji: '🚀',
    mode: 'goal' as const,
    amount: 500000,
    theme: 'midnight' as CollectionTheme,
    purpose: 'Alumni and industry contributions for stage production, cash prizes, and logistics.',
  },
  {
    title: 'Diwali House Party',
    emoji: '🎁',
    mode: 'goal' as const,
    amount: 10000,
    theme: 'sunset' as CollectionTheme,
    purpose: 'Sweets, sparklers, card games snacks, and festive dinner spread.',
  },
  {
    title: 'Flat Rent & WiFi Split',
    emoji: '🏠',
    mode: 'fixed' as const,
    amount: 8000,
    theme: 'forest' as CollectionTheme,
    purpose: 'Monthly apartment rent, maid allowance, and 500Mbps fiber broadband.',
  },
];
