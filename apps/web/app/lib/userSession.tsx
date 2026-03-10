"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type UserRole = "listener" | "vtuber";

export type SessionUser = {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  avatarUrl?: string;
};

type UserSessionContextValue = {
  user: SessionUser | null;
  hydrated: boolean;
  isAuthenticated: boolean;
  isVtuber: boolean;
  login: (user: SessionUser) => void;
  updateUser: (updates: Partial<SessionUser>) => void;
  logout: () => void;
};

const UserSessionContext = createContext<UserSessionContextValue | null>(null);
const STORAGE_KEY = "aiment.user-session.v1";

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SessionUser;
        if (parsed?.id && parsed?.name && parsed?.role) {
          setUser(parsed);
        }
      }
    } catch {
      setUser(null);
    } finally {
      setHydrated(true);
    }
  }, []);

  const login = (nextUser: SessionUser) => {
    setUser(nextUser);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  };

  const updateUser = (updates: Partial<SessionUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...updates };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  const logout = () => {
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      hydrated,
      isAuthenticated: Boolean(user),
      isVtuber: user?.role === "vtuber",
      login,
      updateUser,
      logout,
    }),
    [hydrated, user],
  );

  return <UserSessionContext.Provider value={value}>{children}</UserSessionContext.Provider>;
}

export function useUserSession() {
  const ctx = useContext(UserSessionContext);
  if (!ctx) {
    throw new Error("useUserSession must be used inside UserSessionProvider");
  }
  return ctx;
}
