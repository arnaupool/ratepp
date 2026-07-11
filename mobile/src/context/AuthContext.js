import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken } from '../api/client';

const TOKEN_KEY = 'puntuaciones_token';

// expo-secure-store has no web implementation; fall back to localStorage
// there so the app also runs as a web build.
const storage = Platform.OS === 'web'
  ? {
      getItemAsync: async (k) => window.localStorage.getItem(k),
      setItemAsync: async (k, v) => window.localStorage.setItem(k, v),
      deleteItemAsync: async (k) => window.localStorage.removeItem(k),
    }
  : SecureStore;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await storage.getItemAsync(TOKEN_KEY);
      if (stored) {
        setAuthToken(stored);
        try {
          const { user: me } = await api.get('/api/auth/me');
          setUser(me);
          setToken(stored);
        } catch {
          await storage.deleteItemAsync(TOKEN_KEY);
          setAuthToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const applySession = useCallback(async (data) => {
    await storage.setItemAsync(TOKEN_KEY, data.token);
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    await applySession(data);
  }, [applySession]);

  const register = useCallback(async (email, password, name) => {
    const data = await api.post('/api/auth/register', { email, password, name });
    await applySession(data);
  }, [applySession]);

  const logout = useCallback(async () => {
    await storage.deleteItemAsync(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
