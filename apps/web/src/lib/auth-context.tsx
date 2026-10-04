import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { UserDTO } from '@econnect/shared-types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const REFRESH_TOKEN_KEY = 'econnect_refresh_token';

interface AuthContextValue {
  user: UserDTO | null;
  accessToken: string | null;
  login: (accessToken: string, refreshToken: string, user: UserDTO) => void;
  logout: () => void;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  // Access token lives in memory only (never localStorage) — it's short-lived
  // (15 min) so losing it on refresh just means a silent re-auth via the
  // refresh token, which IS persisted since it's designed to be long-lived
  // and is stored hashed server-side, limiting what a stolen copy can do.
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const login = useCallback((newAccessToken: string, refreshToken: string, newUser: UserDTO) => {
    setAccessToken(newAccessToken);
    setUser(newUser);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }, []);

  // Wraps fetch with the access token attached, and retries once after a
  // silent refresh if the token had expired. Callers don't need to think
  // about token lifetime at all.
  const authFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const doFetch = (token: string | null) =>
        fetch(`${API_BASE_URL}${path}`, {
          ...init,
          headers: {
            ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
            ...init.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

      let res = await doFetch(accessToken);

      if (res.status === 401 && accessToken) {
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (storedRefreshToken) {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setAccessToken(data.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
            res = await doFetch(data.accessToken);
          } else {
            logout();
          }
        }
      }

      return res;
    },
    [accessToken, logout],
  );

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
