import { MouseEvent } from "react";
import { LiveSession, ModalSession } from "../types";
import { getTypeInfo } from "../utils";

type NowLiveSectionProps = {
  sessions: LiveSession[];
  notifySet: Set<number>;
  onOpenSession: (session: ModalSession) => void;
  onToggleNotify: (event: MouseEvent, sessionId: number) => void;
};

export function NowLiveSection({ sessions, notifySet, onOpenSession, onToggleNotify }: NowLiveSectionProps) {
  return (
    <section className="py-10">
      <div className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-red-500 px-3 py-1.5 shadow-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
            <span className="text-xs font-bold tracking-widest text-white">LIVE</span>
          </div>
          <p className="text-sm text-gray-500">現在配信中のセッション</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1 border border-red-100">
          <span className="text-[10px] font-bold text-red-600 uppercase">Total Live</span>
          <span className="text-xs font-black text-red-600">{sessions.length}</span>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">現在ライブ配信はありません</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sessions.map((session) => {
            const typeInfo = getTypeInfo(session.participationType);
            const notified = notifySet.has(session.id);
            const slotsAvailable = session.slotsLeft > 0;

            return (
              <div
                key={session.id}
                className="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-md"
                onClick={() =>
                  onOpenSession({
                    id: session.id,
                    vtuber: session.vtuber,
                    title: session.title,
                    thumbnail: session.thumbnail,
                    startsIn: "LIVE配信中",
                    slotsLeft: session.slotsLeft,
                    description: session.description,
                    duration: session.duration,
                    participationType: session.participationType,
                    isSubscribed: session.isSubscribed,
                    userHistory: session.userHistory,
                  })
                }
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  <img src={session.thumbnail} alt={session.vtuber} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-red-500 px-2.5 py-1.5 shadow-md">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    <span className="text-xs font-bold text-white">LIVE</span>
                  </div>

                  <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
                    <span className="text-xs text-white">👥</span>
                    <span className="text-xs font-bold text-white">{session.viewers.toLocaleString()}</span>
                  </div>

                  <div className={`absolute bottom-3 left-3 flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm ${typeInfo.bg}`}>
                    <span>{typeInfo.icon}</span>
                    <span>{typeInfo.label}</span>
                  </div>
                </div>

                <div className="p-3.5">
                  <div className="mb-3">
                    <h3 className="mb-0.5 text-sm font-bold text-gray-900">{session.vtuber}</h3>
                    <p className="line-clamp-2 text-xs text-gray-600">{session.title}</p>
                  </div>

                  {slotsAvailable ? (
                    <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        {session.slotsLeft}枠 空きあり - 今すぐ参加可能
                      </p>
                    </div>
                  ) : (
                    <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
                        参加枠は満員です - 空き待ち通知を設定できます
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1e3a5f] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#2d5080]">
                      ▶ 視聴する
                    </button>

                    <button
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${notified
                          ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"
                          : "border-gray-300 bg-white text-gray-600 hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
                        }`}
                      onClick={(event) => onToggleNotify(event, session.id)}
                    >
                      🔔 <span className="whitespace-nowrap">{notified ? "通知ON" : "空きが出たら参加"}</span>
                    </button>
                  </div>

                  {session.userHistory && (
                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                      <span className="text-[11px] text-gray-400">あなたの参加回数</span>
                      <span className="text-xs font-bold text-[#1e3a5f]">{session.userHistory.totalParticipations}回</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
