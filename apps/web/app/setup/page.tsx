"use client";

// SOLID: S（Google OAuth後の初回プロフィール設定に専念）
import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "../lib/i18n";
import { useUserSession } from "../lib/userSession";

export default function SetupPage() {
  const router = useRouter();
  const { tx } = useI18n();
  const { hydrated, isAuthenticated, user, refreshSession } = useUserSession();

  const [name, setName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }
    // Google OAuth以外（メール登録）ではこのページは不要
    if (user?.authProvider !== "google") {
      router.replace("/account");
      return;
    }
    setName(user.name ?? "");
    setChannelName(user.channelName ?? "");
  }, [hydrated, isAuthenticated, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(tx("表示名を入力してください。", "Please enter your display name."));
      return;
    }
    if (user?.role === "vtuber" && !channelName.trim()) {
      setError(tx("チャンネル名を入力してください。", "Please enter your channel name."));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ...(user?.role === "vtuber" ? { channelName: channelName.trim() } : {}),
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(payload?.error ?? tx("更新に失敗しました。", "Failed to update."));
      }
      await refreshSession();
      router.push("/account");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tx("エラーが発生しました。", "An error occurred."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated || !isAuthenticated) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--brand-bg-900)] p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--brand-surface)] p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-[var(--brand-text)]">
          {tx("プロフィールの設定", "Set up your profile")}
        </h1>
        <p className="mb-6 text-sm text-[var(--brand-text-muted)]">
          {user?.role === "vtuber"
            ? tx("VTuberとして活動するための情報を入力してください。", "Enter information to start as a VTuber.")
            : tx("Aimerとしてのプロフィールを設定しましょう。", "Set up your Aimer profile.")}
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--brand-text)]">
              {tx("表示名", "Display name")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tx("表示名を入力", "Enter display name")}
              className="w-full rounded-lg border border-[var(--brand-surface-soft)] bg-[var(--brand-bg-900)] px-4 py-2.5 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          {user?.role === "vtuber" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--brand-text)]">
                {tx("チャンネル名", "Channel name")}
              </label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder={tx("チャンネル名を入力", "Enter channel name")}
                className="w-full rounded-lg border border-[var(--brand-surface-soft)] bg-[var(--brand-bg-900)] px-4 py-2.5 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
          ) : null}

          <div className="rounded-lg bg-[var(--brand-surface-soft)] px-4 py-3 text-sm text-[var(--brand-text-muted)]">
            <span className="font-medium text-[var(--brand-text)]">
              {tx("アカウント種別：", "Account type: ")}
            </span>
            {user?.role === "vtuber" ? "VTuber" : tx("リスナー", "Listener")}
          </div>

          {error ? <p className="text-sm text-[var(--brand-accent)]">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[var(--brand-primary)] py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? tx("保存中...", "Saving...") : tx("設定を完了する", "Complete setup")}
          </button>
        </form>
      </div>
    </main>
  );
}
