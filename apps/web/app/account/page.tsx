"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "../components/home/TopNav";
import { createCheckout, cancelBillingSubscription, listBillingSubscriptions } from "../lib/billing";
import { getMonitoringSummary } from "../lib/monitoring";
import { planLabel } from "../lib/planAccess";
import { createUserReport, listReports } from "../lib/reports";
import { useUserSession } from "../lib/userSession";
import type {
  BillingSubscription,
  ConsentRecord,
  MonitoringSummary,
  ReportCategory,
  ReportRecord,
  ReportTargetType,
  SessionUser,
} from "../lib/apiTypes";

const SETTINGS_STORAGE_KEY = "aiment.account-settings.ui.v1";

type AccountUiSettings = {
  mfaEnabled: boolean;
  passkeyEnabled: boolean;
  improveDataUsage: boolean;
  personalization: boolean;
  emailNotification: boolean;
  liveNotification: boolean;
  marketingNotification: boolean;
};

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

function ToggleItem({
  label,
  description,
  on,
  onChange,
}: {
  label: string;
  description: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="rounded-lg bg-[var(--brand-surface)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--brand-text)]">{label}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--brand-text-muted)]">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(!on)}
          className={`relative h-6 w-11 rounded-full transition ${on ? "bg-[var(--brand-secondary)]" : "bg-[var(--brand-bg-800)]"}`}
          aria-pressed={on}
          aria-label={label}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--brand-text)] transition ${on ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-[var(--brand-surface-soft)] p-5 md:p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold tracking-[0.03em] text-[var(--brand-text)]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[var(--brand-text-muted)]">{subtitle}</p> : null}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, refreshSession, logout } = useUserSession();

  const [draft, setDraft] = useState<SessionUser | null>(null);
  const [uiSettings, setUiSettings] = useState<AccountUiSettings | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [devEmailCode, setDevEmailCode] = useState<string | null>(null);
  const [devPhoneCode, setDevPhoneCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [subscriptions, setSubscriptions] = useState<BillingSubscription[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [monitoringSummary, setMonitoringSummary] = useState<MonitoringSummary | null>(null);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [reportTargetType, setReportTargetType] = useState<ReportTargetType>("session");
  const [reportTargetId, setReportTargetId] = useState("");
  const [reportCategory, setReportCategory] = useState<ReportCategory>("other");
  const [reportDetails, setReportDetails] = useState("");

  const defaultUiSettings = useMemo<AccountUiSettings>(
    () => ({
      mfaEnabled: true,
      passkeyEnabled: false,
      improveDataUsage: true,
      personalization: true,
      emailNotification: true,
      liveNotification: true,
      marketingNotification: false,
    }),
    [],
  );

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/auth");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    setDraft(user);
  }, [user]);

  useEffect(() => {
    if (uiSettings) return;
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AccountUiSettings>;
        setUiSettings({ ...defaultUiSettings, ...parsed });
        return;
      }
    } catch {
      // ignore invalid local state
    }
    setUiSettings(defaultUiSettings);
  }, [defaultUiSettings, uiSettings]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const sync = async () => {
      const [billing, monitoring, consentPayload, reportPayload] = await Promise.all([
        listBillingSubscriptions().catch(() => ({ subscriptions: [], paymentEvents: [] })),
        getMonitoringSummary().catch(() => ({ summary: null })),
        request<{ consents: ConsentRecord[] }>("/api/account/consents").catch(() => ({ consents: [] })),
        listReports().catch(() => ({ reports: [] })),
      ]);

      setSubscriptions(billing.subscriptions);
      setMonitoringSummary(monitoring.summary);
      setConsents(consentPayload.consents);
      setReports(reportPayload.reports);
    };

    void sync();
  }, [isAuthenticated]);

  const updateUiSetting = <K extends keyof AccountUiSettings>(key: K, value: AccountUiSettings[K]) => {
    setUiSettings((prev) => {
      if (!prev) return prev;
      setHasChanges(true);
      return { ...prev, [key]: value };
    });
  };

  if (!isAuthenticated || !draft || !uiSettings) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
        <TopNav />
      </div>
    );
  }

  const saveAll = async (event?: FormEvent) => {
    event?.preventDefault();
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
          phoneNumber: draft.phoneNumber ?? "",
        }),
      });
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(uiSettings));
      await refreshSession();
      setHasChanges(false);
      setMessage("設定を保存しました。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setDraft(user);
    setUiSettings(defaultUiSettings);
    setHasChanges(true);
    setMessage(null);
    setError(null);
  };

  const startCheckout = async (plan: "supporter" | "premium") => {
    setBillingLoading(true);
    setMessage(null);
    setError(null);
    try {
      const result = await createCheckout({ plan });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      const billing = await listBillingSubscriptions();
      setSubscriptions(billing.subscriptions);
      await refreshSession();
      setMessage(`${planLabel(plan)} プランを有効化しました。`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "課金処理に失敗しました。");
    } finally {
      setBillingLoading(false);
    }
  };

  const cancelCurrentSubscription = async (subscriptionId: string) => {
    setBillingLoading(true);
    setMessage(null);
    setError(null);
    try {
      await cancelBillingSubscription(subscriptionId);
      const billing = await listBillingSubscriptions();
      setSubscriptions(billing.subscriptions);
      await refreshSession();
      setMessage("サブスクリプション解約を受け付けました。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "解約に失敗しました。");
    } finally {
      setBillingLoading(false);
    }
  };

  const submitReport = async () => {
    setMessage(null);
    setError(null);
    try {
      await createUserReport({
        targetType: reportTargetType,
        targetId: reportTargetId,
        category: reportCategory,
        details: reportDetails,
      });
      const nextReports = await listReports();
      setReports(nextReports.reports);
      setReportTargetId("");
      setReportDetails("");
      setReportCategory("other");
      setMessage("通報を送信しました。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "通報に失敗しました。");
    }
  };

  const currentSubscription = subscriptions.find((entry) => entry.status !== "canceled") ?? null;

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] pb-16">
      <TopNav />

      <main className="mx-auto mt-6 max-w-[1080px] px-4 md:px-8">
        <header className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--brand-text-muted)]">Account Settings</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-[0.03em] text-[var(--brand-text)]">アカウント設定</h1>
          </div>
          <p className="mt-2 text-sm text-[var(--brand-text-muted)]">Platform-Base の設定画面レイアウトに合わせつつ、保存と認証確認は現在の backend を利用しています。</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void saveAll()}
              className="h-10 rounded-lg bg-[var(--brand-secondary)] px-4 text-sm font-semibold text-[var(--brand-bg-900)] disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "保存中..." : "変更を保存"}
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="h-10 rounded-lg bg-[var(--brand-surface)] px-4 text-sm font-medium text-[var(--brand-text)]"
            >
              リセット
            </button>
            {hasChanges ? <p className="text-sm text-[var(--brand-text-muted)]">未保存の変更があります。</p> : null}
          </div>
          {message ? <p className="mt-3 text-sm text-[var(--brand-secondary)]">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-[var(--brand-accent)]">{error}</p> : null}
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="プロフィール" subtitle="表示情報と基本アカウント情報">
            <form onSubmit={saveAll} className="space-y-3">
              <div className="rounded-lg bg-[var(--brand-surface)] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Profile Image</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-[var(--brand-bg-800)]">
                    <div className="grid h-full w-full place-items-center bg-[color-mix(in_srgb,var(--brand-secondary)_20%,var(--brand-bg-800))] text-sm font-bold text-[var(--brand-secondary)]">
                      {draft.name.slice(0, 1).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 rounded-lg bg-[var(--brand-bg-800)] px-3 py-2 text-xs text-[var(--brand-text-muted)]">
                    アバター画像の保存 API は未実装です。現在は設定 UI のみを揃えています。
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-[var(--brand-surface)] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Display Name</p>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) => {
                    setDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev));
                    setHasChanges(true);
                  }}
                  className="mt-2 h-10 w-full rounded-lg bg-[var(--brand-bg-800)] px-3 text-sm text-[var(--brand-text)] outline-none ring-1 ring-transparent focus:ring-[var(--brand-secondary)]"
                />
              </div>

              <div className="rounded-lg bg-[var(--brand-surface)] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">User ID</p>
                <input
                  type="text"
                  value={draft.id}
                  readOnly
                  className="mt-2 h-10 w-full rounded-lg bg-[var(--brand-bg-800)] px-3 text-sm text-[var(--brand-text-muted)] outline-none"
                />
              </div>

              {draft.role === "vtuber" ? (
                <>
                  <div className="rounded-lg bg-[var(--brand-surface)] p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Channel Name</p>
                    <input
                      type="text"
                      value={draft.channelName ?? ""}
                      onChange={(event) => {
                        setDraft((prev) => (prev ? { ...prev, channelName: event.target.value } : prev));
                        setHasChanges(true);
                      }}
                      className="mt-2 h-10 w-full rounded-lg bg-[var(--brand-bg-800)] px-3 text-sm text-[var(--brand-text)] outline-none ring-1 ring-transparent focus:ring-[var(--brand-secondary)]"
                    />
                  </div>
                  <div className="rounded-lg bg-[var(--brand-surface)] p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Bio</p>
                    <textarea
                      value={draft.bio ?? ""}
                      onChange={(event) => {
                        setDraft((prev) => (prev ? { ...prev, bio: event.target.value } : prev));
                        setHasChanges(true);
                      }}
                      rows={4}
                      className="mt-2 w-full rounded-lg bg-[var(--brand-bg-800)] px-3 py-3 text-sm text-[var(--brand-text)] outline-none ring-1 ring-transparent focus:ring-[var(--brand-secondary)]"
                    />
                  </div>
                </>
              ) : null}
            </form>
          </SectionCard>

          <SectionCard title="セキュリティ" subtitle="ログイン方法と本人確認">
            <div className="rounded-lg bg-[var(--brand-surface)] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">ログイン方法</p>
              <p className="mt-1 text-sm text-[var(--brand-text)]">{draft.authProvider}</p>
            </div>
            <div className="rounded-lg bg-[var(--brand-surface)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--brand-text)]">メールアドレス確認</p>
                  <p className="mt-1 text-xs text-[var(--brand-text-muted)]">{draft.emailVerifiedAt ? "確認済み" : "未確認"}</p>
                </div>
                {!draft.emailVerifiedAt ? (
                  <button
                    type="button"
                    onClick={() => {
                      void request<{ devCode: string }>("/api/account/verify/email/request", { method: "POST" }).then((payload) => {
                        setDevEmailCode(payload.devCode);
                        setMessage("メール確認コードを発行しました。");
                        setError(null);
                      }).catch((caughtError) => {
                        setError(caughtError instanceof Error ? caughtError.message : "失敗しました。");
                      });
                    }}
                    className="rounded-lg bg-[var(--brand-secondary)] px-3 py-2 text-xs font-semibold text-[var(--brand-bg-900)]"
                  >
                    コード送信
                  </button>
                ) : null}
              </div>
              {!draft.emailVerifiedAt ? (
                <div className="mt-3 space-y-2">
                  {devEmailCode ? <p className="text-xs text-[var(--brand-secondary)]">開発用コード: {devEmailCode}</p> : null}
                  <div className="flex gap-2">
                    <input
                      value={emailCode}
                      onChange={(event) => setEmailCode(event.target.value)}
                      placeholder="確認コード"
                      className="h-10 flex-1 rounded-lg bg-[var(--brand-bg-800)] px-3 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void request("/api/account/verify/email/confirm", {
                          method: "POST",
                          body: JSON.stringify({ code: emailCode }),
                        }).then(async () => {
                          await refreshSession();
                          setMessage("メール確認が完了しました。");
                          setDevEmailCode(null);
                          setEmailCode("");
                          setError(null);
                        }).catch((caughtError) => {
                          setError(caughtError instanceof Error ? caughtError.message : "失敗しました。");
                        });
                      }}
                      className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-xs font-semibold text-[var(--brand-text)]"
                    >
                      確認する
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="rounded-lg bg-[var(--brand-surface)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--brand-text)]">電話番号</p>
                  <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                    {draft.phoneVerifiedAt ? "確認済み" : draft.phoneNumber ? "未確認 — 下記で認証してください" : "未登録"}
                  </p>
                </div>
              </div>
              {!draft.phoneVerifiedAt ? (
                <input
                  type="tel"
                  value={draft.phoneNumber ?? ""}
                  onChange={(event) => {
                    setDraft((prev) => (prev ? { ...prev, phoneNumber: event.target.value || undefined } : prev));
                    setHasChanges(true);
                  }}
                  placeholder="+81 90-0000-0000"
                  className="mt-3 h-10 w-full rounded-lg bg-[var(--brand-bg-800)] px-3 text-sm text-[var(--brand-text)] outline-none ring-1 ring-transparent focus:ring-[var(--brand-secondary)]"
                />
              ) : (
                <p className="mt-2 text-sm text-[var(--brand-text)]">{draft.phoneNumber}</p>
              )}
              {draft.phoneNumber && !draft.phoneVerifiedAt ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-[var(--brand-text-muted)]">「変更を保存」後にコードを送信できます。</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void request<{ devCode: string }>("/api/account/verify/phone/request", { method: "POST" }).then((payload) => {
                          setDevPhoneCode(payload.devCode);
                          setMessage("電話確認コードを発行しました。");
                          setError(null);
                        }).catch((caughtError) => {
                          setError(caughtError instanceof Error ? caughtError.message : "失敗しました。");
                        });
                      }}
                      className="rounded-lg bg-[var(--brand-secondary)] px-3 py-2 text-xs font-semibold text-[var(--brand-bg-900)]"
                    >
                      コード送信
                    </button>
                  </div>
                  {devPhoneCode ? <p className="text-xs text-[var(--brand-secondary)]">開発用コード: {devPhoneCode}</p> : null}
                  {devPhoneCode ? (
                    <div className="flex gap-2">
                      <input
                        value={phoneCode}
                        onChange={(event) => setPhoneCode(event.target.value)}
                        placeholder="SMSコード"
                        className="h-10 flex-1 rounded-lg bg-[var(--brand-bg-800)] px-3 text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void request("/api/account/verify/phone/confirm", {
                            method: "POST",
                            body: JSON.stringify({ code: phoneCode }),
                          }).then(async () => {
                            await refreshSession();
                            setMessage("電話番号確認が完了しました。");
                            setDevPhoneCode(null);
                            setPhoneCode("");
                            setError(null);
                          }).catch((caughtError) => {
                            setError(caughtError instanceof Error ? caughtError.message : "失敗しました。");
                          });
                        }}
                        className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-xs font-semibold text-[var(--brand-text)]"
                      >
                        確認する
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <ToggleItem
              label="2段階認証（2FA）"
              description="新しい端末でのログイン時に追加認証を要求します。"
              on={uiSettings.mfaEnabled}
              onChange={(next) => updateUiSetting("mfaEnabled", next)}
            />
            <ToggleItem
              label="パスキー有効化"
              description="対応デバイスでパスワードレスログインを利用します。"
              on={uiSettings.passkeyEnabled}
              onChange={(next) => updateUiSetting("passkeyEnabled", next)}
            />
          </SectionCard>

          <SectionCard title="プライバシーとデータ" subtitle="収集・利用・エクスポート設定">
            <ToggleItem
              label="利用データをサービス改善に使用"
              description="操作データを品質改善に使います。"
              on={uiSettings.improveDataUsage}
              onChange={(next) => updateUiSetting("improveDataUsage", next)}
            />
            <ToggleItem
              label="パーソナライズ"
              description="おすすめ表示の最適化に利用します。"
              on={uiSettings.personalization}
              onChange={(next) => updateUiSetting("personalization", next)}
            />
            <button className="h-11 w-full rounded-lg bg-[var(--brand-surface)] text-sm font-medium text-[var(--brand-text)]">データをダウンロード</button>
            <button className="h-11 w-full rounded-lg bg-[var(--brand-surface)] text-sm font-medium text-[var(--brand-text)]">アカウントデータの削除申請</button>
          </SectionCard>

          <SectionCard title="通知" subtitle="連絡手段と受信頻度">
            <ToggleItem
              label="メール通知"
              description="重要なお知らせとセキュリティ通知を受け取ります。"
              on={uiSettings.emailNotification}
              onChange={(next) => updateUiSetting("emailNotification", next)}
            />
            <ToggleItem
              label="配信開始通知"
              description="予約中・フォロー中チャンネルの開始通知を受け取ります。"
              on={uiSettings.liveNotification}
              onChange={(next) => updateUiSetting("liveNotification", next)}
            />
            <ToggleItem
              label="マーケティング通知"
              description="キャンペーン・特典情報を受け取ります。"
              on={uiSettings.marketingNotification}
              onChange={(next) => updateUiSetting("marketingNotification", next)}
            />
          </SectionCard>

          <SectionCard title="Billing" subtitle="Stripe サブスク作成、解約、現在プラン">
            <div className="rounded-lg bg-[var(--brand-surface)] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Current Plan</p>
              <p className="mt-1 text-lg font-semibold text-[var(--brand-text)]">{planLabel(draft.plan)}</p>
              <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                Status: {draft.subscriptionStatus ?? "inactive"} {draft.subscriptionRenewsAt ? `/ Renew: ${new Date(draft.subscriptionRenewsAt).toLocaleDateString("ja-JP")}` : ""}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void startCheckout("supporter")}
                disabled={billingLoading}
                className="h-11 rounded-lg bg-[var(--brand-secondary)] px-4 text-sm font-semibold text-[var(--brand-bg-900)] disabled:opacity-60"
              >
                Supporter を開始
              </button>
              <button
                type="button"
                onClick={() => void startCheckout("premium")}
                disabled={billingLoading}
                className="h-11 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                Premium を開始
              </button>
            </div>
            {currentSubscription ? (
              <button
                type="button"
                onClick={() => void cancelCurrentSubscription(currentSubscription.subscriptionId)}
                disabled={billingLoading}
                className="h-11 w-full rounded-lg bg-[var(--brand-surface)] text-sm font-medium text-[var(--brand-text)] disabled:opacity-60"
              >
                現在のサブスクを解約
              </button>
            ) : null}
          </SectionCard>

          <SectionCard title="Monitoring" subtitle="接続失敗率、決済失敗、サーバーエラー">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[var(--brand-surface)] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Connection Failure</p>
                <p className="mt-1 text-lg font-semibold text-[var(--brand-text)]">{monitoringSummary?.connectionFailureRate ?? 0}%</p>
              </div>
              <div className="rounded-lg bg-[var(--brand-surface)] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Payment Failures</p>
                <p className="mt-1 text-lg font-semibold text-[var(--brand-text)]">{monitoringSummary?.paymentFailures ?? 0}</p>
              </div>
              <div className="rounded-lg bg-[var(--brand-surface)] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Server Errors</p>
                <p className="mt-1 text-lg font-semibold text-[var(--brand-text)]">{monitoringSummary?.serverErrors ?? 0}</p>
              </div>
              <div className="rounded-lg bg-[var(--brand-surface)] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Connection Attempts</p>
                <p className="mt-1 text-lg font-semibold text-[var(--brand-text)]">{monitoringSummary?.connectionAttempts ?? 0}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Consent History" subtitle="利用規約とプライバシー同意の保存履歴">
            {consents.length === 0 ? (
              <p className="rounded-lg bg-[var(--brand-surface)] p-4 text-sm text-[var(--brand-text-muted)]">同意履歴はまだありません。</p>
            ) : (
              consents.slice(0, 5).map((consent) => (
                <div key={consent.consentId} className="rounded-lg bg-[var(--brand-surface)] p-4 text-sm">
                  <p className="font-semibold text-[var(--brand-text)]">{consent.version}</p>
                  <p className="mt-1 text-xs text-[var(--brand-text-muted)]">{consent.source} / {new Date(consent.termsAcceptedAt).toLocaleString("ja-JP")}</p>
                </div>
              ))
            )}
          </SectionCard>

          <SectionCard title="Reports" subtitle="最低限の通報導線と保存">
            <div className="grid gap-3">
              <select
                value={reportTargetType}
                onChange={(event) => setReportTargetType(event.target.value as ReportTargetType)}
                className="h-10 rounded-lg bg-[var(--brand-surface)] px-3 text-sm outline-none"
              >
                <option value="session">配信枠</option>
                <option value="user">ユーザー</option>
                <option value="message">メッセージ</option>
                <option value="billing">決済</option>
              </select>
              <input
                value={reportTargetId}
                onChange={(event) => setReportTargetId(event.target.value)}
                placeholder="対象ID"
                className="h-10 rounded-lg bg-[var(--brand-surface)] px-3 text-sm outline-none"
              />
              <select
                value={reportCategory}
                onChange={(event) => setReportCategory(event.target.value as ReportCategory)}
                className="h-10 rounded-lg bg-[var(--brand-surface)] px-3 text-sm outline-none"
              >
                <option value="abuse">abuse</option>
                <option value="harassment">harassment</option>
                <option value="impersonation">impersonation</option>
                <option value="billing">billing</option>
                <option value="other">other</option>
              </select>
              <textarea
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                rows={4}
                placeholder="状況を記入"
                className="rounded-lg bg-[var(--brand-surface)] px-3 py-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => void submitReport()}
                className="h-11 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white"
              >
                通報を送信
              </button>
            </div>
            {reports.length > 0 ? (
              <div className="space-y-2">
                {reports.slice(0, 3).map((report) => (
                  <div key={report.reportId} className="rounded-lg bg-[var(--brand-surface)] p-4 text-sm">
                    <p className="font-semibold text-[var(--brand-text)]">{report.category} / {report.targetType}</p>
                    <p className="mt-1 text-xs text-[var(--brand-text-muted)]">{report.targetId} / {new Date(report.createdAt).toLocaleString("ja-JP")}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>
        </div>

        <section className="mt-4 rounded-xl bg-[var(--brand-surface-soft)] p-5 md:p-6">
          <h2 className="text-lg font-semibold text-[var(--brand-accent)]">Danger Zone</h2>
          <p className="mt-1 text-sm text-[var(--brand-text-muted)]">不可逆な操作です。実行前に確認してください。</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void logout().then(() => {
                  router.push("/");
                });
              }}
              className="h-11 rounded-lg bg-[var(--brand-accent)] px-5 text-sm font-semibold text-white"
            >
              ログアウト
            </button>
            <button className="h-11 rounded-lg bg-[var(--brand-accent)] px-5 text-sm font-semibold text-white">アカウントを削除</button>
          </div>
        </section>
      </main>
    </div>
  );
}
