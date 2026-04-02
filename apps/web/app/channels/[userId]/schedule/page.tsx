"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { useParams, useRouter } from "next/navigation";
import { TopNav } from "../../../components/home/TopNav";
import { useI18n } from "../../../lib/i18n";
import type { StreamSession } from "../../../lib/streamSessions";
import { ChannelHero } from "../../components/ChannelHero";
import { MultiDayScheduleGrid, type MultiDayEvent } from "../../components/MultiDayScheduleGrid";

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

type RangeMode = "3d" | "week";

function toLocalYmd(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toLocalHm(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "10:00";
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDaysYmd(ymd: string, days: number) {
  const date = parseYmd(ymd);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayYmd() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function ChannelSchedulePage() {
  const { tx } = useI18n();
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const userId = params?.userId ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [sessions, setSessions] = useState<StreamSession[]>([]);

  const [rangeMode, setRangeMode] = useState<RangeMode>("3d");
  const [baseDate, setBaseDate] = useState("");
  const [startHour, setStartHour] = useState(10);
  const [endHour, setEndHour] = useState(24);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

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
        setError(caught instanceof Error ? caught.message : tx("スケジュールの取得に失敗しました。", "Failed to load schedule."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (userId) void load();
    return () => {
      cancelled = true;
    };
  }, [userId, tx]);

  const scheduleSource = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "prelive" || session.status === "live")
        .slice()
        .sort((a, b) => (a.startsAt > b.startsAt ? 1 : -1)),
    [sessions],
  );

  const dateOptions = useMemo(
    () => Array.from(new Set(scheduleSource.map((session) => toLocalYmd(session.startsAt)))).sort(),
    [scheduleSource],
  );

  const effectiveBaseDate = baseDate || dateOptions[0] || todayYmd();
  const rangeDays = rangeMode === "3d" ? 3 : 7;
  const visibleDates = useMemo(
    () => Array.from({ length: rangeDays }, (_, idx) => addDaysYmd(effectiveBaseDate, idx)),
    [effectiveBaseDate, rangeDays],
  );
  const visibleDateSet = useMemo(() => new Set(visibleDates), [visibleDates]);

  const events = useMemo<MultiDayEvent[]>(
    () =>
      scheduleSource
        .map((session) => {
          const status =
            session.participationType === "Lottery"
              ? "lottery"
              : session.slotsLeft > 0
                ? "available"
                : "booked";
          return {
            id: session.sessionId,
            date: toLocalYmd(session.startsAt),
            start: toLocalHm(session.startsAt),
            durationMin: 60,
            title: session.title,
            category: session.category,
            status,
            href:
              session.status === "live"
                ? `/room/${encodeURIComponent(session.sessionId)}?role=listener`
                : `/join/${encodeURIComponent(session.sessionId)}`,
          } satisfies MultiDayEvent;
        })
        .filter((event) => visibleDateSet.has(event.date))
        .filter((event) => (onlyAvailable ? event.status === "available" : true)),
    [scheduleSource, visibleDateSet, onlyAvailable],
  );

  const handleMoveWindow = (direction: -1 | 1) => {
    setBaseDate(addDaysYmd(effectiveBaseDate, direction * rangeDays));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
        <TopNav />
        <main className="mx-auto max-w-[1200px] px-6 py-10">
          <p className="text-sm text-[var(--brand-text-muted)]">{tx("スケジュールを読み込み中...", "Loading schedule...")}</p>
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
        basePath={`/channels/${encodeURIComponent(channel.userId)}`}
        active="schedule"
        labels={{
          upcoming: tx("予定", "Upcoming"),
          archive: tx("アーカイブ", "Archive"),
          noBio: tx("紹介文は未設定です。", "No bio yet."),
        }}
      />
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">

        <section className="mb-5 rounded-2xl bg-[var(--brand-surface)] p-4 shadow-lg shadow-black/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--brand-bg-900)] p-1">
              <button
                type="button"
                onClick={() => setRangeMode("3d")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  rangeMode === "3d" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--brand-text-muted)]"
                }`}
              >
                3日
              </button>
              <button
                type="button"
                onClick={() => setRangeMode("week")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  rangeMode === "week" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--brand-text-muted)]"
                }`}
              >
                1週間
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMoveWindow(-1)}
                aria-label={tx("前の期間", "Previous range")}
                className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text-muted)]"
              >
                <ChevronLeftIcon className="h-5 w-5" aria-hidden />
              </button>
              <select
                value={effectiveBaseDate}
                onChange={(event) => setBaseDate(event.target.value)}
                className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm text-[var(--brand-text)] outline-none"
              >
                {(dateOptions.length ? dateOptions : [todayYmd()]).map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleMoveWindow(1)}
                aria-label={tx("次の期間", "Next range")}
                className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text-muted)]"
              >
                <ChevronRightIcon className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-[var(--brand-text-muted)]">
                開始
                <select
                  value={startHour}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setStartHour(value);
                    if (value >= endHour) setEndHour(Math.min(24, value + 1));
                  }}
                  className="rounded-md bg-[var(--brand-bg-900)] px-2 py-1 text-sm text-[var(--brand-text)] outline-none"
                >
                  {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                    <option key={hour} value={hour}>
                      {String(hour).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--brand-text-muted)]">
                終了
                <select
                  value={endHour}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setEndHour(value);
                    if (value <= startHour) setStartHour(Math.max(0, value - 1));
                  }}
                  className="rounded-md bg-[var(--brand-bg-900)] px-2 py-1 text-sm text-[var(--brand-text)] outline-none"
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((hour) => (
                    <option key={hour} value={hour}>
                      {String(hour).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-md bg-[var(--brand-bg-900)] px-2 py-1.5 text-sm text-[var(--brand-text-muted)]">
                <input type="checkbox" checked={onlyAvailable} onChange={(event) => setOnlyAvailable(event.target.checked)} />
                予約可能のみ
              </label>
            </div>
          </div>
        </section>

        <MultiDayScheduleGrid dates={visibleDates} events={events} startHour={startHour} endHour={endHour} />
      </main>
    </div>
  );
}
