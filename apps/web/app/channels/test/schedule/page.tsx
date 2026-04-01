"use client";

import { useMemo, useState } from "react";
import { TopNav } from "../../../components/home/TopNav";
import { ScheduleFilters } from "../../../components/schedule/ScheduleFilters";
import { ScheduleGrid } from "../../../components/schedule/ScheduleGrid";
import type { SessionCategory, Talent, ScheduleEvent } from "../../../components/schedule/types";
import { ChannelMenu } from "../../components/ChannelMenu";

type MockSession = {
  id: string;
  title: string;
  thumbnail: string;
  startsAt: string;
  category: SessionCategory;
  participationType: "First-come" | "Lottery";
  status: "live" | "prelive";
};

const MOCK_SESSIONS: MockSession[] = [
  {
    id: "preview-live-1",
    title: "視聴者参加型: エンドラRTA",
    thumbnail: "/image/thumbnail/thumbnail_1.png",
    startsAt: new Date().toISOString(),
    category: "ゲーム",
    participationType: "First-come",
    status: "live",
  },
  {
    id: "preview-upcoming-1",
    title: "深夜まったり雑談",
    thumbnail: "/image/thumbnail/thumbnail_3.png",
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    category: "雑談",
    participationType: "Lottery",
    status: "prelive",
  },
  {
    id: "preview-upcoming-2",
    title: "英会話トレーニング回",
    thumbnail: "/image/thumbnail/thumbnail_5.png",
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(),
    category: "英語",
    participationType: "First-come",
    status: "prelive",
  },
];

const MOCK_DATES = Array.from(
  new Set(
    MOCK_SESSIONS.map((session) => {
      const date = new Date(session.startsAt);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }),
  ),
).sort();

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

export default function ChannelTestSchedulePage() {
  const [selectedDate, setSelectedDate] = useState(MOCK_DATES[0] ?? "");
  const [talentQuery, setTalentQuery] = useState("");
  const [startHour, setStartHour] = useState(10);
  const [endHour, setEndHour] = useState(24);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<SessionCategory[]>([]);

  const dates = useMemo(() => MOCK_DATES, []);

  const talents = useMemo<Talent[]>(
    () => [
      {
        id: "preview-user",
        name: "Preview Channel",
        avatar: "/image/thumbnail/thumbnail_1.png",
        specialty: "ゲーム",
      },
    ],
    [],
  );

  const events = useMemo<ScheduleEvent[]>(
    () =>
      MOCK_SESSIONS.map((session, idx) => ({
        id: idx + 1,
        sessionId: idx + 1,
        date: toLocalYmd(session.startsAt),
        talentId: "preview-user",
        title: session.title,
        start: toLocalHm(session.startsAt),
        durationMin: 60,
        status:
          session.participationType === "Lottery"
            ? "lottery"
            : session.status === "live"
              ? "booked"
              : "available",
        category: session.category,
      })),
    [],
  );

  const filteredEvents = useMemo(() => {
    const query = talentQuery.trim().toLowerCase();
    return events.filter((event) => {
      if (selectedDate && event.date !== selectedDate) return false;
      if (query.length > 0 && !talents[0].name.toLowerCase().includes(query)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(event.category)) return false;
      if (onlyAvailable && event.status !== "available") return false;
      return true;
    });
  }, [events, selectedDate, talentQuery, selectedCategories, onlyAvailable, talents]);

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

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <section className="mb-5 rounded-2xl bg-[var(--brand-surface)] p-5 shadow-lg shadow-black/25">
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-full bg-[var(--brand-bg-900)]">
              <div className="grid h-full w-full place-items-center text-xl font-bold text-[var(--brand-primary)]">P</div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold">Preview Channel</h1>
              <p className="text-sm text-[var(--brand-text-muted)]">@preview-user</p>
            </div>
          </div>
          <ChannelMenu basePath="/channels/test" active="schedule" />
        </section>

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
            onReserve={() => undefined}
          />
        </div>
      </main>
    </div>
  );
}
