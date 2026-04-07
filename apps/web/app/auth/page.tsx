"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopNav } from "../components/home/TopNav";
import { useUserSession } from "../lib/userSession";
import type { LoginInput } from "../lib/apiTypes";

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as T & { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed");
  }
  if (!payload) throw new Error("Empty response");
  return payload;
}

function InputLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--brand-text-muted)]">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full border border-[var(--brand-text-muted)]/70 bg-transparent px-3 text-sm text-[var(--brand-text)] outline-none transition focus:border-[var(--brand-secondary)] ${props.className ?? ""}`}
    />
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      <path
        d="M23.49 12.27c0-.79-.07-1.54-.21-2.27H12v4.3h6.45a5.51 5.51 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.57-5.16 3.57-8.65Z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.86-3A7.17 7.17 0 0 1 12 19.3a7.26 7.26 0 0 1-6.82-5.02H1.2v3.1A11.99 11.99 0 0 0 12 24Z"
        fill="#34A853"
      />
      <path
        d="M5.18 14.28A7.2 7.2 0 0 1 4.78 12c0-.79.14-1.56.4-2.28V6.62H1.2A12 12 0 0 0 0 12c0 1.94.46 3.78 1.2 5.38l3.98-3.1Z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.15 15.24 0 12 0 7.34 0 3.31 2.67 1.2 6.62l3.98 3.1A7.26 7.26 0 0 1 12 4.77Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, refreshSession } = useUserSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = new URLSearchParams(window.location.search).get("redirect");
    if (!raw) return null;
    const decoded = decodeURIComponent(raw);
    return decoded.startsWith("/") ? decoded : null;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    if (oauthError) setError(decodeURIComponent(oauthError));
  }, []);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
        <TopNav />
        <main className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-12">
          <section className="relative overflow-hidden rounded-xl border border-[var(--brand-text-muted)] bg-[var(--brand-bg-900)] p-7">
            <div className="relative z-10 space-y-4 text-center">
              <p className="text-[11px] uppercase tracking-[0.38em] text-[var(--brand-text-muted)]">Account Protocol</p>
              <h1 className="text-4xl font-semibold tracking-[0.05em] text-[var(--brand-secondary)]">READY</h1>
              <p className="mx-auto max-w-2xl text-sm leading-6 text-[var(--brand-text-muted)]">
                すでにログインしています。アカウント管理からプロフィール、認証、配信権限を確認してください。
              </p>
              <Link
                href="/account"
                className="inline-flex h-11 items-center justify-center border border-[var(--brand-secondary)] px-5 text-sm tracking-[0.22em] text-[var(--brand-secondary)] transition hover:bg-[color-mix(in_srgb,var(--brand-secondary)_12%,transparent)]"
              >
                ACCOUNT
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload: LoginInput = {
        email,
        password,
        provider: "password",
      };
      await postJson("/api/auth/login", payload);
      await refreshSession();
      router.push(redirectTo ?? "/account");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "処理に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = () => {
    setError(null);
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav />

      <main className="mx-auto max-w-2xl px-5 py-8 md:px-10 md:py-12">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[var(--brand-surface)] p-7">
          <div className="relative z-10">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-[0.02em]">ログイン</h1>
              <p className="mt-1 text-sm text-[var(--brand-text-muted)]">登録済みアカウントでログインします</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <InputLabel label="User ID / Email">
                <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </InputLabel>

              <InputLabel label="Password">
                <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </InputLabel>

              {error ? <p className="rounded-xl border border-[var(--brand-accent)]/50 bg-[var(--brand-accent)]/8 px-4 py-3 text-sm text-[var(--brand-accent)]">{error}</p> : null}

              <div className="grid gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleGoogle}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-5 text-sm font-semibold tracking-[0.02em] text-[#202124] transition hover:bg-[#f8f9fa] disabled:opacity-50"
                >
                  <GoogleLogo />
                  Googleでログイン
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 rounded-xl bg-[var(--brand-secondary)] px-5 text-sm font-bold tracking-[0.08em] text-black transition hover:brightness-110 disabled:opacity-60"
                >
                  {submitting ? "WORKING..." : "LOGIN"}
                </button>
              </div>

              <p className="pt-1 text-sm text-[var(--brand-text-muted)]">
                アカウントを持っていませんか？{" "}
                <Link href="/auth/signup" className="font-semibold text-[var(--brand-secondary)] underline-offset-2 hover:underline">
                  アカウントを新規作成
                </Link>
              </p>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
