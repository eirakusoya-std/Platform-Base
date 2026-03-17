"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "aiment.login.demo.v1";

type AuthState = "unknown" | "logged_out" | "logged_in";

function TopRightTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Open login action"
      onClick={onClick}
      className="group absolute right-6 top-6 h-14 w-14"
    >
      <span className="absolute inset-0 border border-[var(--brand-text)]/85 transition-opacity group-hover:opacity-85" />
      <span className="absolute right-0 top-0 h-9 w-9 border border-[var(--brand-secondary)]/90 bg-[color-mix(in_srgb,var(--brand-secondary)_16%,transparent)]" />
      <span className="absolute right-[10px] top-[10px] h-3 w-3 border border-[var(--brand-secondary)]" />
    </button>
  );
}

function FrameDecoration() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: "repeating-linear-gradient(to bottom, rgba(255,255,255,0.08) 0 1px, transparent 1px 3px)" }} />
      <div className="pointer-events-none absolute -top-8 left-[4%] h-36 w-[76%] blur-xl" style={{ background: "radial-gradient(110% 80% at 20% 50%, color-mix(in srgb, var(--brand-secondary) 38%, transparent) 0%, transparent 74%)" }} />
      <div className="pointer-events-none absolute bottom-0 left-[10%] h-28 w-[66%]" style={{ background: "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--brand-secondary) 24%, transparent) 100%)" }} />
      <div className="pointer-events-none absolute left-4 top-4 h-5 w-5 border-l-2 border-t-2 border-[var(--brand-secondary)]" />
      <div className="pointer-events-none absolute right-4 top-4 h-5 w-5 border-r-2 border-t-2 border-[var(--brand-secondary)]" />
      <div className="pointer-events-none absolute bottom-4 left-4 h-5 w-5 border-b-2 border-l-2 border-[var(--brand-secondary)]" />
      <div className="pointer-events-none absolute bottom-4 right-4 h-5 w-5 border-b-2 border-r-2 border-[var(--brand-secondary)]" />
    </>
  );
}

function LoginPanel({ showLoginAction, onLogin }: { showLoginAction: boolean; onLogin: () => void }) {
  return (
    <section className="relative min-h-[560px] overflow-hidden rounded-xl border border-[var(--brand-text-muted)] bg-[var(--brand-bg-900)] p-7">
      <FrameDecoration />
      <div className="relative z-10 max-w-[420px] space-y-6">
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.38em] text-[var(--brand-text-muted)]">Digital</p>
          <h1 className="text-5xl font-semibold tracking-[0.05em] text-[var(--brand-secondary)]">U02</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Auth / Manual Trigger</p>
        </header>

        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--brand-text-muted)]">User ID / Email</span>
            <div className="h-11 border border-[var(--brand-text-muted)]/70" />
          </label>
          <label className="block space-y-2">
            <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--brand-text-muted)]">Password</span>
            <div className="h-11 border border-[var(--brand-text-muted)]/70" />
          </label>
        </div>

        <div className="min-h-12">
          {showLoginAction ? (
            <button
              type="button"
              onClick={onLogin}
              className="h-11 min-w-[168px] border border-[var(--brand-secondary)] px-5 text-sm tracking-[0.22em] text-[var(--brand-secondary)] transition hover:bg-[color-mix(in_srgb,var(--brand-secondary)_12%,transparent)]"
            >
              LOGIN
            </button>
          ) : (
            <p className="text-xs tracking-[0.12em] text-[var(--brand-text-muted)]">右上オブジェクトを押すとログインボタンが表示されます。</p>
          )}
        </div>
      </div>
    </section>
  );
}

function AccountPanel({ onLogout }: { onLogout: () => void }) {
  return (
    <section className="relative min-h-[560px] overflow-hidden rounded-xl border border-[var(--brand-text-muted)] bg-[var(--brand-bg-900)] p-7">
      <FrameDecoration />
      <div className="relative z-10 max-w-[520px] space-y-6">
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.38em] text-[var(--brand-text-muted)]">Account Protocol</p>
          <h1 className="text-4xl font-semibold tracking-[0.05em] text-[var(--brand-secondary)]">STATUS</h1>
        </header>

        <div className="space-y-3">
          <div className="grid grid-cols-[120px_1fr] border-b border-[var(--brand-text-muted)]/50 pb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">User Name</span>
            <span className="text-sm text-[var(--brand-text)]">田中 太郎</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] border-b border-[var(--brand-text-muted)]/50 pb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Plan</span>
            <span className="text-sm text-[var(--brand-text)]">PROTOCOL 02</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] border-b border-[var(--brand-text-muted)]/50 pb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Security</span>
            <span className="text-sm text-[var(--brand-secondary)]">MFA ENABLED</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="h-10 border border-[var(--brand-text-muted)] px-4 text-xs tracking-[0.2em] text-[var(--brand-text)] transition hover:bg-[var(--brand-surface)]"
        >
          LOGOUT
        </button>
      </div>
    </section>
  );
}

export default function LoginPage() {
  const [authState, setAuthState] = useState<AuthState>("unknown");
  const [showLoginAction, setShowLoginAction] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const timer = window.setTimeout(() => {
      setAuthState(raw === "1" ? "logged_in" : "logged_out");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleTrigger = () => {
    if (authState === "logged_out") setShowLoginAction((prev) => !prev);
  };

  const handleLogin = () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setAuthState("logged_in");
    setShowLoginAction(false);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setAuthState("logged_out");
    setShowLoginAction(false);
  };

  return (
    <main className="min-h-screen bg-[var(--brand-bg-900)] px-5 py-8 text-[var(--brand-text)] md:px-10 md:py-12">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.45em] text-[var(--brand-text-muted)]">Login Flow</p>
          <h2 className="text-2xl font-semibold tracking-[0.06em] text-[var(--brand-secondary)] md:text-3xl">LOGIN PAGE PROTOTYPE</h2>
          <p className="text-sm text-[var(--brand-text-muted)]">右上オブジェクトでログイン導線を開き、ログイン状態でカード表示を切り替えます。</p>
        </header>

        <div className="relative">
          <TopRightTrigger onClick={handleTrigger} />

          {authState === "unknown" ? (
            <section className="rounded-xl border border-[var(--brand-text-muted)]/60 bg-[var(--brand-bg-900)] p-8 text-sm text-[var(--brand-text-muted)]">Loading...</section>
          ) : authState === "logged_in" ? (
            <AccountPanel onLogout={handleLogout} />
          ) : (
            <LoginPanel showLoginAction={showLoginAction} onLogin={handleLogin} />
          )}
        </div>
      </div>
    </main>
  );
}
