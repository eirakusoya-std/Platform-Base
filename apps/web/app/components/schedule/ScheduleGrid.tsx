import { Fragment } from "react";
import { ScheduleEvent, Talent, TimeSlot } from "./types";
import { eventSpansSlots, eventStartsAtSlot, statusDot, statusLabel, statusStyle, toMinutes } from "./utils";

type ScheduleGridProps = {
  talents: Talent[];
  slots: TimeSlot[];
  events: ScheduleEvent[];
  onReserve: (sessionId: number) => void;
};

function findCoveringEvent(events: ScheduleEvent[], talentId: string, slotMinutes: number): ScheduleEvent | undefined {
  return events.find((event) => event.talentId === talentId && eventSpansSlots(event, slotMinutes));
}

export function ScheduleGrid({ talents, slots, events, onReserve }: ScheduleGridProps) {
  return (
    <section className="overflow-hidden rounded-2xl bg-[var(--brand-surface)] shadow-lg shadow-black/25">
      <div className="overflow-auto">
        <div className="grid min-w-[980px]" style={{ gridTemplateColumns: `88px repeat(${talents.length}, minmax(180px, 1fr))` }}>
          <div className="sticky left-0 top-0 z-20 bg-[var(--brand-surface)] px-3 py-3 text-xs font-semibold text-[var(--brand-text-muted)]">時間</div>

          {talents.map((talent) => (
            <div key={talent.id} className="sticky top-0 z-10 bg-[var(--brand-surface)] px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-14 overflow-hidden rounded-md" style={{ aspectRatio: "16/9" }}>
                  <img src={talent.avatar} alt={talent.name} className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--brand-text)]">{talent.name}</p>
                  <p className="text-xs text-[var(--brand-text-muted)]">{talent.specialty}</p>
                </div>
              </div>
            </div>
          ))}

          {slots.map((slot) => (
            <Fragment key={slot.key}>
              <div key={`time-${slot.key}`} className="sticky left-0 z-[1] bg-[var(--brand-surface)] px-3 py-3 text-xs text-[var(--brand-text-muted)]">
                {slot.label}
              </div>

              {talents.map((talent) => {
                const coveringEvent = findCoveringEvent(events, talent.id, slot.minutes);
                const isStart = coveringEvent ? eventStartsAtSlot(coveringEvent, slot.minutes) : false;

                return (
                  <div key={`${slot.key}-${talent.id}`} className="h-[56px] p-1.5">
                    {!coveringEvent && <div className="h-full rounded-md bg-[var(--brand-bg-900)]/70" />}

                    {coveringEvent && isStart && (
                      <div className="flex h-full flex-col justify-between rounded-md bg-[var(--brand-bg-900)] p-1.5">
                        <div className="flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full ${statusDot(coveringEvent.status)}`} />
                          <p className="truncate text-[11px] font-medium text-[var(--brand-text)]">{coveringEvent.title}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-[var(--brand-text-muted)]">
                            {coveringEvent.start} - {String(Math.floor((toMinutes(coveringEvent.start) + coveringEvent.durationMin) / 60)).padStart(2, "0")}
                            :{String((toMinutes(coveringEvent.start) + coveringEvent.durationMin) % 60).padStart(2, "0")}
                          </p>
                          <button
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusStyle(coveringEvent.status)}`}
                            onClick={() => {
                              if (coveringEvent.status === "booked") return;
                              onReserve(coveringEvent.sessionId);
                            }}
                          >
                            {statusLabel(coveringEvent.status)}
                          </button>
                        </div>
                      </div>
                    )}

                    {coveringEvent && !isStart && <div className="h-full rounded-md bg-[var(--brand-bg-900)]/90" />}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
