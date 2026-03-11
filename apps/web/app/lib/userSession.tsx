"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthSession, SessionUser } from "./apiTypes";

type UserSessionContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isVtuber: boolean;
  loading: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
};

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

async function readSession() {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  const payload = (await response.json()) as AuthSession;
  return payload;
}

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const session = await readSession();
    setUser(session.user);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        const session = await readSession();
        if (!cancelled) {
          setUser(session.user);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isVtuber: user?.role === "vtuber",
      loading,
      refreshSession,
      logout,
    }),
    [loading, logout, refreshSession, user],
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
