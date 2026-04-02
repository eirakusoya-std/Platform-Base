"use client";

import Link from "next/link";
import { TopNav } from "../../components/home/TopNav";
import { useI18n } from "../../lib/i18n";
import { ChannelHero } from "../components/ChannelHero";

type MockSession = {
  id: string;
  title: string;
  thumbnail: string;
  startsAt: string;
  category: string;
  participationType: "First-come" | "Lottery";
  status: "live" | "prelive" | "ended";
};

const MOCK_SESSIONS: MockSession[] = [
  {
    id: "preview-live-1",
    title: "視聴者参加型: エンドラRTA",
    thumbnail: "/image/thumbnail/thumbnail_1.png",
    startsAt: "2026-04-01T22:38:00+09:00",
    category: "ゲーム",
    participationType: "First-come",
    status: "live",
  },
  {
    id: "preview-upcoming-1",
    title: "深夜まったり雑談",
    thumbnail: "/image/thumbnail/thumbnail_3.png",
    startsAt: "2026-04-02T01:30:00+09:00",
    category: "雑談",
    participationType: "Lottery",
    status: "prelive",
  },
  {
    id: "preview-ended-1",
    title: "英会話トレーニング回",
    thumbnail: "/image/thumbnail/thumbnail_5.png",
    startsAt: "2026-03-31T21:00:00+09:00",
    category: "英語",
    participationType: "First-come",
    status: "ended",
  },
];

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

function MockCard({ session }: { session: MockSession }) {
  const actionLabel =
    session.status === "live" ? "視聴" : session.status === "prelive" ? "参加準備" : "詳細";

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
          <button
            type="button"
            className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ChannelPreviewPage() {
  const { tx } = useI18n();
  const live = MOCK_SESSIONS.filter((item) => item.status === "live");
  const upcoming = MOCK_SESSIONS.filter((item) => item.status === "prelive");
  const archive = MOCK_SESSIONS.filter((item) => item.status === "ended");

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav />
      <ChannelHero
        channelName="Preview Channel"
        userId="preview-user"
        bio={tx(
          "この領域はプロフィール文です。実際のデータ未作成でも配置・余白・見出し構成を確認できます。",
          "This is profile bio area. You can validate spacing and structure without real data.",
        )}
        liveCount={live.length}
        upcomingCount={upcoming.length}
        archiveCount={archive.length}
        headerUrl="/image/thumbnail/thumbnail_2.png"
        basePath="/channels/test"
        active="overview"
        labels={{
          upcoming: tx("予定", "Upcoming"),
          archive: tx("アーカイブ", "Archive"),
          noBio: tx("紹介文は未設定です。", "No bio yet."),
        }}
      />
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="mb-4 rounded-xl bg-[var(--brand-accent)]/15 px-4 py-3 text-sm text-[var(--brand-accent)]">
          {tx(
            "これはUI確認用のモックページです。ユーザー未作成でもチャンネル構成を確認できます。",
            "This is a mock page for UI verification. You can check channel layout without user data.",
          )}
        </div>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-[var(--brand-accent)]">{tx("配信中", "Live Now")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((session) => (
              <MockCard key={session.id} session={session} />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">{tx("近日予定", "Upcoming Streams")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((session) => (
              <MockCard key={session.id} session={session} />
            ))}
          </div>
        </section>

        <section className="mt-10 pb-8">
          <h2 className="mb-3 text-lg font-bold">{tx("アーカイブ", "Archive")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archive.map((session) => (
              <MockCard key={session.id} session={session} />
            ))}
          </div>
        </section>

        <div className="rounded-xl bg-[var(--brand-surface)] px-4 py-3 text-sm text-[var(--brand-text-muted)]">
          <p>
            Preview URL:{" "}
            <Link href="/channels/test" className="font-semibold text-[var(--brand-primary)] underline underline-offset-4">
              /channels/test
            </Link>
          </p>
          <p className="mt-1">
            Preview Schedule:{" "}
            <Link href="/channels/test/schedule" className="font-semibold text-[var(--brand-primary)] underline underline-offset-4">
              /channels/test/schedule
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
