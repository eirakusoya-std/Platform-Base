import { MouseEvent } from "react";
import { SlotBar } from "../SlotBar";
import { ModalSession, StartingSoonSession } from "../types";
import { formatCountdown, formatCountdownLabel, getTypeInfo } from "../utils";

type StartingSoonSectionProps = {
 sessions: StartingSoonSession[];
 countdown: Record<string, number>;
 reservedSet: Set<string>;
 onOpenSession: (session: ModalSession) => void;
 onToggleReserve: (event: MouseEvent, sessionId: string) => void;
 onParticipate: (sessionId: string) => void;
};

export function StartingSoonSection({
 sessions,
 countdown,
 reservedSet,
 onOpenSession,
 onToggleReserve,
 onParticipate,
}: StartingSoonSectionProps) {
  return (
    <section className="py-10">
      <div className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-[var(--brand-primary)]/20 px-3 py-1.5">
            <span className="text-xs">|</span>
            <span className="text-xs font-bold tracking-widest text-[var(--brand-primary)]">STARTING SOON</span>
          </div>
          <p className="text-sm text-[var(--brand-text-muted)]">配信開始前だけ参加枠を確保できます</p>
        </div>
        <span className="text-xs text-[var(--brand-text-muted)]">{sessions.length} 件</span>
      </div>

      {sessions.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--brand-text-muted)]">該当する配信が見つかりませんでした</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sessions.map((session) => {
            const seconds = countdown[session.id] ?? session.startsInSeconds;
            const typeInfo = getTypeInfo(session.participationType);
            const urgent = seconds < 20 * 60;
            const reserved = reservedSet.has(session.id);

            return (
              <div
                key={session.id}
                className="group cursor-pointer overflow-hidden rounded-xl bg-[var(--brand-surface)] shadow-lg shadow-black/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                onClick={() =>
                  onOpenSession({
                    id: session.id,
                    vtuber: session.vtuber,
                    title: session.title,
                    thumbnail: session.thumbnail,
                    startsIn: formatCountdownLabel(seconds),
                    slotsLeft: session.slotsLeft,
                    description: session.description,
                    duration: session.duration,
                    participationType: session.participationType === "Members-only" ? "Lottery" : session.participationType,
                    isSubscribed: session.isSubscribed,
                  })
                }
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={session.thumbnail}
                    alt={session.vtuber}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="p-3.5">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <div
                      className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                        urgent ? "bg-[var(--brand-accent)]/20 text-[var(--brand-accent)]" : "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]"
                      }`}
                    >
                      {formatCountdown(seconds)}
                    </div>
                    <div className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold ${typeInfo.bg}`}>
                      <span>{typeInfo.icon}</span>
                      <span>{typeInfo.label}</span>
                    </div>
                  </div>

                  <p className="mb-0.5 line-clamp-2 text-sm font-bold leading-tight text-[var(--brand-text)]">{session.title}</p>
                  <p className="mb-3 text-xs text-[var(--brand-text-muted)]">{session.vtuber}</p>

                  <div className="mb-3">
                    <SlotBar left={session.slotsLeft} total={session.slotsTotal} size="sm" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] py-2.5 text-sm font-bold text-[var(--brand-bg-900)] transition-all hover:brightness-110"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleReserve(event, session.id);
                        onParticipate(session.id);
                      }}
                    >
                      {reserved ? "予約済み" : "参加する"}
                    </button>
                    <button className="rounded-lg px-3 py-2.5 text-xs text-[var(--brand-text-muted)] transition-all">DETAIL</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
