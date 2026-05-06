import { ScheduleEvent, Talent } from "./types";
import { statusDot, statusLabel, statusStyle, toMinutes } from "./utils";
import { categoryLabel } from "../../lib/labels";
import { useI18n } from "../../lib/i18n";

type ScheduleGridProps = {
  talents: Talent[];
  selectedDate: string;
  startHour: number;
  endHour: number;
  events: ScheduleEvent[];
  onReserve: (sessionId: string) => void;
};

type EventLayout = {
  event: ScheduleEvent;
  lane: number;
  laneCount: number;
  startMin: number;
  endMin: number;
};

const HOUR_HEIGHT = 84;
const CARD_GAP = 6;

function formatTime(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function getTodayKeyLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildLayouts(events: ScheduleEvent[]): EventLayout[] {
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

export function ScheduleGrid({ talents, selectedDate, startHour, endHour, events, onReserve }: ScheduleGridProps) {
  const { tx } = useI18n();
  if (talents.length === 0) {
    return (
      <section className="rounded-2xl bg-[var(--brand-surface)] px-5 py-10 text-center shadow-lg shadow-black/25">
        <p className="text-sm font-semibold text-[var(--brand-text)]">{tx("配信スケジュールはまだありません。", "No stream schedule yet.")}</p>
        <p className="mt-1 text-xs text-[var(--brand-text-muted)]">{tx("配信枠が作成されるとここに表示されます。", "Created stream sessions will appear here.")}</p>
      </section>
    );
  }

  const rangeStart = startHour * 60;
  const rangeEnd = endHour * 60;
  const totalMinutes = Math.max(60, rangeEnd - rangeStart);
  const pxPerMinute = HOUR_HEIGHT / 60;
  const canvasHeight = totalMinutes * pxPerMinute;

  const hourMarks = Array.from({ length: endHour - startHour + 1 }, (_, i) => (startHour + i) * 60);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = selectedDate === getTodayKeyLocal() && nowMinutes >= rangeStart && nowMinutes <= rangeEnd;
  const nowTop = (nowMinutes - rangeStart) * pxPerMinute;

  return (
    <section className="overflow-hidden rounded-2xl bg-[var(--brand-surface)] shadow-lg shadow-black/25">
      <div className="overflow-auto">
        <div className="grid min-w-[980px]" style={{ gridTemplateColumns: `88px repeat(${talents.length}, minmax(200px, 1fr))` }}>
          <div className="sticky left-0 top-0 z-20 bg-[var(--brand-surface)] px-3 py-3 text-xs font-semibold text-[var(--brand-text-muted)]">{tx("時間", "Time")}</div>

          {talents.map((talent) => (
            <div key={talent.id} className="sticky top-0 z-10 bg-[var(--brand-surface)] px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-14 overflow-hidden rounded-md" style={{ aspectRatio: "16/9" }}>
                  <img src={talent.avatar} alt={talent.name} className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--brand-text)]">{talent.name}</p>
                  <p className="text-xs text-[var(--brand-text-muted)]">{categoryLabel(talent.specialty, tx)}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="relative bg-[var(--brand-bg-900)]/60" style={{ height: canvasHeight }}>
            {hourMarks.map((minutes) => {
              const top = (minutes - rangeStart) * pxPerMinute;
              if (top < 0 || top > canvasHeight) return null;
              return (
                <div key={`time-${minutes}`} className="absolute left-0 right-0" style={{ top }}>
                  <span className="-translate-y-1/2 px-2 text-xs text-[var(--brand-text-muted)]">{formatTime(minutes)}</span>
                </div>
              );
            })}
          </div>

          {talents.map((talent, talentIndex) => {
            const layouts = buildLayouts(events.filter((event) => event.talentId === talent.id));

            return (
              <div key={`col-${talent.id}`} className="relative bg-[var(--brand-bg-900)]/50" style={{ height: canvasHeight }}>
                {hourMarks.map((minutes) => {
                  const top = (minutes - rangeStart) * pxPerMinute;
                  if (top < 0 || top > canvasHeight) return null;
                  return <div key={`line-${talent.id}-${minutes}`} className="absolute left-0 right-0 h-px bg-[var(--brand-text-muted)]/20" style={{ top }} />;
                })}

                {showNowLine && (
                  <div className="absolute left-0 right-0 z-20" style={{ top: nowTop }}>
                    <div className="relative h-px bg-[var(--brand-accent)]">
                      {talentIndex === 0 && (
                        <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-[var(--brand-accent)]" />
                      )}
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
                    <div
                      key={event.id}
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
                      <p className="mb-1 text-[10px] text-[var(--brand-text-muted)]">{formatTime(clampedStart)} - {formatTime(clampedEnd)}</p>
                      <div className="flex items-center justify-between">
                        <span className="truncate text-[10px] text-[var(--brand-text-muted)]">{categoryLabel(event.category, tx)}</span>
                        <button
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusStyle(event.status)}`}
                          onClick={() => {
                            if (event.status === "booked") return;
                            onReserve(event.sessionId);
                          }}
                        >
                          {statusLabel(event.status, tx)}
                        </button>
                      </div>
                    </div>
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
