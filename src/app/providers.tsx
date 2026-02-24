'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type Author = 'AY' | 'AK';
type ColorTheme = 'romance' | 'ocean' | 'sunset' | 'forest' | 'royal';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  ideaAY: string;
  ideaAK: string;
  dayHover: string;
}

interface ColorThemeConfig {
  name: string;
  emoji: string;
  light: ThemeColors;
  dark: ThemeColors;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  author: Author;
  setAuthor: (author: Author) => void;
  toggleAuthor: () => void;
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  author: 'AY',
  setAuthor: () => {},
  toggleAuthor: () => {},
  colorTheme: 'romance',
  setColorTheme: () => {},
  colors: {} as ThemeColors,
});

export const EMOJIS = ['✨', '🌟', '💫', '🎯', '🎨', '🎭', '🎪', '🌈', '🔥', '⚡', '🚀', '🎊'];

export const COLOR_THEMES: Record<ColorTheme, ColorThemeConfig> = {
  romance: {
    name: 'Romance',
    emoji: '💕',
    light: {
      primary: '#ec4899',
      secondary: '#8b5cf6',
      accent: '#f472b6',
      bg: 'from-pink-100 via-purple-100 to-blue-100',
      card: 'rgba(255, 255, 255, 0.95)',
      border: '#fbcfe8',
      text: '#831843',
      textSecondary: '#9d174d',
      ideaAY: 'bg-pink-100 border-pink-500 text-pink-900',
      ideaAK: 'bg-purple-100 border-purple-500 text-purple-900',
      dayHover: 'hover:bg-pink-50',
    },
    dark: {
      primary: '#f472b6',
      secondary: '#a78bfa',
      accent: '#ec4899',
      bg: 'from-pink-950 via-purple-950 to-slate-950',
      card: 'rgba(40, 20, 60, 0.98)',
      border: '#831843',
      text: '#fce7f3',
      textSecondary: '#fbcfe8',
      ideaAY: 'bg-pink-900 border-pink-400 text-pink-100',
      ideaAK: 'bg-purple-900 border-purple-400 text-purple-100',
      dayHover: 'hover:bg-pink-900/30',
    }
  },
  ocean: {
    name: 'Ocean',
    emoji: '🌊',
    light: {
      primary: '#0369a1',
      secondary: '#0e7490',
      accent: '#06b6d4',
      bg: 'from-cyan-100 via-blue-100 to-teal-100',
      card: 'rgba(255, 255, 255, 0.95)',
      border: '#a5f3fc',
      text: '#164e63',
      textSecondary: '#155e75',
      ideaAY: 'bg-cyan-100 border-cyan-600 text-cyan-900',
      ideaAK: 'bg-teal-100 border-teal-600 text-teal-900',
      dayHover: 'hover:bg-cyan-50',
    },
    dark: {
      primary: '#22d3ee',
      secondary: '#2dd4bf',
      accent: '#0ea5e9',
      bg: 'from-cyan-950 via-blue-950 to-slate-950',
      card: 'rgba(15, 30, 50, 0.98)',
      border: '#164e63',
      text: '#ecfeff',
      textSecondary: '#a5f3fc',
      ideaAY: 'bg-cyan-900 border-cyan-400 text-cyan-100',
      ideaAK: 'bg-teal-900 border-teal-400 text-teal-100',
      dayHover: 'hover:bg-cyan-900/30',
    }
  },
  sunset: {
    name: 'Sunset',
    emoji: '🌅',
    light: {
      primary: '#ea580c',
      secondary: '#db2777',
      accent: '#f59e0b',
      bg: 'from-orange-100 via-rose-100 to-amber-100',
      card: 'rgba(255, 255, 255, 0.95)',
      border: '#fed7aa',
      text: '#7c2d12',
      textSecondary: '#9a3412',
      ideaAY: 'bg-orange-100 border-orange-600 text-orange-900',
      ideaAK: 'bg-rose-100 border-rose-600 text-rose-900',
      dayHover: 'hover:bg-orange-50',
    },
    dark: {
      primary: '#fb923c',
      secondary: '#f472b6',
      accent: '#fbbf24',
      bg: 'from-orange-950 via-rose-950 to-slate-950',
      card: 'rgba(50, 20, 20, 0.98)',
      border: '#7c2d12',
      text: '#fff7ed',
      textSecondary: '#fed7aa',
      ideaAY: 'bg-orange-900 border-orange-400 text-orange-100',
      ideaAK: 'bg-rose-900 border-rose-400 text-rose-100',
      dayHover: 'hover:bg-orange-900/30',
    }
  },
  forest: {
    name: 'Forest',
    emoji: '🌲',
    light: {
      primary: '#15803d',
      secondary: '#059669',
      accent: '#84cc16',
      bg: 'from-emerald-100 via-green-100 to-lime-100',
      card: 'rgba(255, 255, 255, 0.95)',
      border: '#bbf7d0',
      text: '#14532d',
      textSecondary: '#166534',
      ideaAY: 'bg-emerald-100 border-emerald-600 text-emerald-900',
      ideaAK: 'bg-green-100 border-green-600 text-green-900',
      dayHover: 'hover:bg-emerald-50',
    },
    dark: {
      primary: '#4ade80',
      secondary: '#34d399',
      accent: '#a3e635',
      bg: 'from-emerald-950 via-green-950 to-slate-950',
      card: 'rgba(10, 40, 20, 0.98)',
      border: '#14532d',
      text: '#f0fdf4',
      textSecondary: '#bbf7d0',
      ideaAY: 'bg-emerald-900 border-emerald-400 text-emerald-100',
      ideaAK: 'bg-green-900 border-green-400 text-green-100',
      dayHover: 'hover:bg-emerald-900/30',
    }
  },
  royal: {
    name: 'Royal',
    emoji: '👑',
    light: {
      primary: '#7c3aed',
      secondary: '#c026d3',
      accent: '#fbbf24',
      bg: 'from-violet-100 via-fuchsia-100 to-amber-100',
      card: 'rgba(255, 255, 255, 0.95)',
      border: '#ddd6fe',
      text: '#5b21b6',
      textSecondary: '#7c3aed',
      ideaAY: 'bg-violet-100 border-violet-600 text-violet-900',
      ideaAK: 'bg-fuchsia-100 border-fuchsia-600 text-fuchsia-900',
      dayHover: 'hover:bg-violet-50',
    },
    dark: {
      primary: '#a78bfa',
      secondary: '#e879f9',
      accent: '#fbbf24',
      bg: 'from-violet-950 via-fuchsia-950 to-slate-950',
      card: 'rgba(30, 20, 60, 0.98)',
      border: '#5b21b6',
      text: '#ede9fe',
      textSecondary: '#ddd6fe',
      ideaAY: 'bg-violet-900 border-violet-400 text-violet-100',
      ideaAK: 'bg-fuchsia-900 border-fuchsia-400 text-fuchsia-100',
      dayHover: 'hover:bg-violet-900/30',
    }
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [author, setAuthor] = useState<Author>('AY');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('romance');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as Theme;
    const savedAuthor = localStorage.getItem('author') as Author;
    const savedColorTheme = localStorage.getItem('colorTheme') as ColorTheme;
    
    if (savedTheme) setTheme(savedTheme);
    if (savedAuthor) setAuthor(savedAuthor);
    if (savedColorTheme) setColorTheme(savedColorTheme);
    
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('theme', theme);
    localStorage.setItem('author', author);
    localStorage.setItem('colorTheme', colorTheme);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, author, colorTheme, mounted]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const toggleAuthor = () => setAuthor(prev => prev === 'AY' ? 'AK' : 'AY');

  const colors = COLOR_THEMES[colorTheme][theme];

  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      author, 
      setAuthor, 
      toggleAuthor, 
      colorTheme, 
      setColorTheme,
      colors 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);