"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "../components/home/Footer";
import { TopNav } from "../components/home/TopNav";
import { ScheduleFilters } from "../components/schedule/ScheduleFilters";
import { ScheduleGrid } from "../components/schedule/ScheduleGrid";
import { ScheduleEvent, SessionCategory, Talent } from "../components/schedule/types";
import { useI18n } from "../lib/i18n";
import { listActiveStreamSessions, subscribeStreamSessions, type StreamSession } from "../lib/streamSessions";

function todayYmd() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toLocalYmd(value: string) {
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toLocalHm(value: string) {
  const date = new Date(value);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function toSessionCategory(value: string): SessionCategory {
  if (value === "雑談" || value === "ゲーム" || value === "歌枠" || value === "英語") return value;
  return "雑談";
}

export default function SchedulePage() {
  const router = useRouter();
  const { tx } = useI18n();
  const [sessions, setSessions] = useState<StreamSession[]>([]);
  const todayDate = todayYmd();

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const next = await listActiveStreamSessions();
        if (!cancelled) setSessions(next);
      } catch {
        if (!cancelled) setSessions([]);
      }
    };
    void sync();
    const unsubscribe = subscribeStreamSessions(sync);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const talents = useMemo<Talent[]>(() => {
    const map = new Map<string, Talent>();
    for (const session of sessions) {
      if (!map.has(session.hostUserId)) {
        map.set(session.hostUserId, {
          id: session.hostUserId,
          name: session.hostChannelName || session.hostName,
          avatar: session.hostAvatarUrl || session.thumbnail,
          specialty: toSessionCategory(session.category),
        });
      }
    }
    return Array.from(map.values());
  }, [sessions]);

  const scheduleEvents = useMemo<ScheduleEvent[]>(
    () =>
      sessions.map((session) => ({
        id: session.sessionId,
        sessionId: session.sessionId,
        date: toLocalYmd(session.startsAt),
        talentId: session.hostUserId,
        title: session.title,
        start: toLocalHm(session.startsAt),
        durationMin: 60,
        status: session.participationType === "Lottery" ? "lottery" : session.slotsLeft > 0 ? "available" : "booked",
        category: toSessionCategory(session.category),
      })),
    [sessions],
  );

  const dateOptions = useMemo(
    () => Array.from(new Set([todayDate, ...scheduleEvents.map((event) => event.date)])).sort(),
    [scheduleEvents, todayDate],
  );

  const [selectedDate, setSelectedDate] = useState(dateOptions.includes(todayDate) ? todayDate : dateOptions[0]);
  const [talentQuery, setTalentQuery] = useState("");
  const [startHour, setStartHour] = useState(10);
  const [endHour, setEndHour] = useState(16);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<SessionCategory[]>([]);

  const filteredEvents = useMemo(() => {
    const query = talentQuery.trim().toLowerCase();
    const matchedTalentIds =
      query.length === 0
        ? null
        : new Set(
            talents.filter((talent) => talent.name.toLowerCase().includes(query)).map((talent) => talent.id),
          );

    return scheduleEvents.filter((event) => {
      if (event.date !== selectedDate) return false;
      if (matchedTalentIds && !matchedTalentIds.has(event.talentId)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(event.category)) return false;
      if (onlyAvailable && event.status !== "available") return false;
      return true;
    });
  }, [selectedDate, talentQuery, talents, scheduleEvents, selectedCategories, onlyAvailable]);

  const handleToggleCategory = (category: SessionCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category],
    );
  };

  const handleStartHourChange = (value: number) => {
    setStartHour(value);
    if (value >= endHour) setEndHour(Math.min(24, value + 1));
  };

  const handleEndHourChange = (value: number) => {
    setEndHour(value);
    if (value <= startHour) setStartHour(Math.max(0, value - 1));
  };

  const handleReserve = (sessionId: string) => {
    router.push(`/join/${encodeURIComponent(sessionId)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20 text-[var(--text)] md:pb-0">
      <TopNav />

      <main className="mx-auto max-w-[1400px] px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text)]">{tx("配信スケジュール", "Stream Schedule")}</h1>
          <p className="mt-1 text-sm text-[var(--text-sub)]">{tx("時間帯とタレントを比較して、予約可能な枠をすばやく選べます。", "Compare time slots and talents to quickly find bookable streams.")}</p>
        </div>

        <div className="space-y-5">
          <ScheduleFilters
            dates={dateOptions}
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
            onBackToToday={() => setSelectedDate(todayDate)}
          />

          <ScheduleGrid talents={talents} selectedDate={selectedDate} startHour={startHour} endHour={endHour} events={filteredEvents} onReserve={handleReserve} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
