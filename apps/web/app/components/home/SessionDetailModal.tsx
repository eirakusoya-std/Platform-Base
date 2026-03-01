import { ModalSession } from "./types";

type SessionDetailModalProps = {
 session: ModalSession;
 onClose: () => void;
 onParticipate: (sessionId: string) => void;
};

export function SessionDetailModal({ session, onClose, onParticipate }: SessionDetailModalProps) {
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
 <p className="text-sm font-bold text-[var(--brand-bg-900)]">{session.startsIn}</p>
 </div>
 <div className="absolute bottom-4 right-4 rounded-lg bg-[var(--brand-accent)] px-4 py-2">
 <p className="text-sm font-bold text-[var(--brand-bg-900)]">{session.slotsLeft} spots left</p>
 </div>
 </div>

 <div className="overflow-y-auto p-8">
 <h2 className="mb-2 text-2xl font-bold text-[var(--brand-text)]">{session.title}</h2>
 <p className="mb-6 text-lg text-[var(--brand-primary)]">{session.vtuber}</p>

 <div className="mb-6">
 <h3 className="mb-2 text-sm font-bold text-[var(--brand-text)]">配信内容</h3>
 <p className="text-sm leading-relaxed text-[var(--brand-text-muted)]">{session.description}</p>
 </div>

 <div className="mb-6 grid grid-cols-2 gap-4">
 <div className="rounded-lg bg-[var(--brand-surface)] p-4">
 <p className="mb-0.5 text-xs text-[var(--brand-text-muted)]">配信時間</p>
 <p className="text-sm font-bold text-[var(--brand-text)]">{session.duration}</p>
 </div>
 <div className="rounded-lg bg-[var(--brand-surface)] p-4">
 <p className="mb-0.5 text-xs text-[var(--brand-text-muted)]">参加方式</p>
 <p className="text-sm font-bold text-[var(--brand-text)]">{session.participationType === "First-come" ? "先着順" : "抽選制"}</p>
 </div>
 </div>

 {session.userHistory && (
 <div className="mb-6 rounded-lg bg-[var(--brand-surface)] p-4">
 <h3 className="mb-3 text-sm font-bold text-[var(--brand-text)]">あなたの参加履歴</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="mb-0.5 text-xs text-[var(--brand-text-muted)]">総参加回数</p>
 <p className="text-lg font-bold text-[var(--brand-primary)]">{session.userHistory.totalParticipations}回</p>
 </div>
 <div>
 <p className="mb-0.5 text-xs text-[var(--brand-text-muted)]">最終参加日</p>
 <p className="text-sm font-medium text-[var(--brand-text)]">{session.userHistory.lastParticipation}</p>
 </div>
 </div>
 </div>
 )}

 <div className="mb-6 flex items-center gap-3 rounded-lg bg-[var(--brand-primary)]/15 p-4">
 <div className="text-[var(--brand-primary)]">✅</div>
 <div>
 <p className="text-sm font-bold text-[var(--brand-primary)]">参加可能</p>
 <p className="text-xs text-[var(--brand-primary)]">現在は検証モードのため、サブスクなしで参加できます。</p>
 </div>
 </div>
 </div>

 <div className="sticky bottom-0 z-10 bg-[var(--brand-bg-800)] p-6">
 <div className="flex gap-3">
 <button className="flex-1 rounded-lg px-6 py-4 font-bold text-[var(--brand-text)] transition-colors ">
 視聴のみ (無料)
 </button>
 <button
 className="flex-1 rounded-lg bg-[var(--brand-primary)] px-6 py-4 font-bold text-[var(--brand-bg-900)] transition-colors hover:bg-[var(--brand-primary)]"
 onClick={() => onParticipate(session.id)}
 >
 参加する
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
