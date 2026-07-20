import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';

export type Theme = 'warm' | 'dark';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    return stored === 'dark' ? 'dark' : 'warm';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'dark' ? 'warm' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
