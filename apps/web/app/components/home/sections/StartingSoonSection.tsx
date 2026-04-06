"use client";

import { SlotBar } from "../SlotBar";
import { ModalSession, StartingSoonSession } from "../types";
import { formatCountdown, formatCountdownLabel, getTypeInfo } from "../utils";
import { useI18n } from "../../../lib/i18n";
import { ClockIcon, UsersIcon } from "@heroicons/react/24/outline";

type StartingSoonSectionProps = {
 sessions: StartingSoonSession[];
 countdown: Record<string, number>;
 onOpenSession: (session: ModalSession) => void;
 onOpenChannel: (hostUserId: string) => void;
};

export function StartingSoonSection({
 sessions,
 countdown,
  onOpenSession,
  onOpenChannel,
}: StartingSoonSectionProps) {
  const { tx } = useI18n();
  return (
    <section className="py-10">
      <div className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-[var(--brand-primary)]/20 px-3 py-1.5">
            <span className="text-xs font-bold tracking-widest text-[var(--brand-primary)]">STARTING SOON</span>
          </div>
          <p className="text-sm text-[var(--brand-text-muted)]">{tx("配信開始前だけ参加枠を確保できます", "Reserve your spot before stream starts")}</p>
        </div>
        <span className="text-xs text-[var(--brand-text-muted)]">{sessions.length} {tx("件", "items")}</span>
      </div>

      {sessions.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--brand-text-muted)]">{tx("該当する配信が見つかりませんでした", "No matching streams found")}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sessions.map((session) => {
            const seconds = countdown[session.id] ?? session.startsInSeconds;
            const typeInfo = getTypeInfo(session.participationType);
            const urgent = seconds < 20 * 60;
            const reserved = false;

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
                    streamStatus: "prelive",
                    reservationRequired: session.reservationRequired,
                    reserved,
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
                  <button
                    type="button"
                    onClick={(event) => {
                      if (!session.hostUserId) return;
                      event.stopPropagation();
                      onOpenChannel(session.hostUserId);
                    }}
                    className={`mb-3 inline-flex items-center gap-2 rounded-full px-1 py-0.5 ${
                      session.hostUserId ? "hover:bg-[var(--brand-bg-900)]" : ""
                    }`}
                  >
                    <span className="h-6 w-6 overflow-hidden rounded-full bg-[var(--brand-bg-900)] ring-1 ring-white/10">
                      {session.hostAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={session.hostAvatarUrl} alt={session.vtuber} className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-[10px] font-bold text-[var(--brand-primary)]">
                          {(session.hostChannelName || session.vtuber || "A").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-[var(--brand-text-muted)]">
                      {session.hostChannelName || session.vtuber}
                    </span>
                  </button>

                  <div className="mb-2">
                    <SlotBar left={session.slotsLeft} total={session.slotsTotal} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[var(--brand-text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="h-3.5 w-3.5" aria-hidden />
                      {tx("開始前", "Before live")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="h-3.5 w-3.5" aria-hidden />
                      {session.slotsLeft}/{session.slotsTotal}
                    </span>
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
