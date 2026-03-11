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
    const nextMode = new URLSearchParams(window.location.search).get("mode") === "signup" ? "signup" : "login";
    setMode(nextMode);
  }, []);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
        <TopNav />
        <main className="mx-auto flex max-w-[900px] flex-col items-center gap-4 px-4 py-20 text-center">
          <h1 className="text-3xl font-black">Account Ready</h1>
          <p className="text-sm text-[var(--brand-text-muted)]">すでにログインしています。アカウント管理へ進んでください。</p>
          <Link href="/account" className="rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-bold text-white">
            アカウント管理へ
          </Link>
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

  const handleGoogle = async () => {
    setProvider("google_demo");
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (mode === "signup") {
        await postJson("/api/auth/signup", {
          role,
          name: name || "Google User",
          email,
          provider: "google_demo",
          channelName: role === "vtuber" ? channelName : undefined,
          phoneNumber: role === "vtuber" ? phoneNumber : undefined,
          bio: role === "vtuber" ? bio : undefined,
          termsAccepted,
          privacyAccepted,
        } satisfies SignupInput);
      } else {
        await postJson("/api/auth/login", { email, provider: "google_demo" } satisfies LoginInput);
      }
      await refreshSession();
      router.push("/account");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Google処理に失敗しました。");
    } finally {
      setSubmitting(false);
      setProvider("password");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav />

      <main className="mx-auto grid max-w-[1320px] gap-6 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <section className="rounded-[32px] bg-[var(--brand-surface)] p-6 shadow-xl shadow-black/20 lg:p-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--brand-primary)]">Aiment Account</p>
          <h1 className="mt-3 text-3xl font-black leading-tight">ログインまたはサインアップ</h1>
          <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-[var(--brand-text-muted)]">
            リスナーはメールまたはGoogleでシンプルに登録できます。VTuberは追加で電話番号確認を行い、配信作成権限を有効化します。
          </p>
          <div className="mt-4 rounded-2xl bg-[var(--brand-accent)]/12 px-4 py-3 text-xs leading-relaxed text-[var(--brand-accent)]">
            Googleログイン、メール確認、電話番号確認は現在ローカル検証用のモックです。実際の外部送信はまだ行っていません。
          </div>

          <div className="mt-6 flex gap-2 rounded-2xl bg-[var(--brand-bg-900)] p-1">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold ${mode === "login" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--brand-text-muted)]"}`}
            >
              ログイン
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold ${mode === "signup" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--brand-text-muted)]"}`}
            >
              サインアップ
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setRole("listener")}
                    className={`rounded-2xl border px-4 py-3 text-left ${role === "listener" ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10" : "border-white/10 bg-[var(--brand-bg-900)]"}`}
                  >
                    <p className="text-sm font-bold">Listener</p>
                    <p className="mt-1 text-xs text-[var(--brand-text-muted)]">視聴・参加予約・通知受け取り向け</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("vtuber")}
                    className={`rounded-2xl border px-4 py-3 text-left ${role === "vtuber" ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10" : "border-white/10 bg-[var(--brand-bg-900)]"}`}
                  >
                    <p className="text-sm font-bold">VTuber</p>
                    <p className="mt-1 text-xs text-[var(--brand-text-muted)]">配信枠作成・配信管理・電話認証必須</p>
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span>表示名</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-xl bg-[var(--brand-bg-900)] px-3 py-3 outline-none" />
                  </label>
                  {role === "vtuber" && (
                    <label className="grid gap-1 text-sm">
                      <span>チャンネル名</span>
                      <input value={channelName} onChange={(event) => setChannelName(event.target.value)} className="rounded-xl bg-[var(--brand-bg-900)] px-3 py-3 outline-none" />
                    </label>
                  )}
                </div>
              </>
            )}

            <label className="grid gap-1 text-sm">
              <span>メールアドレス</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xl bg-[var(--brand-bg-900)] px-3 py-3 outline-none" />
            </label>

            <label className="grid gap-1 text-sm">
              <span>パスワード</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-xl bg-[var(--brand-bg-900)] px-3 py-3 outline-none" />
            </label>

            {mode === "signup" && role === "vtuber" && (
              <>
                <label className="grid gap-1 text-sm">
                  <span>電話番号</span>
                  <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="09012345678" className="rounded-xl bg-[var(--brand-bg-900)] px-3 py-3 outline-none" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span>プロフィール</span>
                  <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} className="rounded-xl bg-[var(--brand-bg-900)] px-3 py-3 outline-none" />
                </label>
              </>
            )}

            {mode === "signup" && (
              <>
                <div className="rounded-2xl bg-[var(--brand-bg-900)] p-4">
                  <p className="mb-2 text-sm font-bold">利用規約・登録前確認</p>
                  <div className="max-h-40 overflow-y-auto rounded-xl bg-black/10 p-3 text-xs leading-relaxed text-[var(--brand-text-muted)] whitespace-pre-wrap">
                    {TERMS_TEXT}
                  </div>
                  <label className="mt-3 flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
                    <span>利用規約に同意します</span>
                  </label>
                  <label className="mt-2 flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} />
                    <span>プライバシーポリシーに同意します</span>
                  </label>
                </div>
              </>
            )}

            {error && <p className="rounded-xl bg-[var(--brand-accent)]/15 px-4 py-3 text-sm text-[var(--brand-accent)]">{error}</p>}
            {message && <p className="rounded-xl bg-[var(--brand-primary)]/15 px-4 py-3 text-sm text-[var(--brand-primary)]">{message}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="submit" disabled={submitting} className="rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-black text-white">
                {submitting ? "処理中..." : mode === "signup" ? "メールで続行" : "ログインする"}
              </button>
              <button type="button" disabled={submitting || !email || (mode === "signup" && (!termsAccepted || !privacyAccepted))} onClick={() => void handleGoogle()} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-black disabled:opacity-50">
                {googleLabel}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[32px] bg-[var(--brand-surface)] p-6 shadow-xl shadow-black/20">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--brand-primary)]">Flow</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-[var(--brand-bg-900)] p-4">
                <p className="text-sm font-bold">1. Listener 登録</p>
                <p className="mt-1 text-xs text-[var(--brand-text-muted)]">メール/パスワードまたは Google で即登録。トップページと予約導線が使えます。</p>
              </div>
              <div className="rounded-2xl bg-[var(--brand-bg-900)] p-4">
                <p className="text-sm font-bold">2. VTuber 登録</p>
                <p className="mt-1 text-xs text-[var(--brand-text-muted)]">電話番号を必須にし、電話確認後に配信枠作成が有効になります。</p>
              </div>
              <div className="rounded-2xl bg-[var(--brand-bg-900)] p-4">
                <p className="text-sm font-bold">3. アカウント管理</p>
                <p className="mt-1 text-xs text-[var(--brand-text-muted)]">プロフィール編集、メール確認、電話確認、規約同意状況を `/account` で管理します。</p>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] bg-[var(--brand-surface)] p-6 shadow-xl shadow-black/20">
            <p className="text-sm font-bold">注意</p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--brand-text-muted)]">
              今回の Google / メール / 電話確認はローカル検証用のモック実装です。外部送信は行わず、次の画面で確認コードを直接入力する方式です。
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}
