"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopNav } from "../../components/home/TopNav";
import { useI18n } from "../../lib/i18n";
import { useUserSession } from "../../lib/userSession";
import { deleteStreamSession, listMyStreamSessions, type StreamSession } from "../../lib/streamSessions";

const STATUS_LABEL: Record<StreamSession["status"], string> = {
  prelive: "待機中",
  live: "配信中",
  ended: "終了",
};

const STATUS_COLOR: Record<StreamSession["status"], string> = {
  prelive: "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]",
  live: "bg-green-500/20 text-green-400",
  ended: "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]",
};

export default function StudioSessionsPage() {
  const router = useRouter();
  const { tx } = useI18n();
  const { isVtuber, hydrated } = useUserSession();
  const [sessions, setSessions] = useState<StreamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await listMyStreamSessions();
      setSessions(data);
    } catch {
      setError(tx("枠一覧の取得に失敗しました。", "Failed to load sessions."));
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hydrated) return;
    if (!isVtuber) {
      router.replace("/");
      return;
    }
    void load();
  }, [hydrated, isVtuber]);

  async function handleDelete(sessionId: string) {
    if (!confirm(tx("この枠を削除しますか？取り消しできません。", "Delete this session? This cannot be undone."))) return;
    setDeletingId(sessionId);
    const ok = await deleteStreamSession(sessionId);
    setDeletingId(null);
    if (ok) {
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    } else {
      setError(tx("削除に失敗しました。", "Failed to delete session."));
    }
  }

  if (!hydrated || !isVtuber) return null;

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav mode="studio" />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{tx("配信枠管理", "My Sessions")}</h1>
            <p className="mt-1 text-sm text-[var(--brand-text-muted)]">{tx("作成した配信枠の編集・削除・開始ができます。", "Edit, delete, or start your stream sessions.")}</p>
          </div>
          <Link
            href="/studio/pre-live"
            className="rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_6px_20px_rgba(124,106,230,0.4)] transition-all hover:brightness-110"
          >
            {tx("+ 新しい枠を作成", "+ New Session")}
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-[var(--brand-accent)]/15 px-4 py-3 text-sm text-[var(--brand-accent)]">{error}</div>
        )}

        {loading ? (
          <div className="py-20 text-center text-sm text-[var(--brand-text-muted)]">{tx("読み込み中...", "Loading...")}</div>
        ) : sessions.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-[var(--brand-text-muted)]">{tx("まだ配信枠がありません。", "No sessions yet.")}</p>
            <Link href="/studio/pre-live" className="mt-4 inline-block text-sm text-[var(--brand-primary)] hover:underline">
              {tx("最初の枠を作成する →", "Create your first session →")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className="flex items-center gap-4 rounded-2xl bg-[var(--brand-surface)] p-4 shadow-lg shadow-black/20"
              >
                <img
                  src={session.thumbnail}
                  alt={session.title}
                  className="h-16 w-28 flex-shrink-0 rounded-lg object-cover"
                />

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[session.status]}`}>
                      {STATUS_LABEL[session.status]}
                    </span>
                    <span className="text-[10px] text-[var(--brand-text-muted)]">{session.category}</span>
                  </div>
                  <p className="truncate font-semibold">{session.title}</p>
                  <p className="text-xs text-[var(--brand-text-muted)]">
                    {tx("参加枠", "Slots")}: {session.slotsLeft}/{session.slotsTotal} &nbsp;·&nbsp;
                    {new Date(session.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  {session.status === "prelive" && (
                    <Link
                      href={`/studio/live/${encodeURIComponent(session.sessionId)}`}
                      className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:brightness-110"
                    >
                      {tx("配信開始", "Go Live")}
                    </Link>
                  )}
                  {session.status !== "live" && (
                    <Link
                      href={`/studio/sessions/${encodeURIComponent(session.sessionId)}/edit`}
                      className="rounded-lg bg-[var(--brand-primary)]/20 px-3 py-2 text-xs font-bold text-[var(--brand-primary)] hover:brightness-110"
                    >
                      {tx("編集", "Edit")}
                    </Link>
                  )}
                  {session.status !== "live" && (
                    <button
                      onClick={() => handleDelete(session.sessionId)}
                      disabled={deletingId === session.sessionId}
                      className="rounded-lg bg-[var(--brand-accent)]/15 px-3 py-2 text-xs font-bold text-[var(--brand-accent)] hover:brightness-110 disabled:opacity-50"
                    >
                      {deletingId === session.sessionId ? tx("削除中...", "Deleting...") : tx("削除", "Delete")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
