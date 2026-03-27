"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MySessionsManager } from "../components/channel/MySessionsManager";
import { TopNav } from "../components/home/TopNav";
import { useI18n } from "../lib/i18n";
import { useUserSession } from "../lib/userSession";

type ChannelView = "profile" | "sessions";

type ProfileDraft = {
  name: string;
  channelName: string;
  bio: string;
};

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Request failed");
}

export default function ChannelPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tx } = useI18n();
  const { user, hydrated, isVtuber, updateUser, refreshSession } = useUserSession();

  const parseTab = (value: string | null): ChannelView => (value === "sessions" ? "sessions" : "profile");
  const [activeView, setActiveView] = useState<ChannelView>(() => parseTab(searchParams.get("tab")));
  const [draft, setDraft] = useState<ProfileDraft>({ name: "", channelName: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!isVtuber) router.replace("/");
  }, [hydrated, isVtuber, router]);

  useEffect(() => {
    if (!user) return;
    setDraft({
      name: user.name ?? "",
      channelName: user.channelName ?? "",
      bio: user.bio ?? "",
    });
  }, [user]);

  useEffect(() => {
    const next = parseTab(searchParams.get("tab"));
    setActiveView((prev) => (prev === next ? prev : next));
  }, [searchParams]);

  function switchView(next: ChannelView) {
    setActiveView(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function saveProfile(event: FormEvent) {
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
      updateUser({
        name: draft.name,
        channelName: draft.channelName || undefined,
        bio: draft.bio || undefined,
      });
      await refreshSession();
      setMessage(tx("プロフィールを保存しました。", "Profile saved."));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tx("保存に失敗しました。", "Failed to save profile."));
    } finally {
      setSaving(false);
    }
  }

  function resetProfile() {
    setDraft({
      name: user?.name ?? "",
      channelName: user?.channelName ?? "",
      bio: user?.bio ?? "",
    });
    setMessage(null);
    setError(null);
  }

  if (!hydrated || !isVtuber || !user) return null;

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav />

      <main className="min-h-[calc(100vh-72px)] lg:grid lg:grid-cols-[240px_1fr]">
        <aside className="bg-[var(--brand-surface)] p-3 shadow-lg shadow-black/20 lg:min-h-[calc(100vh-72px)] lg:rounded-none lg:border-r lg:border-black/20">
          <div className="lg:sticky lg:top-[84px]">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--brand-text-muted)]">
              {tx("チャンネル管理", "Channel")}
            </p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => switchView("profile")}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                  activeView === "profile" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--brand-text-muted)] hover:bg-[var(--brand-bg-900)] hover:text-[var(--brand-text)]"
                }`}
              >
                {tx("プロフィール", "Profile")}
              </button>
              <button
                type="button"
                onClick={() => switchView("sessions")}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                  activeView === "sessions" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--brand-text-muted)] hover:bg-[var(--brand-bg-900)] hover:text-[var(--brand-text)]"
                }`}
              >
                {tx("配信枠管理", "Session Manager")}
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1020px]">
            {activeView === "profile" ? (
              <div className="rounded-2xl bg-[var(--brand-surface)] p-5 shadow-lg shadow-black/20">
                <h1 className="text-2xl font-bold">{tx("プロフィール管理", "Profile Settings")}</h1>
                <p className="mt-1 text-sm text-[var(--brand-text-muted)]">
                  {tx("チャンネルの公開情報を編集できます。", "Edit your channel public profile.")}
                </p>

                <form onSubmit={saveProfile} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--brand-text-muted)]">{tx("表示名", "Display Name")}</span>
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                      className="mt-1 w-full rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--brand-text-muted)]">{tx("チャンネル名", "Channel Name")}</span>
                    <input
                      value={draft.channelName}
                      onChange={(e) => setDraft((prev) => ({ ...prev, channelName: e.target.value }))}
                      className="mt-1 w-full rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--brand-text-muted)]">{tx("紹介文", "Bio")}</span>
                    <textarea
                      value={draft.bio}
                      onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))}
                      rows={5}
                      className="mt-1 w-full rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm outline-none"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {saving ? tx("保存中...", "Saving...") : tx("保存", "Save")}
                    </button>
                    <button
                      type="button"
                      onClick={resetProfile}
                      className="rounded-lg bg-[var(--brand-bg-900)] px-4 py-2 text-sm font-semibold text-[var(--brand-text-muted)]"
                    >
                      {tx("リセット", "Reset")}
                    </button>
                  </div>

                  {message ? <p className="text-sm text-[var(--brand-secondary)]">{message}</p> : null}
                  {error ? <p className="text-sm text-[var(--brand-accent)]">{error}</p> : null}
                </form>
              </div>
            ) : (
              <MySessionsManager
                title={tx("作成済み配信枠", "Your Stream Sessions")}
                description={tx("studio/sessions と同じデータを表示しています。", "Showing the same data source as studio/sessions.")}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
