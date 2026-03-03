"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type UserRole = "listener" | "vtuber";

type SessionUser = {
  id: string;
  name: string;
  role: UserRole;
};

type UserSessionContextValue = {
  user: SessionUser;
  isVtuber: boolean;
};

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  // TODO: replace with real auth session.
  const [user] = useState<SessionUser>({
    id: "demo-vtuber",
    name: "田中太郎",
    role: "vtuber",
  });

  const value = useMemo(
    () => ({
      user,
      isVtuber: user.role === "vtuber",
    }),
    [user],
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
