"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import { useI18n } from "../../lib/i18n";
import { deleteStreamSession, listMyStreamSessions, type StreamSession } from "../../lib/streamSessions";

const STATUS_LABEL: Record<StreamSession["status"], { jp: string; en: string }> = {
  prelive: { jp: "待機中", en: "Ready" },
  live: { jp: "配信中", en: "Live" },
  ended: { jp: "終了", en: "Ended" },
};

const STATUS_COLOR: Record<StreamSession["status"], string> = {
  prelive: "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]",
  live: "bg-green-500/20 text-green-400",
  ended: "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]",
};

type MySessionsManagerProps = {
  title?: string;
  description?: string;
  showCreateButton?: boolean;
  framed?: boolean;
};

export function MySessionsManager({ title, description, showCreateButton = true, framed = true }: MySessionsManagerProps) {
  const { tx } = useI18n();
  const [sessions, setSessions] = useState<StreamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listMyStreamSessions();
        if (!cancelled) setSessions(data);
      } catch {
        if (!cancelled) setError(tx("枠一覧の取得に失敗しました。", "Failed to load sessions."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tx]);

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

  return (
    <section className={framed ? "rounded-2xl bg-[var(--brand-surface)] p-5 shadow-lg shadow-black/20" : ""}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{title ?? tx("配信枠管理", "My Sessions")}</h2>
          <p className="mt-1 text-sm text-[var(--brand-text-muted)]">{description ?? tx("作成した配信枠の編集・削除・開始ができます。", "Edit, delete, or start your stream sessions.")}</p>
        </div>
        {showCreateButton && (
          <Link
            href="/studio/pre-live"
            className="rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_6px_20px_rgba(124,106,230,0.4)] transition-all hover:brightness-110"
          >
            {tx("+ 新しい枠を作成", "+ New Session")}
          </Link>
        )}
      </div>

      {error && <div className="mb-4 rounded-xl bg-[var(--brand-accent)]/15 px-4 py-3 text-sm text-[var(--brand-accent)]">{error}</div>}

      {loading ? (
        <div className="py-16 text-center text-sm text-[var(--brand-text-muted)]">{tx("読み込み中...", "Loading...")}</div>
      ) : sessions.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-[var(--brand-text-muted)]">{tx("まだ配信枠がありません。", "No sessions yet.")}</p>
          <Link href="/studio/pre-live" className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--brand-primary)] hover:underline">
            <span>{tx("最初の枠を作成する", "Create your first session")}</span>
            <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.sessionId} className="flex items-center gap-4 rounded-2xl bg-[var(--brand-bg-900)] p-4">
              <img src={session.thumbnail} alt={session.title} className="h-16 w-28 flex-shrink-0 rounded-lg object-cover" />

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[session.status]}`}>
                    {tx(STATUS_LABEL[session.status].jp, STATUS_LABEL[session.status].en)}
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
    </section>
  );
}
