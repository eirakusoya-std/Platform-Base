"use client";

import Link from "next/link";
import { statusDot, statusLabel, statusStyle, toMinutes } from "../../components/schedule/utils";
import { categoryLabel } from "../../lib/labels";
import { useI18n } from "../../lib/i18n";

type MultiDayBookingStatus = "available" | "booked" | "lottery";

export type MultiDayEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  durationMin: number;
  title: string;
  category: string;
  status: MultiDayBookingStatus;
  href: string;
};

type EventLayout = {
  event: MultiDayEvent;
  lane: number;
  laneCount: number;
  startMin: number;
  endMin: number;
};

type MultiDayScheduleGridProps = {
  dates: string[];
  events: MultiDayEvent[];
  startHour: number;
  endHour: number;
};

const HOUR_HEIGHT = 84;
const CARD_GAP = 6;

function formatHour(minutes: number) {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  return `${hh}:00`;
}

function formatTime(minutes: number) {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDateLabel(ymd: string) {
  const date = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(date.getTime())) return ymd;
  return new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit", weekday: "short" }).format(date);
}

function getTodayKeyLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildLayouts(events: MultiDayEvent[]): EventLayout[] {
  const sorted = [...events]
    .map((event) => {
      const startMin = toMinutes(event.start);
      return {
        event,
        startMin,
        endMin: startMin + event.durationMin,
      };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const clusters: typeof sorted[] = [];
  let current: typeof sorted = [];
  let clusterEnd = -1;

  for (const item of sorted) {
    if (current.length === 0) {
      current = [item];
      clusterEnd = item.endMin;
      continue;
    }

    if (item.startMin < clusterEnd) {
      current.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMin);
      continue;
    }

    clusters.push(current);
    current = [item];
    clusterEnd = item.endMin;
  }
  if (current.length > 0) clusters.push(current);

  const layouts: EventLayout[] = [];

  for (const cluster of clusters) {
    const active: Array<{ endMin: number; lane: number }> = [];
    const assigned: Array<{ item: (typeof cluster)[number]; lane: number }> = [];
    let maxLane = 0;

    for (const item of cluster) {
      for (let i = active.length - 1; i >= 0; i -= 1) {
        if (active[i].endMin <= item.startMin) active.splice(i, 1);
      }

      const used = new Set(active.map((a) => a.lane));
      let lane = 0;
      while (used.has(lane)) lane += 1;

      active.push({ endMin: item.endMin, lane });
      assigned.push({ item, lane });
      maxLane = Math.max(maxLane, lane);
    }

    const laneCount = maxLane + 1;
    for (const { item, lane } of assigned) {
      layouts.push({
        event: item.event,
        lane,
        laneCount,
        startMin: item.startMin,
        endMin: item.endMin,
      });
    }
  }

  return layouts;
}

export function MultiDayScheduleGrid({
  dates,
  events,
  startHour,
  endHour,
}: MultiDayScheduleGridProps) {
  const { tx } = useI18n();
  const rangeStart = startHour * 60;
  const rangeEnd = endHour * 60;
  const totalMinutes = Math.max(60, rangeEnd - rangeStart);
  const pxPerMinute = HOUR_HEIGHT / 60;
  const canvasHeight = totalMinutes * pxPerMinute;
  const hourMarks = Array.from({ length: endHour - startHour + 1 }, (_, i) => (startHour + i) * 60);

  const todayKey = getTodayKeyLocal();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = dates.includes(todayKey) && nowMinutes >= rangeStart && nowMinutes <= rangeEnd;
  const nowTop = (nowMinutes - rangeStart) * pxPerMinute;

  return (
    <section className="overflow-hidden rounded-2xl bg-[var(--brand-surface)] shadow-lg shadow-black/25">
      <div className="overflow-auto">
        <div
          className="grid w-full"
          style={{ gridTemplateColumns: `88px repeat(${dates.length}, minmax(0, 1fr))` }}
        >
          <div className="sticky left-0 top-0 z-30 border-r border-[var(--brand-text-muted)]/20 bg-[var(--brand-surface)] px-3 py-3 text-xs font-semibold text-[var(--brand-text-muted)]">
            {tx("時間", "Time")}
          </div>

          {dates.map((date, index) => {
            const isToday = date === todayKey;
            return (
            <div
              key={date}
              className={`sticky top-0 z-10 px-3 py-2 ${index > 0 ? "border-l border-[var(--brand-text-muted)]/20" : ""} ${
                isToday
                  ? "bg-[var(--brand-primary)]/10"
                  : "bg-[var(--brand-surface)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[var(--brand-text)]">{formatDateLabel(date)}</p>
                {isToday && (
                  <span className="rounded-full bg-[var(--brand-primary)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--brand-primary)]">
                    {tx("当日", "Today")}
                  </span>
                )}
              </div>
            </div>
          )})}

          <div className="sticky left-0 z-20 border-r border-[var(--brand-text-muted)]/20 bg-[var(--brand-bg-900)]/60" style={{ height: canvasHeight }}>
            {hourMarks.map((minutes) => {
              const top = (minutes - rangeStart) * pxPerMinute;
              if (top < 0 || top > canvasHeight) return null;
              return (
                <div key={`time-${minutes}`} className="absolute left-0 right-0" style={{ top }}>
                  <span className="-translate-y-1/2 px-2 text-xs text-[var(--brand-text-muted)]">
                    {formatHour(minutes)}
                  </span>
                </div>
              );
            })}
          </div>

          {dates.map((date) => {
            const dayEvents = events.filter((event) => event.date === date);
            const layouts = buildLayouts(dayEvents);
            const isToday = date === todayKey;

            return (
              <div
                key={`col-${date}`}
                className={`relative border-l border-[var(--brand-text-muted)]/20 ${
                  isToday ? "bg-[var(--brand-primary)]/10" : "bg-[var(--brand-bg-900)]/50"
                }`}
                style={{ height: canvasHeight }}
              >
                {hourMarks.map((minutes) => {
                  const top = (minutes - rangeStart) * pxPerMinute;
                  if (top < 0 || top > canvasHeight) return null;
                  return (
                    <div
                      key={`line-${date}-${minutes}`}
                      className="absolute left-0 right-0 h-px bg-[var(--brand-text-muted)]/20"
                      style={{ top }}
                    />
                  );
                })}
                {showNowLine && isToday && (
                  <div className="absolute left-0 right-0 z-20" style={{ top: nowTop }}>
                    <div className="relative h-px bg-[var(--brand-accent)]">
                      <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-[var(--brand-accent)]" />
                    </div>
                  </div>
                )}

                {layouts.map(({ event, lane, laneCount, startMin, endMin }) => {
                  const clampedStart = Math.max(startMin, rangeStart);
                  const clampedEnd = Math.min(endMin, rangeEnd);
                  if (clampedEnd <= clampedStart) return null;

                  const top = (clampedStart - rangeStart) * pxPerMinute;
                  const height = Math.max((clampedEnd - clampedStart) * pxPerMinute, 28);
                  const widthPct = 100 / laneCount;

                  return (
                    <Link
                      key={event.id}
                      href={event.href}
                      className="absolute overflow-hidden rounded-md bg-[var(--brand-bg-900)] p-2 shadow-md shadow-black/25"
                      style={{
                        top,
                        height,
                        left: `calc(${lane * widthPct}% + ${CARD_GAP}px)`,
                        width: `calc(${widthPct}% - ${CARD_GAP * 2}px)`,
                      }}
                    >
                      <div className="mb-1 flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${statusDot(event.status)}`} />
                        <p className="truncate text-[11px] font-semibold text-[var(--brand-text)]">{event.title}</p>
                      </div>
                      <p className="mb-1 text-[10px] text-[var(--brand-text-muted)]">
                        {formatTime(clampedStart)} - {formatTime(clampedEnd)}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="truncate text-[10px] text-[var(--brand-text-muted)]">
                          {categoryLabel(event.category, tx)}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusStyle(event.status)}`}>
                          {statusLabel(event.status, tx)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
