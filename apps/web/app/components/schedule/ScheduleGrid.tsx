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
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="overflow-auto">
        <div className="grid min-w-[980px]" style={{ gridTemplateColumns: `88px repeat(${talents.length}, minmax(180px, 1fr))` }}>
          <div className="sticky left-0 top-0 z-20 border-b border-r border-gray-200 bg-white px-3 py-3 text-xs font-semibold text-gray-500">時間</div>

          {talents.map((talent) => (
            <div key={talent.id} className="sticky top-0 z-10 border-b border-r border-gray-200 bg-white px-3 py-2">
              <div className="flex items-center gap-2">
                <img src={talent.avatar} alt={talent.name} className="h-8 w-8 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{talent.name}</p>
                  <p className="text-xs text-gray-500">{talent.specialty}</p>
                </div>
              </div>
            </div>
          ))}

          {slots.map((slot) => (
            <Fragment key={slot.key}>
              <div key={`time-${slot.key}`} className="sticky left-0 z-[1] border-b border-r border-gray-200 bg-white px-3 py-3 text-xs text-gray-600">
                {slot.label}
              </div>

              {talents.map((talent) => {
                const coveringEvent = findCoveringEvent(events, talent.id, slot.minutes);
                const isStart = coveringEvent ? eventStartsAtSlot(coveringEvent, slot.minutes) : false;

                return (
                  <div key={`${slot.key}-${talent.id}`} className="h-[56px] border-b border-r border-gray-200 p-1.5">
                    {!coveringEvent && <div className="h-full rounded-md bg-gray-50/60" />}

                    {coveringEvent && isStart && (
                      <div className="flex h-full flex-col justify-between rounded-md border border-gray-200 bg-white p-1.5">
                        <div className="flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full ${statusDot(coveringEvent.status)}`} />
                          <p className="truncate text-[11px] font-medium text-gray-800">{coveringEvent.title}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-gray-500">{coveringEvent.start} - {String(Math.floor((toMinutes(coveringEvent.start) + coveringEvent.durationMin) / 60)).padStart(2, "0")}:{String((toMinutes(coveringEvent.start) + coveringEvent.durationMin) % 60).padStart(2, "0")}</p>
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

                    {coveringEvent && !isStart && (
                      <div className="h-full rounded-md bg-gray-100/70" />
                    )}
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
