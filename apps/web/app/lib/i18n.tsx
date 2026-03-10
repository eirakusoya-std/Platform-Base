"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "jp" | "en";

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  tx: (jp: string, en: string) => string;
};

const STORAGE_KEY = "aiment.locale.v1";

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("jp");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "jp" || saved === "en") {
      const timer = window.setTimeout(() => {
        setLocaleState(saved);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "jp" ? "ja" : "en";
  }, [locale]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next === "jp" ? "ja" : "en";
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      tx: (jp, en) => (locale === "jp" ? jp : en),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return ctx;
}
