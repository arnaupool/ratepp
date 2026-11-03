import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, getToken, onUnauthorized, setToken } from '../api/client';
import type { AuthResponse, User } from '../api/types';
import { resetHomeFilters } from '../state/homeFilters';
import { dropPushOnLogout } from '../utils/push';

type Status = 'checking' | 'offline' | 'signedOut' | 'signedIn';

interface AuthValue {
  status: Status;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  retry: () => void;
  /** After Ajustes changes the account: new details and/or a new token. */
  updateSession: (patch: { user?: User; token?: string }) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>(getToken() ? 'checking' : 'signedOut');
  const [user, setUser] = useState<User | null>(null);
  const [attempt, setAttempt] = useState(0);

  const logout = useCallback(() => {
    dropPushOnLogout();
    setToken(null);
    setUser(null);
    queryClient.clear();
    resetHomeFilters();
    setStatus('signedOut');
  }, [queryClient]);

  // Startup: a stored token is checked against /me. Only a real rejection
  // (401) drops it; an unreachable server keeps it and shows a retry screen,
  // so opening the PWA away from home without VPN doesn't sign you out.
  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    setStatus('checking');
    api
      .get<{ user: User }>('/api/auth/me')
      .then(({ user: me }) => {
        if (cancelled) return;
        setUser(me);
        setStatus('signedIn');
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status < 500) {
          setToken(null);
          setStatus('signedOut');
        } else {
          setStatus('offline');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => onUnauthorized(logout), [logout]);

  const applySession = useCallback((data: AuthResponse) => {
    setToken(data.token);
    setUser(data.user);
    setStatus('signedIn');
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      applySession(await api.post<AuthResponse>('/api/auth/login', { email, password }));
    },
    [applySession]
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      applySession(await api.post<AuthResponse>('/api/auth/register', { email, password, name }));
    },
    [applySession]
  );

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const updateSession = useCallback((patch: { user?: User; token?: string }) => {
    if (patch.token) setToken(patch.token);
    if (patch.user) setUser(patch.user);
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, login, register, logout, retry, updateSession }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
