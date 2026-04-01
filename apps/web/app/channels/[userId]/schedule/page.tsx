"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopNav } from "../../../components/home/TopNav";
import { ScheduleFilters } from "../../../components/schedule/ScheduleFilters";
import { ScheduleGrid } from "../../../components/schedule/ScheduleGrid";
import type { SessionCategory, Talent, ScheduleEvent } from "../../../components/schedule/types";
import { useI18n } from "../../../lib/i18n";
import type { StreamSession } from "../../../lib/streamSessions";
import { ChannelMenu } from "../../components/ChannelMenu";

type ChannelInfo = {
  userId: string;
  name: string;
  channelName: string;
  bio: string;
  avatarUrl: string;
  role: "listener" | "vtuber";
};

type ChannelResponse = {
  channel: ChannelInfo;
  sessions: StreamSession[];
};

const CATEGORIES: SessionCategory[] = ["雑談", "ゲーム", "歌枠", "英語"];

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

function toCategory(value: string): SessionCategory {
  return CATEGORIES.includes(value as SessionCategory) ? (value as SessionCategory) : "雑談";
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

  const [selectedDate, setSelectedDate] = useState("");
  const [talentQuery, setTalentQuery] = useState("");
  const [startHour, setStartHour] = useState(10);
  const [endHour, setEndHour] = useState(24);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<SessionCategory[]>([]);

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
    () => sessions.filter((session) => session.status === "prelive" || session.status === "live"),
    [sessions],
  );

  const dates = useMemo(
    () => Array.from(new Set(scheduleSource.map((session) => toLocalYmd(session.startsAt)))).sort(),
    [scheduleSource],
  );

  useEffect(() => {
    if (dates.length === 0) {
      setSelectedDate("");
      return;
    }
    setSelectedDate((prev) => (prev && dates.includes(prev) ? prev : dates[0]));
  }, [dates]);

  const talents = useMemo<Talent[]>(
    () =>
      channel
        ? [
            {
              id: channel.userId,
              name: channel.channelName,
              avatar: channel.avatarUrl || "/image/thumbnail/thumbnail_5.png",
              specialty: toCategory(scheduleSource[0]?.category ?? "雑談"),
            },
          ]
        : [],
    [channel, scheduleSource],
  );

  const sessionIdMap = useMemo(() => new Map<number, string>(), []);

  const events = useMemo<ScheduleEvent[]>(() => {
    sessionIdMap.clear();
    let index = 1;
    return scheduleSource.map((session) => {
      sessionIdMap.set(index, session.sessionId);
      const status =
        session.participationType === "Lottery"
          ? "lottery"
          : session.slotsLeft > 0
            ? "available"
            : "booked";
      const event: ScheduleEvent = {
        id: index,
        sessionId: index,
        date: toLocalYmd(session.startsAt),
        talentId: channel?.userId ?? "unknown",
        title: session.title,
        start: toLocalHm(session.startsAt),
        durationMin: 60,
        status,
        category: toCategory(session.category),
      };
      index += 1;
      return event;
    });
  }, [scheduleSource, channel?.userId, sessionIdMap]);

  const filteredEvents = useMemo(() => {
    const query = talentQuery.trim().toLowerCase();
    return events.filter((event) => {
      if (selectedDate && event.date !== selectedDate) return false;
      if (query.length > 0) {
        const talentName = talents.find((talent) => talent.id === event.talentId)?.name ?? "";
        if (!talentName.toLowerCase().includes(query)) return false;
      }
      if (selectedCategories.length > 0 && !selectedCategories.includes(event.category)) return false;
      if (onlyAvailable && event.status !== "available") return false;
      return true;
    });
  }, [events, selectedDate, talentQuery, selectedCategories, onlyAvailable, talents]);

  const handleToggleCategory = (category: SessionCategory) => {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]));
  };

  const handleStartHourChange = (value: number) => {
    setStartHour(value);
    if (value >= endHour) setEndHour(Math.min(24, value + 1));
  };

  const handleEndHourChange = (value: number) => {
    setEndHour(value);
    if (value <= startHour) setStartHour(Math.max(0, value - 1));
  };

  const handleReserve = (eventSessionId: number) => {
    const realSessionId = sessionIdMap.get(eventSessionId);
    if (!realSessionId) return;
    router.push(`/join/${encodeURIComponent(realSessionId)}`);
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
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <section className="mb-5 rounded-2xl bg-[var(--brand-surface)] p-5 shadow-lg shadow-black/25">
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-full bg-[var(--brand-bg-900)]">
              {channel.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={channel.avatarUrl} alt={channel.channelName} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-xl font-bold text-[var(--brand-primary)]">
                  {channel.channelName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold">{channel.channelName}</h1>
              <p className="text-sm text-[var(--brand-text-muted)]">@{channel.userId}</p>
            </div>
          </div>
          <ChannelMenu basePath={`/channels/${encodeURIComponent(channel.userId)}`} active="schedule" />
        </section>

        {dates.length === 0 ? (
          <section className="rounded-2xl bg-[var(--brand-surface)] p-6 text-sm text-[var(--brand-text-muted)] shadow-lg shadow-black/20">
            {tx("公開中の配信予定はありません。", "No scheduled sessions available.")}
          </section>
        ) : (
          <div className="space-y-5">
            <ScheduleFilters
              dates={dates}
              selectedDate={selectedDate}
              talentQuery={talentQuery}
              startHour={startHour}
              endHour={endHour}
              onlyAvailable={onlyAvailable}
              selectedCategories={selectedCategories}
              onDateChange={setSelectedDate}
              onTalentQueryChange={setTalentQuery}
              onStartHourChange={handleStartHourChange}
              onEndHourChange={handleEndHourChange}
              onOnlyAvailableChange={setOnlyAvailable}
              onToggleCategory={handleToggleCategory}
            />
            <ScheduleGrid
              talents={talents}
              selectedDate={selectedDate}
              startHour={startHour}
              endHour={endHour}
              events={filteredEvents}
              onReserve={handleReserve}
            />
          </div>
        )}
      </main>
    </div>
  );
}

