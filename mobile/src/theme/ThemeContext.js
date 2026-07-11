import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { lightColors, darkColors } from './palettes';

const THEME_KEY = 'puntuaciones_theme';

const storage = Platform.OS === 'web'
  ? {
      getItemAsync: async (k) => window.localStorage.getItem(k),
      setItemAsync: async (k, v) => window.localStorage.setItem(k, v),
    }
  : SecureStore;

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    storage.getItemAsync(THEME_KEY).then((v) => setDark(v === 'dark')).catch(() => {});
  }, []);

  const toggleDark = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      storage.setItemAsync(THEME_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }, []);

  const colors = dark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ dark, toggleDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
