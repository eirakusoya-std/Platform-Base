"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopNav } from "../components/home/TopNav";
import { useUserSession } from "../lib/userSession";
import type { AuthProvider, LoginInput, SignupInput, UserRole } from "../lib/apiTypes";

const TERMS_TEXT = `aimentでは、コミュニティの安全、決済の透明性、通報対応、配信アーカイブ運用のために必要なデータを保存します。

禁止事項には、なりすまし、ハラスメント、違法コンテンツ、第三者権利侵害、不正な複数アカウント作成が含まれます。

VTuber登録では、本人性と一人一アカウント運用の観点から電話番号確認を必須にします。`;

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

function FrameDecoration() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{ backgroundImage: "repeating-linear-gradient(to bottom, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px)" }}
      />
      <div
        className="pointer-events-none absolute -top-12 left-[22%] h-28 w-[48%] blur-2xl opacity-60"
        style={{ background: "radial-gradient(100% 70% at 50% 50%, color-mix(in srgb, var(--brand-secondary) 18%, transparent) 0%, transparent 76%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-16 right-[8%] h-36 w-[40%] blur-3xl opacity-40"
        style={{ background: "radial-gradient(80% 80% at 50% 50%, color-mix(in srgb, var(--brand-secondary) 16%, transparent) 0%, transparent 78%)" }}
      />
    </>
  );
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

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full border border-[var(--brand-text-muted)]/70 bg-transparent px-3 py-3 text-sm text-[var(--brand-text)] outline-none transition focus:border-[var(--brand-secondary)] ${props.className ?? ""}`}
    />
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, refreshSession } = useUserSession();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<UserRole>("listener");
  const [provider, setProvider] = useState<AuthProvider>("password");
  const [name, setName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const googleLabel = useMemo(
    () => (mode === "signup" ? "Googleでサインアップ" : "Googleでログイン"),
    [mode],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextMode = params.get("mode") === "signup" ? "signup" : "login";
    setMode(nextMode);
    const oauthError = params.get("error");
    if (oauthError) setError(decodeURIComponent(oauthError));
  }, []);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
        <TopNav />
        <main className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-12">
          <section className="relative overflow-hidden rounded-xl border border-[var(--brand-text-muted)] bg-[var(--brand-bg-900)] p-7">
            <FrameDecoration />
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
    setMessage(null);

    try {
      if (mode === "signup") {
        const payload: SignupInput = {
          role,
          name,
          email,
          password: provider === "password" ? password : undefined,
          provider,
          channelName: role === "vtuber" ? channelName : undefined,
          phoneNumber: role === "vtuber" ? phoneNumber : undefined,
          bio: role === "vtuber" ? bio : undefined,
          termsAccepted,
          privacyAccepted,
        };
        await postJson("/api/auth/signup", payload);
        await refreshSession();
        setMessage(provider === "google_demo" ? "Googleアカウントで登録しました。" : "アカウントを作成しました。");
        router.push("/account");
        return;
      }

      const payload: LoginInput = {
        email,
        password: provider === "password" ? password : undefined,
        provider,
      };
      await postJson("/api/auth/login", payload);
      await refreshSession();
      router.push("/account");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "処理に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = () => {
    if (mode === "signup" && (!termsAccepted || !privacyAccepted)) {
      setError("利用規約とプライバシーポリシーへの同意が必要です。");
      return;
    }
    setError(null);
    window.location.href = `/api/auth/google?role=${role}`;
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav />

      <main className="mx-auto grid max-w-6xl gap-5 px-5 py-8 md:px-10 md:py-12 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[color-mix(in_srgb,var(--brand-bg-900)_88%,#0f1422)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
          <FrameDecoration />
          <div className="relative z-10 space-y-6">
            <header className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.38em] text-[var(--brand-text-muted)]">Digital Auth</p>
              <h1 className="text-5xl font-semibold tracking-[0.04em] text-[var(--brand-secondary)]">Aiment ID</h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--brand-text-muted)]">Account Access Surface</p>
            </header>

            <div className="space-y-4 text-sm leading-7 text-[var(--brand-text-muted)]">
              <p>リスナーはメールまたは Google でそのまま登録できます。VTuber は電話番号確認後に配信作成権限が有効になります。</p>
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-xs leading-6">
                Google ログイン、メール確認、電話番号確認は現在ローカル検証用のモックです。実際の外部送信はまだ行っていません。
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.015] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Flow 01</p>
                <p className="mt-2 text-sm text-[var(--brand-text)]">Listener はそのまま視聴、予約、通知受信へ進めます。</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.015] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Flow 02</p>
                <p className="mt-2 text-sm text-[var(--brand-text)]">VTuber は電話確認後に studio と配信 API が解放されます。</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.015] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Flow 03</p>
                <p className="mt-2 text-sm text-[var(--brand-text)]">登録後の確認コード入力、プロフィール更新は `/account` で続けます。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[color-mix(in_srgb,var(--brand-bg-900)_88%,#0f1422)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
          <FrameDecoration />
          <div className="relative z-10">
            <div className="mb-6 rounded-2xl bg-black/10 p-1">
              <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`h-11 flex-1 rounded-xl border px-4 text-sm tracking-[0.18em] transition ${
                  mode === "login"
                    ? "border-[var(--brand-secondary)] bg-[color-mix(in_srgb,var(--brand-secondary)_10%,transparent)] text-[var(--brand-secondary)] shadow-[inset_0_0_0_1px_rgba(0,225,255,0.08)]"
                    : "border-transparent text-[var(--brand-text-muted)]"
                }`}
              >
                LOGIN
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`h-11 flex-1 rounded-xl border px-4 text-sm tracking-[0.18em] transition ${
                  mode === "signup"
                    ? "border-[var(--brand-secondary)] bg-[color-mix(in_srgb,var(--brand-secondary)_10%,transparent)] text-[var(--brand-secondary)] shadow-[inset_0_0_0_1px_rgba(0,225,255,0.08)]"
                    : "border-transparent text-[var(--brand-text-muted)]"
                }`}
              >
                SIGN UP
              </button>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setRole("listener")}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${role === "listener" ? "border-[var(--brand-secondary)] bg-[color-mix(in_srgb,var(--brand-secondary)_10%,transparent)]" : "border-white/10 bg-white/[0.015]"}`}
                    >
                      <p className="text-sm font-semibold text-[var(--brand-text)]">Listener</p>
                      <p className="mt-1 text-xs text-[var(--brand-text-muted)]">視聴・予約・通知向け</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("vtuber")}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${role === "vtuber" ? "border-[var(--brand-secondary)] bg-[color-mix(in_srgb,var(--brand-secondary)_10%,transparent)]" : "border-white/10 bg-white/[0.015]"}`}
                    >
                      <p className="text-sm font-semibold text-[var(--brand-text)]">VTuber</p>
                      <p className="mt-1 text-xs text-[var(--brand-text-muted)]">配信作成・管理・電話確認必須</p>
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputLabel label="Display Name">
                      <TextInput value={name} onChange={(event) => setName(event.target.value)} />
                    </InputLabel>
                    {role === "vtuber" && (
                      <InputLabel label="Channel Name">
                        <TextInput value={channelName} onChange={(event) => setChannelName(event.target.value)} />
                      </InputLabel>
                    )}
                  </div>
                </>
              )}

              <InputLabel label="User ID / Email">
                <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </InputLabel>

              <InputLabel label="Password">
                <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </InputLabel>

              {mode === "signup" && role === "vtuber" && (
                <>
                  <InputLabel label="Phone Number">
                    <TextInput value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="09012345678" />
                  </InputLabel>
                  <InputLabel label="Profile / Bio">
                    <TextArea value={bio} onChange={(event) => setBio(event.target.value)} rows={4} />
                  </InputLabel>
                </>
              )}

              {mode === "signup" && (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.015] p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Terms / Privacy</p>
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-white/8 bg-black/10 p-3 text-xs leading-6 text-[var(--brand-text-muted)] whitespace-pre-wrap">
                    {TERMS_TEXT}
                  </div>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
                    <span>利用規約に同意します</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} />
                    <span>プライバシーポリシーに同意します</span>
                  </label>
                </div>
              )}

              {error ? <p className="rounded-xl border border-[var(--brand-accent)]/50 bg-[var(--brand-accent)]/8 px-4 py-3 text-sm text-[var(--brand-accent)]">{error}</p> : null}
              {message ? <p className="rounded-xl border border-[var(--brand-secondary)]/40 bg-[color-mix(in_srgb,var(--brand-secondary)_8%,transparent)] px-4 py-3 text-sm text-[var(--brand-secondary)]">{message}</p> : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 rounded-xl border border-[var(--brand-secondary)] bg-[color-mix(in_srgb,var(--brand-secondary)_8%,transparent)] px-5 text-sm tracking-[0.22em] text-[var(--brand-secondary)] transition hover:bg-[color-mix(in_srgb,var(--brand-secondary)_14%,transparent)] disabled:opacity-60"
                >
                  {submitting ? "WORKING..." : mode === "signup" ? "CONTINUE" : "LOGIN"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleGoogle}
                  className="h-11 rounded-xl border border-white/10 bg-white/[0.02] px-5 text-sm tracking-[0.12em] text-[var(--brand-text)] transition hover:border-[var(--brand-secondary)]/40 hover:text-[var(--brand-secondary)] disabled:opacity-50"
                >
                  {googleLabel}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
