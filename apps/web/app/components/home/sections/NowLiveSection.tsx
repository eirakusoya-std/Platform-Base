"use client";

import { LiveSession } from "../types";
import { getTypeInfo } from "../utils";
import { useI18n } from "../../../lib/i18n";
import { EyeIcon, UsersIcon } from "@heroicons/react/24/outline";

type NowLiveSectionProps = {
 sessions: LiveSession[];
 onOpenSession: (sessionId: string) => void;
 onOpenChannel: (hostUserId: string) => void;
};

export function NowLiveSection({ sessions, onOpenSession, onOpenChannel }: NowLiveSectionProps) {
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
            const slotsAvailable = session.slotsLeft > 0;

            return (
              <div
                key={session.id}
                className="group overflow-hidden rounded-xl bg-[var(--brand-surface)] shadow-lg shadow-black/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
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

                  {slotsAvailable ? (
                    <div className="mb-3 rounded-lg bg-[var(--brand-primary)]/15 px-3 py-2">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand-primary)]">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-primary)]" />
                        {session.slotsLeft}枠 空きあり - 詳細で参加方法を確認
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

                  <div className="flex items-center justify-between text-[11px] text-[var(--brand-text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <EyeIcon className="h-3.5 w-3.5" aria-hidden />
                      {session.viewers.toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="h-3.5 w-3.5" aria-hidden />
                      {session.slotsLeft}/{session.slotsTotal}
                    </span>
                  </div>

                  {session.userHistory && (
                    <div className="mt-3 flex items-center justify-between pt-3">
                      <span className="text-[11px] text-[var(--brand-text-muted)]">{tx("あなたの参加回数", "Your joins")}</span>
                      <span className="text-xs font-bold text-[var(--brand-primary)]">{session.userHistory.totalParticipations}{tx("回", "")}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenSession(session.id)}
                    className="mt-3 w-full rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-primary-light)]"
                  >
                    {tx("詳細を見る", "View details")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
