"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MySessionsManager } from "../components/channel/MySessionsManager";
import { TopNav } from "../components/home/TopNav";
import { useI18n } from "../lib/i18n";
import { useUserSession } from "../lib/userSession";

type ChannelView = "profile" | "sessions";

type ProfileDraft = {
  name: string;
  channelName: string;
  bio: string;
  avatarUrl: string;
  headerUrl: string;
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
  const { tx } = useI18n();
  const { user, hydrated, isVtuber, updateUser, refreshSession } = useUserSession();

  const parseTab = (value: string | null): ChannelView => (value === "sessions" ? "sessions" : "profile");
  const [activeView, setActiveView] = useState<ChannelView>("profile");
  const [draft, setDraft] = useState<ProfileDraft>({ name: "", channelName: "", bio: "", avatarUrl: "", headerUrl: "" });
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
      avatarUrl: user.avatarUrl ?? "",
      headerUrl: user.headerUrl ?? "",
    });
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tab = new URLSearchParams(window.location.search).get("tab");
    const next = parseTab(tab);
    setActiveView((prev) => (prev === next ? prev : next));
  }, []);

  function switchView(next: ChannelView) {
    setActiveView(next);
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
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
          avatarUrl: draft.avatarUrl,
          headerUrl: draft.headerUrl,
        }),
      });
      updateUser({
        name: draft.name,
        channelName: draft.channelName || undefined,
        bio: draft.bio || undefined,
        avatarUrl: draft.avatarUrl || undefined,
        headerUrl: draft.headerUrl || undefined,
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
      avatarUrl: user?.avatarUrl ?? "",
      headerUrl: user?.headerUrl ?? "",
    });
    setMessage(null);
    setError(null);
  }

  if (!hydrated || !isVtuber || !user) return null;

  function handleAvatarFileChange(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(tx("画像ファイルを選択してください。", "Please choose an image file."));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(tx("画像サイズは2MB以下にしてください。", "Please keep image size under 2MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setDraft((prev) => ({ ...prev, avatarUrl: result }));
      setMessage(null);
      setError(null);
    };
    reader.onerror = () => {
      setError(tx("画像の読み込みに失敗しました。", "Failed to read image file."));
    };
    reader.readAsDataURL(file);
  }

  function handleHeaderFileChange(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(tx("画像ファイルを選択してください。", "Please choose an image file."));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError(tx("画像サイズは4MB以下にしてください。", "Please keep image size under 4MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setDraft((prev) => ({ ...prev, headerUrl: result }));
      setMessage(null);
      setError(null);
    };
    reader.onerror = () => {
      setError(tx("画像の読み込みに失敗しました。", "Failed to read image file."));
    };
    reader.readAsDataURL(file);
  }

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
              <div>
                <h1 className="text-2xl font-bold">{tx("プロフィール管理", "Profile Settings")}</h1>
                <p className="mt-1 text-sm text-[var(--brand-text-muted)]">
                  {tx("チャンネルの公開情報を編集できます。", "Edit your channel public profile.")}
                </p>

                <form onSubmit={saveProfile} className="mt-5 space-y-4">
                  <div className="rounded-xl bg-[var(--brand-bg-900)] p-4">
                    <p className="text-xs font-semibold text-[var(--brand-text-muted)]">{tx("ヘッダー画像", "Header Image")}</p>
                    <div className="mt-3 overflow-hidden rounded-xl bg-[var(--brand-surface)]">
                      {draft.headerUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={draft.headerUrl} alt={tx("ヘッダー画像", "Header Image")} className="h-36 w-full object-cover" />
                      ) : (
                        <div className="grid h-36 w-full place-items-center bg-[var(--brand-surface)] text-sm font-semibold text-[var(--brand-text-muted)]">
                          {tx("ヘッダー画像なし", "No header image")}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-sm font-semibold text-[var(--brand-text)] hover:brightness-110">
                        {tx("画像をアップロード", "Upload image")}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleHeaderFileChange(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, headerUrl: "" }))}
                        className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm font-semibold text-[var(--brand-text-muted)]"
                      >
                        {tx("削除", "Remove")}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-[var(--brand-text-muted)]">{tx("推奨: 16:5以上の横長画像 / 4MB以下", "Recommended: wide image (16:5+), up to 4MB")}</p>
                  </div>

                  <div className="rounded-xl bg-[var(--brand-bg-900)] p-4">
                    <p className="text-xs font-semibold text-[var(--brand-text-muted)]">{tx("チャンネルアイコン", "Channel Icon")}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-full bg-[var(--brand-surface)]">
                        {draft.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={draft.avatarUrl} alt={tx("チャンネルアイコン", "Channel Icon")} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-lg font-bold text-[var(--brand-primary)]">
                            {(draft.channelName || draft.name || "A").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                          <label className="inline-flex cursor-pointer items-center rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-sm font-semibold text-[var(--brand-text)] hover:brightness-110">
                          {tx("画像をアップロード", "Upload image")}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleAvatarFileChange(e.target.files?.[0] ?? null)}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setDraft((prev) => ({ ...prev, avatarUrl: "" }))}
                            className="ml-2 rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm font-semibold text-[var(--brand-text-muted)]"
                        >
                          {tx("削除", "Remove")}
                        </button>
                        <p className="mt-2 text-[11px] text-[var(--brand-text-muted)]">{tx("PNG/JPG/WebP・2MB以下", "PNG/JPG/WebP, up to 2MB")}</p>
                      </div>
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--brand-text-muted)]">{tx("表示名", "Display Name")}</span>
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                      className="mt-1 w-full rounded-lg bg-[#0a0d18] px-3 py-2 text-sm outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--brand-text-muted)]">{tx("チャンネル名", "Channel Name")}</span>
                    <input
                      value={draft.channelName}
                      onChange={(e) => setDraft((prev) => ({ ...prev, channelName: e.target.value }))}
                      className="mt-1 w-full rounded-lg bg-[#0a0d18] px-3 py-2 text-sm outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--brand-text-muted)]">{tx("紹介文", "Bio")}</span>
                    <textarea
                      value={draft.bio}
                      onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))}
                      rows={5}
                      className="mt-1 w-full rounded-lg bg-[#0a0d18] px-3 py-2 text-sm outline-none"
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
                framed={false}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
