import { MouseEvent } from "react";
import { SlotBar } from "../SlotBar";
import { ModalSession, StartingSoonSession } from "../types";
import { formatCountdown, formatCountdownLabel, getTypeInfo } from "../utils";

type StartingSoonSectionProps = {
  sessions: StartingSoonSession[];
  countdown: Record<number, number>;
  reservedSet: Set<number>;
  onOpenSession: (session: ModalSession) => void;
  onToggleReserve: (event: MouseEvent, sessionId: number) => void;
  onParticipate: (sessionId: number) => void;
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
          <div className="flex items-center gap-2 rounded-full bg-[#1e3a5f] px-3 py-1.5">
            <span className="text-xs">⚡</span>
            <span className="text-xs font-bold tracking-widest text-white">STARTING SOON</span>
          </div>
          <p className="text-sm text-gray-500">配信開始前だけ参加枠を確保できます</p>
        </div>
        <span className="text-xs text-gray-400">{sessions.length} 件</span>
      </div>

      {sessions.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">該当する配信が見つかりませんでした</div>
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
                className={`group cursor-pointer overflow-hidden rounded-xl border bg-white transition-all ${urgent ? "border-red-300" : "border-gray-200 hover:border-[#1e3a5f]"} hover:shadow-md`}
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
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={session.thumbnail} alt={session.vtuber} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div
                    className="absolute inset-0"
                    style={{ background: `radial-gradient(ellipse at center 100%, ${session.glowColor} 0%, transparent 65%)` }}
                  />

                  <div className={`absolute left-2.5 top-2.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white backdrop-blur-md ${urgent ? "bg-red-500/90" : "bg-[#1e3a5f]/90"}`}>
                    {formatCountdown(seconds)}
                  </div>

                  <div className={`absolute right-2.5 top-2.5 flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold backdrop-blur-md ${typeInfo.bg}`}>
                    <span>{typeInfo.icon}</span>
                    <span>{typeInfo.label}</span>
                  </div>

                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <p className="mb-0.5 text-[10px] text-white/80">{session.vtuber}</p>
                    <p className="line-clamp-2 text-xs font-bold leading-tight text-white">{session.title}</p>
                  </div>
                </div>

                <div className="p-3.5">
                  <div className="mb-3">
                    <SlotBar left={session.slotsLeft} total={session.slotsTotal} size="sm" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition-all ${reserved ? "bg-emerald-500 text-white" : "bg-[#1e3a5f] text-white hover:bg-[#2d5080]"}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleReserve(event, session.id);
                        onParticipate(session.id);
                      }}
                    >
                      {reserved ? "✅ 予約済み" : "✨ 参加する"}
                    </button>
                    <button className="rounded-lg border border-gray-200 px-3 py-2.5 text-xs text-gray-500 transition-all hover:border-gray-300">👁</button>
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
