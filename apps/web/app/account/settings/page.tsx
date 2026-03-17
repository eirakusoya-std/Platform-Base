"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TopNav } from "../../components/home/TopNav";
import { useUserSession } from "../../lib/userSession";

const SETTINGS_STORAGE_KEY = "aiment.account-settings.v1";

type AccountSettingsState = {
  profileImageUrl: string;
  displayName: string;
  userId: string;
  mfaEnabled: boolean;
  passkeyEnabled: boolean;
  improveDataUsage: boolean;
  personalization: boolean;
  emailNotification: boolean;
  liveNotification: boolean;
  marketingNotification: boolean;
};

type ToggleProps = {
  label: string;
  description: string;
  on: boolean;
  onChange: (next: boolean) => void;
};

function ToggleItem({ label, description, on, onChange }: ToggleProps) {
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
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--brand-text)] transition ${on ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-[var(--brand-surface-soft)] p-5 md:p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold tracking-[0.03em] text-[var(--brand-text)]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-[var(--brand-text-muted)]">{subtitle}</p>}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function AccountSettingsPage() {
  const { user, isAuthenticated, hydrated, updateUser, logout } = useUserSession();
  const [settings, setSettings] = useState<AccountSettingsState | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [hasChanges, setHasChanges] = useState(false);

  const defaultSettings = useMemo<AccountSettingsState>(
    () => ({
      profileImageUrl: user?.avatarUrl ?? "",
      displayName: user?.name ?? "田中太郎",
      userId: user?.id ?? "aiment_00021",
      mfaEnabled: true,
      passkeyEnabled: false,
      improveDataUsage: true,
      personalization: true,
      emailNotification: true,
      liveNotification: true,
      marketingNotification: false,
    }),
    [user],
  );

  useEffect(() => {
    if (!hydrated || settings) return;

    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AccountSettingsState>;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettings({ ...defaultSettings, ...parsed });
      } else {
        setSettings(defaultSettings);
      }
    } catch {
      setSettings(defaultSettings);
    }
  }, [defaultSettings, hydrated, settings]);

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const timer = window.setTimeout(() => setSaveStatus("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [saveStatus]);

  const updateSetting = <K extends keyof AccountSettingsState>(key: K, value: AccountSettingsState[K]) => {
    setSettings((prev) => {
      if (!prev) return prev;
      setHasChanges(true);
      return { ...prev, [key]: value };
    });
  };

  const handleSave = () => {
    if (!settings) return;

    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      if (isAuthenticated) {
        const nextName = settings.displayName.trim();
        const nextUserId = settings.userId.trim();
        const nextAvatar = settings.profileImageUrl.trim();

        updateUser({
          name: nextName || user?.name || "ユーザー",
          id: nextUserId || user?.id || "aiment_00021",
          avatarUrl: nextAvatar || undefined,
        });
      }
      setHasChanges(false);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
    setSaveStatus("idle");
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg-900)]">
        <TopNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] pb-16">
      <TopNav />

      <main className="mx-auto mt-6 max-w-[1080px] px-4 md:px-8">
        <header className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--brand-text-muted)]">Account Settings</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-[0.03em] text-[var(--brand-text)]">アカウント設定</h1>
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-lg bg-[var(--brand-surface)] px-4 text-sm font-medium text-[var(--brand-text)]"
            >
              ホームへ戻る
            </Link>
          </div>
          <p className="mt-2 text-sm text-[var(--brand-text-muted)]">プロフィール、セキュリティ、通知、データ利用の設定を管理します。</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="h-10 rounded-lg bg-[var(--brand-secondary)] px-4 text-sm font-semibold text-[var(--brand-bg-900)] disabled:opacity-60"
              disabled={!hasChanges}
            >
              変更を保存
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="h-10 rounded-lg bg-[var(--brand-surface)] px-4 text-sm font-medium text-[var(--brand-text)]"
            >
              リセット
            </button>
            {saveStatus === "saved" && <p className="text-sm text-[var(--brand-secondary)]">保存しました。</p>}
            {saveStatus === "error" && <p className="text-sm text-[var(--brand-accent)]">保存に失敗しました。</p>}
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="プロフィール" subtitle="表示情報と基本アカウント情報">
            <div className="rounded-lg bg-[var(--brand-surface)] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Profile Image</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-[var(--brand-bg-800)]">
                  {settings.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={settings.profileImageUrl} alt={settings.displayName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-[color-mix(in_srgb,var(--brand-secondary)_20%,var(--brand-bg-800))]" />
                  )}
                </div>
                <input
                  type="url"
                  value={settings.profileImageUrl}
                  onChange={(event) => updateSetting("profileImageUrl", event.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="h-9 flex-1 rounded-lg bg-[var(--brand-bg-800)] px-3 text-xs text-[var(--brand-text)] outline-none ring-1 ring-transparent focus:ring-[var(--brand-secondary)]"
                />
              </div>
            </div>
            <div className="rounded-lg bg-[var(--brand-surface)] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">Display Name</p>
              <input
                type="text"
                value={settings.displayName}
                onChange={(event) => updateSetting("displayName", event.target.value)}
                className="mt-2 h-10 w-full rounded-lg bg-[var(--brand-bg-800)] px-3 text-sm text-[var(--brand-text)] outline-none ring-1 ring-transparent focus:ring-[var(--brand-secondary)]"
              />
            </div>
            <div className="rounded-lg bg-[var(--brand-surface)] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">User ID</p>
              <input
                type="text"
                value={settings.userId}
                onChange={(event) => updateSetting("userId", event.target.value)}
                className="mt-2 h-10 w-full rounded-lg bg-[var(--brand-bg-800)] px-3 text-sm text-[var(--brand-text)] outline-none ring-1 ring-transparent focus:ring-[var(--brand-secondary)]"
              />
            </div>
          </SectionCard>

          <SectionCard title="セキュリティ" subtitle="ログイン方法とデバイス管理">
            <div className="rounded-lg bg-[var(--brand-surface)] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">ログイン方法</p>
              <p className="mt-1 text-sm text-[var(--brand-text)]">Google OAuth</p>
            </div>
            <ToggleItem
              label="2段階認証（2FA）"
              description="新しい端末でのログイン時に追加認証を要求します。"
              on={settings.mfaEnabled}
              onChange={(next) => updateSetting("mfaEnabled", next)}
            />
            <ToggleItem
              label="パスキー有効化"
              description="対応デバイスでパスワードレスログインを利用します。"
              on={settings.passkeyEnabled}
              onChange={(next) => updateSetting("passkeyEnabled", next)}
            />
            <button className="h-11 w-full rounded-lg bg-[var(--brand-surface)] text-sm font-medium text-[var(--brand-text)]">ログイン中デバイスを確認</button>
          </SectionCard>

          <SectionCard title="プライバシーとデータ" subtitle="収集・利用・エクスポート設定">
            <ToggleItem
              label="利用データをサービス改善に使用"
              description="操作データを品質改善に使います。"
              on={settings.improveDataUsage}
              onChange={(next) => updateSetting("improveDataUsage", next)}
            />
            <ToggleItem
              label="パーソナライズ"
              description="おすすめ表示の最適化に利用します。"
              on={settings.personalization}
              onChange={(next) => updateSetting("personalization", next)}
            />
            <button className="h-11 w-full rounded-lg bg-[var(--brand-surface)] text-sm font-medium text-[var(--brand-text)]">データをダウンロード</button>
            <button className="h-11 w-full rounded-lg bg-[var(--brand-surface)] text-sm font-medium text-[var(--brand-text)]">アカウントデータの削除申請</button>
          </SectionCard>

          <SectionCard title="通知" subtitle="連絡手段と受信頻度">
            <ToggleItem
              label="メール通知"
              description="重要なお知らせとセキュリティ通知を受け取ります。"
              on={settings.emailNotification}
              onChange={(next) => updateSetting("emailNotification", next)}
            />
            <ToggleItem
              label="配信開始通知"
              description="フォロー中チャンネルの開始通知を受け取ります。"
              on={settings.liveNotification}
              onChange={(next) => updateSetting("liveNotification", next)}
            />
            <ToggleItem
              label="マーケティング通知"
              description="キャンペーン・特典情報を受け取ります。"
              on={settings.marketingNotification}
              onChange={(next) => updateSetting("marketingNotification", next)}
            />
          </SectionCard>
        </div>

        <section className="mt-4 rounded-xl bg-[var(--brand-surface-soft)] p-5 md:p-6">
          <h2 className="text-lg font-semibold text-[var(--brand-accent)]">Danger Zone</h2>
          <p className="mt-1 text-sm text-[var(--brand-text-muted)]">不可逆な操作です。実行前に確認してください。</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={logout}
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
