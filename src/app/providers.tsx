'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type Author = 'AY' | 'AK';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  author: Author;
  setAuthor: (author: Author) => void;
  toggleAuthor: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  author: 'AY',
  setAuthor: () => {},
  toggleAuthor: () => {},
});

export const EMOJIS = ['✨', '🌟', '💫', '🎯', '🎨', '🎭', '🎪', '🌈', '🔥', '⚡', '🚀', '🎊'];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [author, setAuthor] = useState<Author>('AY');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    const savedAuthor = localStorage.getItem('author') as Author;
    if (savedTheme) setTheme(savedTheme);
    if (savedAuthor) setAuthor(savedAuthor);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('author', author);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme, author]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const toggleAuthor = () => setAuthor(prev => prev === 'AY' ? 'AK' : 'AY');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, author, setAuthor, toggleAuthor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);