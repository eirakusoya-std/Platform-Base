import { ModalSession } from "./types";

type SessionDetailModalProps = {
  session: ModalSession;
  onClose: () => void;
  onParticipate: (sessionId: number) => void;
};

export function SessionDetailModal({ session, onClose, onParticipate }: SessionDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <div className="aspect-video bg-gradient-to-br from-purple-50 to-pink-50">
            <img src={session.thumbnail} alt={session.vtuber} className="h-full w-full object-cover" />
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/90"
          >
            ✕
          </button>
          <div className="absolute bottom-4 left-4 rounded-lg bg-[#1e3a5f] px-4 py-2">
            <p className="text-sm font-bold text-white">{session.startsIn}</p>
          </div>
          <div className="absolute bottom-4 right-4 rounded-lg bg-yellow-400 px-4 py-2">
            <p className="text-sm font-bold text-gray-900">{session.slotsLeft} spots left</p>
          </div>
        </div>

        <div className="p-8">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">{session.title}</h2>
          <p className="mb-6 text-lg text-[#1e3a5f]">{session.vtuber}</p>

          <div className="mb-6">
            <h3 className="mb-2 text-sm font-bold text-gray-900">配信内容</h3>
            <p className="text-sm leading-relaxed text-gray-700">{session.description}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-0.5 text-xs text-gray-600">配信時間</p>
              <p className="text-sm font-bold text-gray-900">{session.duration}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-0.5 text-xs text-gray-600">参加方式</p>
              <p className="text-sm font-bold text-gray-900">{session.participationType === "First-come" ? "先着順" : "抽選制"}</p>
            </div>
          </div>

          {session.userHistory && (
            <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-4">
              <h3 className="mb-3 text-sm font-bold text-gray-900">あなたの参加履歴</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-0.5 text-xs text-gray-600">総参加回数</p>
                  <p className="text-lg font-bold text-[#1e3a5f]">{session.userHistory.totalParticipations}回</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs text-gray-600">最終参加日</p>
                  <p className="text-sm font-medium text-gray-900">{session.userHistory.lastParticipation}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-emerald-600">✅</div>
            <div>
              <p className="text-sm font-bold text-emerald-900">参加可能</p>
              <p className="text-xs text-emerald-700">現在は検証モードのため、サブスクなしで参加できます。</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-4 font-bold text-gray-900 transition-colors hover:border-[#1e3a5f]">
              視聴のみ (無料)
            </button>
            <button
              className="flex-1 rounded-lg bg-[#1e3a5f] px-6 py-4 font-bold text-white transition-colors hover:bg-[#2d5080]"
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
