"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "../components/home/TopNav";
import { useUserSession } from "../lib/userSession";
import type { SessionUser } from "../lib/apiTypes";

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as T & { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Request failed");
  if (!payload) throw new Error("Empty response");
  return payload;
}

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, refreshSession } = useUserSession();

  const [draft, setDraft] = useState<SessionUser | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [devEmailCode, setDevEmailCode] = useState<string | null>(null);
  const [devPhoneCode, setDevPhoneCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/auth");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    setDraft(user);
  }, [user]);

  if (!isAuthenticated || !draft) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
        <TopNav />
      </div>
    );
  }

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await request("/api/account/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: draft.name,
          channelName: draft.channelName,
          bio: draft.bio,
        }),
      });
      await refreshSession();
      setMessage("プロフィールを更新しました。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "更新に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav />

      <main className="mx-auto grid max-w-[1320px] gap-6 px-4 py-8 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <section className="rounded-[32px] bg-[var(--brand-surface)] p-6 shadow-xl shadow-black/20 lg:p-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--brand-primary)]">Account</p>
          <h1 className="mt-3 text-3xl font-black">アカウント管理</h1>

          <form onSubmit={saveProfile} className="mt-6 space-y-4">
            <label className="grid gap-1 text-sm">
              <span>表示名</span>
              <input value={draft.name} onChange={(event) => setDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))} className="rounded-xl bg-[var(--brand-bg-900)] px-3 py-3 outline-none" />
            </label>

            {draft.role === "vtuber" && (
              <>
                <label className="grid gap-1 text-sm">
                  <span>チャンネル名</span>
                  <input value={draft.channelName ?? ""} onChange={(event) => setDraft((prev) => (prev ? { ...prev, channelName: event.target.value } : prev))} className="rounded-xl bg-[var(--brand-bg-900)] px-3 py-3 outline-none" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span>プロフィール</span>
                  <textarea value={draft.bio ?? ""} onChange={(event) => setDraft((prev) => (prev ? { ...prev, bio: event.target.value } : prev))} rows={4} className="rounded-xl bg-[var(--brand-bg-900)] px-3 py-3 outline-none" />
                </label>
              </>
            )}

            <div className="rounded-2xl bg-[var(--brand-bg-900)] p-4 text-sm">
              <p className="text-[11px] text-[var(--brand-text-muted)]">メールアドレス</p>
              <p className="font-semibold">{draft.email}</p>
              <p className="mt-2 text-[11px] text-[var(--brand-text-muted)]">ログイン方法: {draft.authProvider}</p>
            </div>

            {message && <p className="rounded-xl bg-[var(--brand-primary)]/15 px-4 py-3 text-sm text-[var(--brand-primary)]">{message}</p>}
            {error && <p className="rounded-xl bg-[var(--brand-accent)]/15 px-4 py-3 text-sm text-[var(--brand-accent)]">{error}</p>}

            <button type="submit" disabled={saving} className="rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-black text-white">
              {saving ? "保存中..." : "プロフィールを保存"}
            </button>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[32px] bg-[var(--brand-accent)]/10 p-6 shadow-xl shadow-black/20">
            <p className="text-sm font-bold text-[var(--brand-accent)]">認証送信について</p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--brand-text-muted)]">
              現在のメール確認と電話確認は開発用モックです。実際にメールやSMSは送っておらず、発行した確認コードをこの画面に表示しています。
            </p>
          </section>

          <section className="rounded-[32px] bg-[var(--brand-surface)] p-6 shadow-xl shadow-black/20">
            <p className="text-sm font-bold">認証ステータス</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-[var(--brand-bg-900)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">メールアドレス確認</p>
                    <p className="mt-1 text-xs text-[var(--brand-text-muted)]">{draft.emailVerifiedAt ? "確認済み" : "未確認"}</p>
                  </div>
                  {!draft.emailVerifiedAt && (
                    <button
                      onClick={() => {
                        void request<{ devCode: string }>("/api/account/verify/email/request", { method: "POST" }).then((payload) => {
                          setDevEmailCode(payload.devCode);
                          setMessage("メール確認コードを発行しました。");
                        }).catch((caughtError) => {
                          setError(caughtError instanceof Error ? caughtError.message : "失敗しました。");
                        });
                      }}
                      className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-bold text-white"
                    >
                      コード送信
                    </button>
                  )}
                </div>
                {!draft.emailVerifiedAt && (
                  <div className="mt-3 space-y-2">
                    {devEmailCode && <p className="text-xs text-[var(--brand-primary)]">開発用コード: {devEmailCode}</p>}
                    <div className="flex gap-2">
                      <input value={emailCode} onChange={(event) => setEmailCode(event.target.value)} placeholder="確認コード" className="flex-1 rounded-lg bg-black/10 px-3 py-2 text-sm outline-none" />
                      <button
                        onClick={() => {
                          void request("/api/account/verify/email/confirm", {
                            method: "POST",
                            body: JSON.stringify({ code: emailCode }),
                          }).then(async () => {
                            await refreshSession();
                            setMessage("メール確認が完了しました。");
                            setDevEmailCode(null);
                            setEmailCode("");
                          }).catch((caughtError) => {
                            setError(caughtError instanceof Error ? caughtError.message : "失敗しました。");
                          });
                        }}
                        className="rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-xs font-bold"
                      >
                        確認する
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-[var(--brand-bg-900)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">電話番号確認</p>
                    <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                      {draft.phoneNumber ? `${draft.phoneNumber} / ${draft.phoneVerifiedAt ? "確認済み" : "未確認"}` : "未登録"}
                    </p>
                  </div>
                  {draft.role === "vtuber" && draft.phoneNumber && !draft.phoneVerifiedAt && (
                    <button
                      onClick={() => {
                        void request<{ devCode: string }>("/api/account/verify/phone/request", { method: "POST" }).then((payload) => {
                          setDevPhoneCode(payload.devCode);
                          setMessage("電話確認コードを発行しました。");
                        }).catch((caughtError) => {
                          setError(caughtError instanceof Error ? caughtError.message : "失敗しました。");
                        });
                      }}
                      className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-bold text-white"
                    >
                      コード送信
                    </button>
                  )}
                </div>
                {draft.role === "vtuber" && draft.phoneNumber && !draft.phoneVerifiedAt && (
                  <div className="mt-3 space-y-2">
                    {devPhoneCode && <p className="text-xs text-[var(--brand-primary)]">開発用コード: {devPhoneCode}</p>}
                    <div className="flex gap-2">
                      <input value={phoneCode} onChange={(event) => setPhoneCode(event.target.value)} placeholder="SMSコード" className="flex-1 rounded-lg bg-black/10 px-3 py-2 text-sm outline-none" />
                      <button
                        onClick={() => {
                          void request("/api/account/verify/phone/confirm", {
                            method: "POST",
                            body: JSON.stringify({ code: phoneCode }),
                          }).then(async () => {
                            await refreshSession();
                            setMessage("電話番号確認が完了しました。VTuber配信権限が有効です。");
                            setDevPhoneCode(null);
                            setPhoneCode("");
                          }).catch((caughtError) => {
                            setError(caughtError instanceof Error ? caughtError.message : "失敗しました。");
                          });
                        }}
                        className="rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-xs font-bold"
                      >
                        確認する
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] bg-[var(--brand-surface)] p-6 shadow-xl shadow-black/20">
            <p className="text-sm font-bold">登録情報</p>
            <div className="mt-3 space-y-2 text-xs text-[var(--brand-text-muted)]">
              <p>ロール: {draft.role}</p>
              <p>登録日: {new Date(draft.createdAt).toLocaleString("ja-JP")}</p>
              <p>最終ログイン: {draft.lastLoginAt ? new Date(draft.lastLoginAt).toLocaleString("ja-JP") : "-"}</p>
              <p>規約同意: {draft.termsAcceptedAt ? "済" : "未"}</p>
              <p>プライバシー同意: {draft.privacyAcceptedAt ? "済" : "未"}</p>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
