import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const THEME_KEY = 'puntuaciones_theme';
// Hex equivalents of --bg (Safari's theme-color support for oklch is unreliable).
const THEME_COLOR = { light: '#fbf4eb', dark: '#130f09' };

interface ThemeValue {
  dark: boolean;
  setDark: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function initialDark() {
  // theme-init.js already applied the stored choice before first paint.
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDarkState] = useState(initialDark);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light);
  }, [dark]);

  const setDark = useCallback((next: boolean) => {
    setDarkState(next);
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      /* not persisted in private mode */
    }
  }, []);

  return <ThemeContext.Provider value={{ dark, setDark }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
