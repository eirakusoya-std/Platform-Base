"use client";

import { StartingSoonSession } from "./types";
import { useI18n } from "../../lib/i18n";

type UpcomingTickerProps = {
 sessions: StartingSoonSession[];
 onParticipate: (sessionId: string) => void;
};

export function UpcomingTicker({ sessions, onParticipate }: UpcomingTickerProps) {
 const { tx } = useI18n();
 return (
 <div className=" bg-[var(--brand-bg-800)]">
 <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-8 py-2">
 <div className="flex items-center gap-2 whitespace-nowrap">
 <span className="flex h-2 w-2 animate-pulse rounded-full bg-[var(--brand-accent)]" />
 <span className="text-[10px] font-bold tracking-wider text-[var(--brand-accent)]">UPCOMING</span>
 </div>

 <div className="flex flex-1 items-center gap-6 overflow-x-auto no-scrollbar">
 {sessions.map((s) => (
 <div
 key={s.id}
 className="group flex cursor-pointer items-center gap-3 whitespace-nowrap py-1 transition-all hover:opacity-80"
 onClick={() => onParticipate(s.id)}
 >
 <div className="w-14 overflow-hidden rounded bg-[var(--brand-bg-900)]" style={{ aspectRatio: "16/9" }}>
<img src={s.thumbnail} alt={s.vtuber} className="h-full w-full object-cover" />
</div>
 <div className="flex flex-col">
 <span className="inline-flex items-center gap-1.5 text-[10px] font-bold leading-tight text-[var(--brand-text)]">
 <span className="h-4 w-4 overflow-hidden rounded-full bg-[var(--brand-bg-900)]">
 {s.hostAvatarUrl ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img src={s.hostAvatarUrl} alt={s.vtuber} className="h-full w-full object-cover" />
 ) : (
 <span className="grid h-full w-full place-items-center text-[8px] font-bold text-[var(--brand-primary)]">
 {(s.hostChannelName || s.vtuber || "A").slice(0, 1).toUpperCase()}
 </span>
 )}
 </span>
 <span>{s.vtuber}</span>
 </span>
 <span className="max-w-[120px] truncate text-[9px] leading-tight text-[var(--brand-text-muted)]">{s.title}</span>
 </div>
 <div className="rounded bg-[var(--brand-accent)]/20 px-1.5 py-0.5 text-[9px] font-bold text-[var(--brand-accent)]">
 {tx("参加受付中", "Join Open")}
 </div>
 </div>
 ))}
 {sessions.length === 0 ? (
 <span className="py-1 text-[10px] text-[var(--brand-text-muted)]">{tx("近日予定の配信はありません", "No upcoming streams")}</span>
 ) : null}
 </div>
 </div>
 </div>
 );
}
