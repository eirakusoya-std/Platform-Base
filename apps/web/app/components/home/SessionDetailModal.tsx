"use client";

import { ModalSession } from "./types";
import { useI18n } from "../../lib/i18n";

type SessionDetailModalProps = {
 session: ModalSession;
 onClose: () => void;
 onParticipate: (session: ModalSession) => void | Promise<void>;
};

export function SessionDetailModal({ session, onClose, onParticipate }: SessionDetailModalProps) {
 const { tx } = useI18n();
 const isPrelive = session.streamStatus === "prelive";
 const joinBlockedByReservation = session.streamStatus === "live" && session.reservationRequired && !session.reserved;
 const primaryLabel = isPrelive
   ? session.reserved
     ? tx("予約を取り消す", "Cancel Reservation")
     : tx("予約する", "Reserve")
   : joinBlockedByReservation
     ? tx("予約が必要", "Reservation Required")
     : tx("参加する", "Join");
 const availabilityTitle = isPrelive
   ? tx("まだ開始前です", "Not live yet")
   : joinBlockedByReservation
     ? tx("予約が必要です", "Reservation required")
     : tx("参加可能", "Available to Join");
 const availabilityText = isPrelive
   ? tx("この枠はまだ配信前です。参加ではなく予約を行ってください。", "This stream has not started yet. Reserve instead of joining.")
   : joinBlockedByReservation
     ? tx("このライブは予約必須の枠です。先に予約してから参加してください。", "This live session requires a reservation before joining.")
     : tx("現在は検証モードのため、サブスクなしで参加できます。", "Demo mode: join without subscription.");
 const primaryDisabled = joinBlockedByReservation;
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
 <div
 className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-[var(--brand-bg-800)] shadow-2xl"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="relative">
 <div className="aspect-video bg-gradient-to-br from-purple-50 to-pink-50">
 <img src={session.thumbnail} alt={session.vtuber} className="h-full w-full object-cover" />
 </div>
 <button
 onClick={onClose}
 className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-[var(--brand-text)] transition-colors hover:bg-black/90"
 >
 ✕
 </button>
 <div className="absolute bottom-4 left-4 rounded-lg bg-[var(--brand-primary)] px-4 py-2">
 <p className="text-sm font-bold text-white">{session.startsIn}</p>
 </div>
 <div className="absolute bottom-4 right-4 rounded-lg bg-[var(--brand-accent)] px-4 py-2">
 <p className="text-sm font-bold text-white">{session.slotsLeft} {tx("枠残り", "spots left")}</p>
 </div>
 </div>

 <div className="overflow-y-auto p-8">
 <h2 className="mb-2 text-2xl font-bold text-[var(--brand-text)]">{session.title}</h2>
 <p className="mb-6 text-lg text-[var(--brand-primary)]">{session.vtuber}</p>

 <div className="mb-6">
 <h3 className="mb-2 text-sm font-bold text-[var(--brand-text)]">{tx("配信内容", "About this stream")}</h3>
 <p className="text-sm leading-relaxed text-[var(--brand-text-muted)]">{session.description}</p>
 </div>

 <div className="mb-6 grid grid-cols-2 gap-4">
 <div className="rounded-lg bg-[var(--brand-surface)] p-4">
 <p className="mb-0.5 text-xs text-[var(--brand-text-muted)]">{tx("配信時間", "Duration")}</p>
 <p className="text-sm font-bold text-[var(--brand-text)]">{session.duration}</p>
 </div>
 <div className="rounded-lg bg-[var(--brand-surface)] p-4">
 <p className="mb-0.5 text-xs text-[var(--brand-text-muted)]">{tx("参加方式", "Entry Type")}</p>
 <p className="text-sm font-bold text-[var(--brand-text)]">{session.participationType === "First-come" ? tx("先着順", "First-come") : tx("抽選制", "Lottery")}</p>
 </div>
 </div>

 {session.userHistory && (
 <div className="mb-6 rounded-lg bg-[var(--brand-surface)] p-4">
 <h3 className="mb-3 text-sm font-bold text-[var(--brand-text)]">{tx("あなたの参加履歴", "Your history")}</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="mb-0.5 text-xs text-[var(--brand-text-muted)]">{tx("総参加回数", "Total joins")}</p>
 <p className="text-lg font-bold text-[var(--brand-primary)]">{session.userHistory.totalParticipations}{tx("回", "")}</p>
 </div>
 <div>
 <p className="mb-0.5 text-xs text-[var(--brand-text-muted)]">{tx("最終参加日", "Last joined")}</p>
 <p className="text-sm font-medium text-[var(--brand-text)]">{session.userHistory.lastParticipation}</p>
 </div>
 </div>
 </div>
 )}

 <div className="mb-6 flex items-center gap-3 rounded-lg bg-[var(--brand-primary)]/15 p-4">
 <div className="text-[var(--brand-primary)]">OK</div>
 <div>
 <p className="text-sm font-bold text-[var(--brand-primary)]">{availabilityTitle}</p>
 <p className="text-xs text-[var(--brand-primary)]">{availabilityText}</p>
 </div>
 </div>
 </div>

 <div className="sticky bottom-0 z-10 bg-[var(--brand-bg-800)] p-6">
 <div className="flex gap-3">
 <button className="flex-1 rounded-lg px-6 py-4 font-bold text-[var(--brand-text)] transition-colors ">
 {tx("視聴のみ (無料)", "Watch only (Free)")}
 </button>
 <button
 className="flex-1 rounded-lg bg-[var(--brand-primary)] px-6 py-4 font-bold text-white transition-colors hover:bg-[var(--brand-primary)] disabled:cursor-not-allowed disabled:opacity-50"
 disabled={primaryDisabled}
 onClick={() => onParticipate(session)}
 >
 {primaryLabel}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
