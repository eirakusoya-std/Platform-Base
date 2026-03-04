"use client";

import { MouseEvent } from "react";
import { LiveSession, ModalSession } from "../types";
import { getTypeInfo } from "../utils";
import { useI18n } from "../../../lib/i18n";

type NowLiveSectionProps = {
 sessions: LiveSession[];
 notifySet: Set<string>;
 onOpenSession: (session: ModalSession) => void;
 onToggleNotify: (event: MouseEvent, sessionId: string) => void;
};

export function NowLiveSection({ sessions, notifySet, onOpenSession, onToggleNotify }: NowLiveSectionProps) {
  const { tx } = useI18n();
  return (
    <section className="py-10">
      <div className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-[var(--brand-accent)] px-3 py-1.5 shadow-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand-bg-900)]" />
            <span className="text-xs font-bold tracking-widest text-[var(--brand-text)]">LIVE</span>
          </div>
          <p className="text-sm text-[var(--brand-text-muted)]">{tx("現在配信中のセッション", "Streams live now")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[var(--brand-accent)]/15 px-3 py-1">
          <span className="text-[10px] font-bold uppercase text-[var(--brand-accent)]">Total Live</span>
          <span className="text-xs font-black text-[var(--brand-accent)]">{sessions.length}</span>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--brand-text-muted)]">{tx("現在ライブ配信はありません", "No live streams right now")}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sessions.map((session) => {
            const typeInfo = getTypeInfo(session.participationType);
            const notified = notifySet.has(session.id);
            const slotsAvailable = session.slotsLeft > 0;

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
                <div className="overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  <img
                    src={session.thumbnail}
                    alt={session.vtuber}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="p-3.5">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <div className="flex items-center gap-1 rounded-lg bg-[var(--brand-accent)]/20 px-2 py-1 text-[10px] font-bold text-[var(--brand-accent)]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-accent)]" />
                      <span>LIVE</span>
                    </div>
                    <div className="rounded-lg bg-[var(--brand-bg-900)]/70 px-2 py-1 text-[10px] font-bold text-[var(--brand-text)]">
                      VIEW {session.viewers.toLocaleString()}
                    </div>
                    <div className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold ${typeInfo.bg}`}>
                      <span>{typeInfo.icon}</span>
                      <span>{typeInfo.label}</span>
                    </div>
                  </div>

                  <p className="mb-0.5 line-clamp-2 text-sm font-bold text-[var(--brand-text)]">{session.title}</p>
                  <p className="mb-3 text-xs text-[var(--brand-text-muted)]">{session.vtuber}</p>

                  {slotsAvailable ? (
                    <div className="mb-3 rounded-lg bg-[var(--brand-primary)]/15 px-3 py-2">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand-primary)]">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-primary)]" />
                        {session.slotsLeft}枠 空きあり - 今すぐ参加可能
                      </p>
                    </div>
                  ) : (
                    <div className="mb-3 rounded-lg bg-[var(--brand-bg-900)] px-3 py-2">
                      <p className="flex items-center gap-1.5 text-xs text-[var(--brand-text-muted)]">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--brand-text-muted)]" />
                        参加枠は満員です - 空き待ち通知を設定できます
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] py-2.5 text-sm font-medium text-white transition-all hover:brightness-110">
                      {tx("LIVE 視聴", "Watch Live")}
                    </button>

                    <button
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                        notified
                          ? "bg-[var(--brand-primary)] text-white"
                          : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)] hover:text-[var(--brand-primary)]"
                      }`}
                      onClick={(event) => onToggleNotify(event, session.id)}
                    >
                      <span className="whitespace-nowrap">{notified ? tx("通知ON", "Notify ON") : tx("空きが出たら参加", "Notify when open")}</span>
                    </button>
                  </div>

                  {session.userHistory && (
                    <div className="mt-3 flex items-center justify-between pt-3">
                      <span className="text-[11px] text-[var(--brand-text-muted)]">{tx("あなたの参加回数", "Your joins")}</span>
                      <span className="text-xs font-bold text-[var(--brand-primary)]">{session.userHistory.totalParticipations}{tx("回", "")}</span>
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
