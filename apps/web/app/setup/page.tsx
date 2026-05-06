"use client";

// SOLID: S（Google OAuth後の初回プロフィール設定に専念）
import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "../lib/i18n";
import { useUserSession } from "../lib/userSession";

type Role = "listener" | "vtuber";

export default function SetupPage() {
  const router = useRouter();
  const { tx } = useI18n();
  const { hydrated, isAuthenticated, user, refreshSession } = useUserSession();

  const [role, setRole] = useState<Role>("listener");
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
    if (user?.authProvider !== "google") {
      router.replace("/account");
      return;
    }
    setRole((user.role as Role) ?? "listener");
    setName(user.name ?? "");
    setChannelName(user.channelName ?? "");
  }, [hydrated, isAuthenticated, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(tx("表示名を入力してください。", "Please enter your display name."));
      return;
    }
    if (role === "vtuber" && !channelName.trim()) {
      setError(tx("チャンネル名を入力してください。", "Please enter your channel name."));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          name: name.trim(),
          ...(role === "vtuber" ? { channelName: channelName.trim() } : {}),
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
          {tx("アカウントの設定", "Set up your account")}
        </h1>
        <p className="mb-6 text-sm text-[var(--brand-text-muted)]">
          {tx("Googleアカウントで登録しました。利用目的を選択して設定を完了してください。",
             "Registered with Google. Please select your role and complete setup.")}
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          {/* ロール選択（vtuber はダウングレード不可のため listener 選択肢を非表示） */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--brand-text)]">
              {tx("利用目的", "Account type")}
            </p>
            {user?.role === "vtuber" ? (
              <div className="rounded-xl border-2 border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-4 py-4">
                <p className="font-semibold text-[var(--brand-text)]">VTuber</p>
                <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                  {tx("配信者として活動する", "Stream & interact")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(["listener", "vtuber"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={[
                      "rounded-xl border-2 px-4 py-4 text-left transition",
                      role === r
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10"
                        : "border-[var(--brand-surface-soft)] bg-[var(--brand-bg-900)]",
                    ].join(" ")}
                  >
                    <p className="font-semibold text-[var(--brand-text)]">
                      {r === "listener" ? tx("リスナー", "Listener") : "VTuber"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                      {r === "listener"
                        ? tx("配信を楽しむ", "Enjoy streams")
                        : tx("配信者として活動する", "Stream & interact")}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 表示名 */}
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

          {/* チャンネル名（VTuber のみ） */}
          {role === "vtuber" ? (
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
