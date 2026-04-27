"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TopNav } from "../../components/home/TopNav";
import { useI18n } from "../../lib/i18n";
import type { StreamSession } from "../../lib/streamSessions";
import { ChannelHero } from "../components/ChannelHero";
import { ChannelTicketPanel } from "../components/ChannelTicketPanel";

type ChannelInfo = {
  userId: string;
  name: string;
  channelName: string;
  bio: string;
  avatarUrl: string;
  headerUrl: string;
  role: "listener" | "vtuber";
};

type ChannelResponse = {
  channel: ChannelInfo;
  sessions: StreamSession[];
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function SessionCard({
  session,
  actionLabel,
  href,
}: {
  session: StreamSession;
  actionLabel: string;
  href: string;
}) {
  return (
    <article className="overflow-hidden rounded-xl bg-[var(--brand-surface)] shadow-lg shadow-black/20">
      <div className="aspect-video overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={session.thumbnail} alt={session.title} className="h-full w-full object-cover" />
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 text-sm font-bold text-[var(--brand-text)]">{session.title}</h3>
        <p className="text-xs text-[var(--brand-text-muted)]">{formatDate(session.startsAt)}</p>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[var(--brand-text-muted)]">
            {session.category} / {session.participationType}
          </p>
          <Link
            href={href}
            className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            {actionLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function PublicChannelPage() {
  const { tx } = useI18n();
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const userId = params?.userId ?? "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [sessions, setSessions] = useState<StreamSession[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/channels/${encodeURIComponent(userId)}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as (ChannelResponse & { error?: string }) | null;
        if (!response.ok) throw new Error(payload?.error ?? "Failed to load channel");
        if (!payload) throw new Error("Failed to load channel");
        if (cancelled) return;
        setChannel(payload.channel);
        setSessions(payload.sessions ?? []);
      } catch (caught) {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : tx("チャンネルの取得に失敗しました。", "Failed to load channel."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (userId) void load();
    return () => {
      cancelled = true;
    };
  }, [userId, tx]);

  const liveSessions = useMemo(() => sessions.filter((session) => session.status === "live"), [sessions]);
  const upcomingSessions = useMemo(() => sessions.filter((session) => session.status === "prelive"), [sessions]);
  const archivedSessions = useMemo(() => sessions.filter((session) => session.status === "ended"), [sessions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
        <TopNav />
        <main className="mx-auto max-w-[1200px] px-6 py-10">
          <p className="text-sm text-[var(--brand-text-muted)]">{tx("チャンネルを読み込み中...", "Loading channel...")}</p>
        </main>
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
        <TopNav />
        <main className="mx-auto flex max-w-[1200px] flex-col items-start gap-3 px-6 py-10">
          <p className="text-sm text-[var(--brand-accent)]">{error ?? tx("チャンネルが見つかりません。", "Channel not found.")}</p>
          <button onClick={() => router.push("/")} className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white">
            {tx("ホームに戻る", "Back to Home")}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav />
      <ChannelHero
        channelName={channel.channelName}
        userId={channel.userId}
        bio={channel.bio}
        avatarUrl={channel.avatarUrl}
        headerUrl={channel.headerUrl}
        liveCount={liveSessions.length}
        upcomingCount={upcomingSessions.length}
        archiveCount={archivedSessions.length}
        basePath={`/channels/${encodeURIComponent(channel.userId)}`}
        active="overview"
        labels={{
          upcoming: tx("予定", "Upcoming"),
          archive: tx("アーカイブ", "Archive"),
          noBio: tx("紹介文は未設定です。", "No bio yet."),
        }}
      />
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <ChannelTicketPanel
          targetUserId={channel.userId}
          channelName={channel.channelName}
          targetRole={channel.role}
        />

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-[var(--brand-accent)]">{tx("配信中", "Live Now")}</h2>
          {liveSessions.length === 0 ? (
            <p className="text-sm text-[var(--brand-text-muted)]">{tx("現在配信中の枠はありません。", "No live streams at the moment.")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveSessions.map((session) => (
                <SessionCard key={session.sessionId} session={session} actionLabel={tx("視聴", "Watch")} href={`/room/${encodeURIComponent(session.sessionId)}?role=listener`} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">{tx("近日予定", "Upcoming Streams")}</h2>
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-[var(--brand-text-muted)]">{tx("近日予定の枠はありません。", "No upcoming streams.")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.sessionId} session={session} actionLabel={tx("参加準備", "Join")} href={`/join/${encodeURIComponent(session.sessionId)}`} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 pb-8">
          <h2 className="mb-3 text-lg font-bold">{tx("アーカイブ", "Archive")}</h2>
          {archivedSessions.length === 0 ? (
            <p className="text-sm text-[var(--brand-text-muted)]">{tx("アーカイブはまだありません。", "No archives yet.")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {archivedSessions.map((session) => (
                <SessionCard key={session.sessionId} session={session} actionLabel={tx("詳細", "Details")} href={`/join/${encodeURIComponent(session.sessionId)}`} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
