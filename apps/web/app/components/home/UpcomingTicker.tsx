import { StartingSoonSession } from "./types";

type UpcomingTickerProps = {
 sessions: StartingSoonSession[];
 onParticipate: (sessionId: string) => void;
};

export function UpcomingTicker({ sessions, onParticipate }: UpcomingTickerProps) {
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
 <span className="text-[10px] font-bold leading-tight text-[var(--brand-text)]">{s.vtuber}</span>
 <span className="max-w-[120px] truncate text-[9px] leading-tight text-[var(--brand-text-muted)]">{s.title}</span>
 </div>
 <div className="rounded bg-[var(--brand-accent)]/20 px-1.5 py-0.5 text-[9px] font-bold text-[var(--brand-accent)]">
 参加受付中
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
