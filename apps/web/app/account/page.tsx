"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellAlertIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { TopNav } from "../components/home/TopNav";
import { PaymentModal } from "../components/billing/PaymentModal";
import {
  createCheckout,
  cancelBillingSubscription,
  listBillingSubscriptions,
  listTicketPurchases,
} from "../lib/billing";
// SOLID: S（決済UIの制御をPaymentModalに委譲し、ページの責任をアカウント管理に絞る）
import { getMonitoringSummary } from "../lib/monitoring";
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
  TicketPurchase,
} from "../lib/apiTypes";

const SETTINGS_STORAGE_KEY_PREFIX = "aiment.account-settings.ui.v1";
const IS_DEV = process.env.NODE_ENV !== "production";

type AccountUiSettings = {
  mfaEnabled: boolean;
  passkeyEnabled: boolean;
  improveDataUsage: boolean;
  personalization: boolean;
  emailNotification: boolean;
  liveNotification: boolean;
  marketingNotification: boolean;
};

type AccountTab = "profile" | "security" | "notifications" | "billing" | "ops";

type AccountSnapshot = {
  draft: SessionUser;
  uiSettings: AccountUiSettings;
};

const ACCOUNT_TABS: Array<{
  key: AccountTab;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = [
  { key: "profile", label: "プロフィール", Icon: UserCircleIcon },
  { key: "security", label: "セキュリティ", Icon: ShieldCheckIcon },
  { key: "notifications", label: "通知・データ", Icon: BellAlertIcon },
  { key: "billing", label: "課金", Icon: CreditCardIcon },
  { key: "ops", label: "運用", Icon: WrenchScrewdriverIcon },
];

function getSettingsStorageKey(userId: string) {
  return `${SETTINGS_STORAGE_KEY_PREFIX}:${userId}`;
}

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
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl bg-[var(--brand-surface-soft)] p-5 md:p-6 ${className ?? ""}`}>
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
  const [ticketPurchases, setTicketPurchases] = useState<TicketPurchase[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ clientSecret: string; title: string; onSuccess: () => Promise<void> } | null>(null);
  const [monitoringSummary, setMonitoringSummary] = useState<MonitoringSummary | null>(null);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [reportTargetType, setReportTargetType] = useState<ReportTargetType>("session");
  const [reportTargetId, setReportTargetId] = useState("");
  const [reportCategory, setReportCategory] = useState<ReportCategory>("other");
  const [reportDetails, setReportDetails] = useState("");
  const [phoneCodeRequested, setPhoneCodeRequested] = useState(false);
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");
  const [initialSnapshot, setInitialSnapshot] = useState<AccountSnapshot | null>(null);

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
    if (!user?.id) return;
    setDraft(user);
    try {
      const raw = window.localStorage.getItem(getSettingsStorageKey(user.id));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AccountUiSettings>;
        const merged = { ...defaultUiSettings, ...parsed };
        setUiSettings(merged);
        setInitialSnapshot({ draft: user, uiSettings: merged });
        setHasChanges(false);
        return;
      }
    } catch {
      // ignore invalid local state
    }
    setUiSettings(defaultUiSettings);
    setInitialSnapshot({ draft: user, uiSettings: defaultUiSettings });
    setHasChanges(false);
  }, [defaultUiSettings, user]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const sync = async () => {
      const [billing, tickets, monitoring, consentPayload, reportPayload] = await Promise.all([
        listBillingSubscriptions().catch(() => ({ subscriptions: [], paymentEvents: [] })),
        listTicketPurchases().catch(() => ({ purchases: [] })),
        getMonitoringSummary().catch(() => ({ summary: null })),
        request<{ consents: ConsentRecord[] }>("/api/account/consents").catch(() => ({ consents: [] })),
        listReports().catch(() => ({ reports: [] })),
      ]);

      setSubscriptions(billing.subscriptions);
      setTicketPurchases(tickets.purchases);
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
          avatarUrl: draft.avatarUrl ?? "",
          headerUrl: draft.headerUrl ?? "",
        }),
      });
      if (user?.id) {
        window.localStorage.setItem(getSettingsStorageKey(user.id), JSON.stringify(uiSettings));
      }
      await refreshSession();
      setInitialSnapshot({ draft: { ...draft }, uiSettings: { ...uiSettings } });
      setHasChanges(false);
      setMessage("設定を保存しました。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    if (!initialSnapshot) return;
    setDraft({ ...initialSnapshot.draft });
    setUiSettings({ ...initialSnapshot.uiSettings });
    setHasChanges(false);
    setMessage(null);
    setError(null);
  };

  const startCheckout = async () => {
    setBillingLoading(true);
    setMessage(null);
    setError(null);
    try {
      const result = await createCheckout({ plan: "aimer" });
      if (result.clientSecret) {
        setPaymentModal({
          clientSecret: result.clientSecret,
          title: "Aimerプランに登録",
          onSuccess: async () => {
            setPaymentModal(null);
            const billing = await listBillingSubscriptions();
            setSubscriptions(billing.subscriptions);
            await refreshSession();
            setMessage("Aimer プランを有効化しました。");
          },
        });
        return;
      }
      // モックモード: clientSecretなしで即時反映
      const billing = await listBillingSubscriptions();
      setSubscriptions(billing.subscriptions);
      await refreshSession();
      setMessage("Aimer プランを有効化しました。");
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
  const activeTicketPurchases = ticketPurchases.filter((entry) => entry.status === "active");
  const currentPlanLabel = draft.plan === "aimer" ? "Aimer" : "free";
  const isAimerPlan = draft.plan === "aimer";
  const subscriptionRenewsAt = draft.subscriptionRenewsAt ?? currentSubscription?.currentPeriodEnd;

  const handleAvatarFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください。");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("画像サイズは2MB以下にしてください。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setDraft((prev) => (prev ? { ...prev, avatarUrl: result } : prev));
      setHasChanges(true);
      setMessage(null);
      setError(null);
    };
    reader.onerror = () => {
      setError("画像の読み込みに失敗しました。");
    };
    reader.readAsDataURL(file);
  };

  const handleHeaderFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください。");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("画像サイズは4MB以下にしてください。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setDraft((prev) => (prev ? { ...prev, headerUrl: result } : prev));
      setHasChanges(true);
      setMessage(null);
      setError(null);
    };
    reader.onerror = () => {
      setError("画像の読み込みに失敗しました。");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)]">
      <TopNav />

      <main className="min-h-[calc(100vh-72px)] lg:grid lg:grid-cols-[240px_1fr]">
        <aside className="bg-[var(--brand-surface)] p-3 lg:min-h-[calc(100vh-72px)] lg:rounded-none">
          <div className="lg:sticky lg:top-[84px]">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--brand-text-muted)]">
              ACCOUNT MENU
            </p>
            <div className="space-y-1">
              {ACCOUNT_TABS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold transition ${
                    activeTab === key
                      ? "bg-[var(--brand-primary)] text-white"
                      : "bg-[var(--brand-surface)] text-[var(--brand-text)]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 px-4 py-6 pb-16 lg:px-8">
          <div className="w-full">
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
          {activeTab === "profile" ? (
            <SectionCard title="プロフィール" subtitle="表示情報と基本アカウント情報" className="lg:col-span-2">
              <form onSubmit={saveAll} className="space-y-4">
                <div className="rounded-lg bg-[var(--brand-surface)] p-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="overflow-hidden rounded-lg bg-[var(--brand-bg-800)]">
                      <div className="relative">
                        {draft.headerUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={draft.headerUrl} alt="Header" className="h-56 w-full object-cover" />
                        ) : (
                          <div className="grid h-56 w-full place-items-center text-sm font-semibold text-[var(--brand-text-muted)]">
                            ヘッダー画像なし
                          </div>
                        )}
                        <div className="absolute -bottom-10 left-6 h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--brand-surface)] bg-[var(--brand-bg-800)]">
                          {draft.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={draft.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xl font-bold text-[var(--brand-primary)]">
                              {draft.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-6 pt-12">
                        <p className="text-lg font-semibold text-[var(--brand-text)]">{draft.channelName || draft.name}</p>
                        <p className="mt-1 text-sm text-[var(--brand-text-muted)]">{draft.role === "vtuber" ? "VTuber" : "Listener"}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg bg-[var(--brand-surface-soft)] p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Header Image</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <label className="ui-btn ui-btn-sm ui-btn-ghost cursor-pointer">
                            画像をアップロード
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleHeaderFileChange(e.target.files?.[0] ?? null)}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setDraft((prev) => (prev ? { ...prev, headerUrl: undefined } : prev));
                              setHasChanges(true);
                            }}
                            className="ui-btn ui-btn-sm ui-btn-ghost"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                      <div className="rounded-lg bg-[var(--brand-surface-soft)] p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Profile Image</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <label className="ui-btn ui-btn-sm ui-btn-ghost cursor-pointer">
                            画像をアップロード
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleAvatarFileChange(e.target.files?.[0] ?? null)}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setDraft((prev) => (prev ? { ...prev, avatarUrl: undefined } : prev));
                              setHasChanges(true);
                            }}
                            className="ui-btn ui-btn-sm ui-btn-ghost"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
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
                </div>

                {draft.role === "vtuber" ? (
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
                ) : null}

                <div className="rounded-lg bg-[var(--brand-surface)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">紹介文</p>
                  <textarea
                    value={draft.bio ?? ""}
                    onChange={(event) => {
                      setDraft((prev) => (prev ? { ...prev, bio: event.target.value } : prev));
                      setHasChanges(true);
                    }}
                    rows={6}
                    className="mt-2 w-full rounded-lg bg-[var(--brand-bg-800)] px-3 py-3 text-sm text-[var(--brand-text)] outline-none ring-1 ring-transparent focus:ring-[var(--brand-secondary)]"
                  />
                </div>
              </form>
            </SectionCard>
          ) : null}

          {activeTab === "security" ? (
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
                        setDevEmailCode(IS_DEV ? payload.devCode : null);
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
                  {IS_DEV && devEmailCode ? <p className="text-xs text-[var(--brand-secondary)]">開発用コード: {devEmailCode}</p> : null}
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
                <>
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
                  {draft.phoneNumber && draft.phoneNumber !== user?.phoneNumber ? (
                    <p className="mt-1 text-xs text-[var(--brand-text-muted)]">「変更を保存」後にコードを送信できます。</p>
                  ) : null}
                </>
              ) : (
                <p className="mt-2 text-sm text-[var(--brand-text)]">{draft.phoneNumber}</p>
              )}
              {user?.phoneNumber && user.phoneNumber === draft.phoneNumber && !draft.phoneVerifiedAt ? (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void request<{ devCode: string }>("/api/account/verify/phone/request", { method: "POST" }).then((payload) => {
                          setDevPhoneCode(IS_DEV ? payload.devCode : null);
                          setPhoneCodeRequested(true);
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
                  {IS_DEV && devPhoneCode ? <p className="text-xs text-[var(--brand-secondary)]">開発用コード: {devPhoneCode}</p> : null}
                  {phoneCodeRequested ? (
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
                            setPhoneCodeRequested(false);
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
          ) : null}

          {activeTab === "notifications" ? (
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
          ) : null}

          {activeTab === "notifications" ? (
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
          ) : null}

          {activeTab === "billing" ? (
            <SectionCard title="Billing" subtitle="Aimer サブスクと購入済み 1on1 チケット">
            <div className="rounded-lg bg-[var(--brand-surface)] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Subscription</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-[var(--brand-text-muted)]">現在のプラン</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--brand-text)]">{currentPlanLabel}</p>
                  {isAimerPlan ? (
                    <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                      次回更新日: {subscriptionRenewsAt ? new Date(subscriptionRenewsAt).toLocaleDateString("ja-JP") : "未定"}
                    </p>
                  ) : null}
                </div>
                {!isAimerPlan ? (
                  <button
                    type="button"
                    onClick={() => void startCheckout()}
                    disabled={billingLoading}
                    className="h-11 rounded-lg bg-[var(--brand-secondary)] px-4 text-sm font-semibold text-[var(--brand-bg-900)] disabled:opacity-60"
                  >
                    Aimerプランに登録 PHP 1,098/月
                  </button>
                ) : currentSubscription ? (
                  <button
                    type="button"
                    onClick={() => void cancelCurrentSubscription(currentSubscription.subscriptionId)}
                    disabled={billingLoading}
                    className="h-11 rounded-lg bg-[var(--brand-surface-soft)] px-4 text-sm font-medium text-[var(--brand-text)] disabled:opacity-60"
                  >
                    解約する
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg bg-[var(--brand-surface)] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">1on1 Tickets</p>
              <div className="mt-4 space-y-2">
                {activeTicketPurchases.length === 0 ? (
                  <p className="rounded-lg bg-[var(--brand-surface-soft)] p-3 text-sm text-[var(--brand-text-muted)]">有効なチケットはありません。</p>
                ) : (
                  activeTicketPurchases.map((purchase) => (
                    <div key={purchase.purchaseId} className="rounded-lg bg-[var(--brand-surface-soft)] p-3 text-sm">
                      <p className="font-semibold text-[var(--brand-text)]">
                        {purchase.ticketType === "1on1_10min" ? "10分チケット" : "30分チケット"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                        対象: @{purchase.targetUserId} / 購入日: {new Date(purchase.createdAt).toLocaleDateString("ja-JP")} / status: {purchase.status}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
            </SectionCard>
          ) : null}

          {activeTab === "ops" ? (
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
          ) : null}

          {activeTab === "security" ? (
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
          ) : null}

          {activeTab === "ops" ? (
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
          ) : null}
            </div>

            {activeTab === "profile" ? (
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
            ) : null}
          </div>
        </section>
      </main>

      {paymentModal ? (
        <PaymentModal
          clientSecret={paymentModal.clientSecret}
          title={paymentModal.title}
          onSuccess={() => void paymentModal.onSuccess()}
          onClose={() => {
            setPaymentModal(null);
            setBillingLoading(false);
          }}
        />
      ) : null}
    </div>
  );
}
