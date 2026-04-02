"use client";

import { useMemo, useState } from "react";
import { TopNav } from "../../../components/home/TopNav";
import { ChannelHero } from "../../components/ChannelHero";
import { MultiDayScheduleGrid, type MultiDayEvent } from "../../components/MultiDayScheduleGrid";

type MockSession = {
  id: string;
  title: string;
  startsAt: string;
  category: string;
  participationType: "First-come" | "Lottery";
  status: "live" | "prelive";
};

const MOCK_SESSIONS: MockSession[] = [
  { id: "m1", title: "朝活マイクラ建国", startsAt: "2026-04-01T10:30:00+09:00", category: "ゲーム", participationType: "First-come", status: "live" },
  { id: "m2", title: "深夜まったり雑談", startsAt: "2026-04-01T13:00:00+09:00", category: "雑談", participationType: "Lottery", status: "prelive" },
  { id: "m3", title: "英会話トレーニング回", startsAt: "2026-04-02T12:30:00+09:00", category: "英語", participationType: "First-come", status: "prelive" },
  { id: "m4", title: "歌枠リクエスト配信", startsAt: "2026-04-03T14:00:00+09:00", category: "歌枠", participationType: "First-come", status: "prelive" },
];

type RangeMode = "3d" | "week";

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

export default function ChannelTestSchedulePage() {
  const [rangeMode, setRangeMode] = useState<RangeMode>("3d");
  const [baseDate, setBaseDate] = useState("");
  const [startHour, setStartHour] = useState(10);
  const [endHour, setEndHour] = useState(24);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const dateOptions = useMemo(
    () => Array.from(new Set(MOCK_SESSIONS.map((session) => toLocalYmd(session.startsAt)))).sort(),
    [],
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
      MOCK_SESSIONS.map((session) => {
        const status =
          session.participationType === "Lottery"
            ? "lottery"
            : session.status === "live"
              ? "booked"
              : "available";
        return {
          id: session.id,
          date: toLocalYmd(session.startsAt),
          start: toLocalHm(session.startsAt),
          durationMin: 60,
          title: session.title,
          category: session.category,
          status,
          href: "/channels/test",
        } satisfies MultiDayEvent;
      })
        .filter((event) => visibleDateSet.has(event.date))
        .filter((event) => (onlyAvailable ? event.status === "available" : true)),
    [visibleDateSet, onlyAvailable],
  );

  const handleMoveWindow = (direction: -1 | 1) => {
    setBaseDate(addDaysYmd(effectiveBaseDate, direction * rangeDays));
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav />
      <ChannelHero
        channelName="Preview Channel"
        userId="preview-user"
        bio="モックのスケジュールページです。3日 / 1週間ビューの動作確認に利用できます。"
        headerUrl="/image/thumbnail/thumbnail_2.png"
        basePath="/channels/test"
        active="schedule"
        labels={{
          upcoming: "予定",
          archive: "アーカイブ",
          noBio: "紹介文は未設定です。",
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
              <button type="button" onClick={() => handleMoveWindow(-1)} className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm font-semibold text-[var(--brand-text-muted)]">
                ←
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
              <button type="button" onClick={() => handleMoveWindow(1)} className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm font-semibold text-[var(--brand-text-muted)]">
                →
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
