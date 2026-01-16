"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api, User } from "./api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for token in URL (from Google OAuth redirect)
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      // Remove token from URL without reload
      window.history.replaceState({}, "", window.location.pathname);

      // Exchange token for session cookie
      api.exchangeToken(token)
        .then((userData) => {
          setUser(userData);
          setIsLoading(false);
        })
        .catch(() => {
          // Token invalid, try normal auth check
          refreshAuth();
        });
    } else {
      refreshAuth();
    }
  }, [refreshAuth]);

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshAuth, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}