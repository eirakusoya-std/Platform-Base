"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopNav } from "../../components/home/TopNav";
import { useUserSession } from "../../lib/userSession";
import type { SignupInput, UserRole } from "../../lib/apiTypes";

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

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, refreshSession } = useUserSession();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<UserRole>("listener");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [displayName, setDisplayName] = useState("");
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
    if (isAuthenticated) {
      router.replace("/account");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  const goStep2 = () => {
    setError(null);
    if (!email.trim()) {
      setError("メールアドレスを入力してください。");
      return;
    }
    if (!password.trim()) {
      setError("パスワードを入力してください。");
      return;
    }
    if (!termsAccepted || !privacyAccepted) {
      setError("利用規約とプライバシーポリシーへの同意が必要です。");
      return;
    }
    setStep(2);
  };

  const goStep3 = () => {
    setError(null);
    if (!role) {
      setError("アカウント種別を選択してください。");
      return;
    }
    if (role === "vtuber" && !phoneNumber.trim()) {
      setError("VTuber登録には電話番号の入力が必要です。");
      return;
    }
    setStep(3);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (step === 1) {
      goStep2();
      return;
    }

    if (step === 2) {
      goStep3();
      return;
    }

    if (!displayName.trim()) {
      setError("ディスプレイネームを入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      const payload: SignupInput = {
        role,
        name: displayName,
        email,
        password,
        provider: "password",
        phoneNumber: role === "vtuber" ? phoneNumber : undefined,
        termsAccepted,
        privacyAccepted,
      };
      await postJson("/api/auth/signup", payload);
      await refreshSession();
      router.push(redirectTo ?? "/");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "処理に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignup = () => {
    setError(null);
    if (role === "vtuber") {
      setError("VTuber登録は電話番号入力のため、メール登録を利用してください。");
      return;
    }
    if (!termsAccepted || !privacyAccepted) {
      setError("利用規約とプライバシーポリシーへの同意が必要です。");
      return;
    }
    window.location.href = `/api/auth/google?role=${role}`;
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav />
      <main className="mx-auto max-w-2xl px-5 py-8 md:px-10 md:py-12">
        <section className="rounded-[28px] border border-white/10 bg-[var(--brand-surface)] p-7">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-[0.02em]">サインアップ</h1>
            <p className="mt-1 text-sm text-[var(--brand-text-muted)]">
              {step === 1
                ? "STEP 1/3: 認証情報と同意"
                : step === 2
                  ? "STEP 2/3: アカウント種別"
                  : "STEP 3/3: プロフィール"}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {step === 1 ? (
              <>
                <InputLabel label="User ID / Email">
                  <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </InputLabel>

                <InputLabel label="Password">
                  <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                </InputLabel>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.015] p-4">
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
                    <span>
                      <Link href="/terms" className="text-[var(--brand-secondary)] underline-offset-2 hover:underline">利用規約</Link>
                      {" "}に同意します
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} />
                    <span>
                      <Link href="/privacy" className="text-[var(--brand-secondary)] underline-offset-2 hover:underline">プライバシーポリシー</Link>
                      {" "}に同意します
                    </span>
                  </label>
                </div>
              </>
            ) : step === 2 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setRole("listener")}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    role === "listener"
                      ? "border-[var(--brand-secondary)] bg-[color-mix(in_srgb,var(--brand-secondary)_10%,transparent)]"
                      : "border-white/10 bg-white/[0.015]"
                  }`}
                >
                  <p className="text-sm font-semibold text-[var(--brand-text)]">Listener</p>
                  <p className="mt-1 text-xs text-[var(--brand-text-muted)]">視聴・予約・通知向け</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("vtuber")}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    role === "vtuber"
                      ? "border-[var(--brand-secondary)] bg-[color-mix(in_srgb,var(--brand-secondary)_10%,transparent)]"
                      : "border-white/10 bg-white/[0.015]"
                  }`}
                >
                  <p className="text-sm font-semibold text-[var(--brand-text)]">VTuber</p>
                  <p className="mt-1 text-xs text-[var(--brand-text-muted)]">配信作成・管理</p>
                </button>
                {role === "vtuber" ? (
                  <div className="sm:col-span-2">
                    <InputLabel label="Phone Number">
                      <TextInput
                        type="tel"
                        placeholder="09012345678"
                        value={phoneNumber}
                        onChange={(event) => setPhoneNumber(event.target.value)}
                      />
                    </InputLabel>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <InputLabel label="Display Name">
                  <TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                </InputLabel>
                <p className="text-xs text-[var(--brand-text-muted)]">この表示名は配信枠やチャットに表示されます。</p>
              </>
            )}

            {error ? <p className="rounded-xl border border-[var(--brand-accent)]/50 bg-[var(--brand-accent)]/8 px-4 py-3 text-sm text-[var(--brand-accent)]">{error}</p> : null}

            {step === 1 ? (
              <div className="grid gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleGoogleSignup}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-5 text-sm font-semibold tracking-[0.02em] text-[#202124] transition hover:bg-[#f8f9fa] disabled:opacity-50"
                >
                  <GoogleLogo />
                  Googleでサインアップ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 rounded-xl bg-[var(--brand-secondary)] px-5 text-sm font-bold tracking-[0.08em] text-black transition hover:brightness-110 disabled:opacity-60"
                >
                  {submitting ? "WORKING..." : "次へ"}
                </button>
              </div>
            ) : step === 2 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-11 rounded-xl bg-[var(--brand-bg-900)] px-5 text-sm font-bold tracking-[0.08em] text-[var(--brand-text)] transition hover:brightness-110"
                >
                  BACK
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 rounded-xl bg-[var(--brand-secondary)] px-5 text-sm font-bold tracking-[0.08em] text-black transition hover:brightness-110 disabled:opacity-60"
                >
                  {submitting ? "WORKING..." : "次へ"}
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="h-11 rounded-xl bg-[var(--brand-bg-900)] px-5 text-sm font-bold tracking-[0.08em] text-[var(--brand-text)] transition hover:brightness-110"
                >
                  BACK
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 rounded-xl bg-[var(--brand-secondary)] px-5 text-sm font-bold tracking-[0.08em] text-black transition hover:brightness-110 disabled:opacity-60"
                >
                  {submitting ? "WORKING..." : "アカウント作成"}
                </button>
              </div>
            )}

            <p className="pt-1 text-sm text-[var(--brand-text-muted)]">
              すでにアカウントをお持ちですか？{" "}
              <Link href="/auth" className="font-semibold text-[var(--brand-secondary)] underline-offset-2 hover:underline">
                ログインへ
              </Link>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
