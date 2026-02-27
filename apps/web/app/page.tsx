"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Session = {
  id: number;
  vtuber: string;
  title: string;
  thumbnail: string;
  startsIn: string;
  slotsLeft: number;
  isSubscribed: boolean;
  description: string;
  duration: string;
  participationType: "First-come" | "Lottery";
  userHistory?: {
    totalParticipations: number;
    lastParticipation: string;
  };
};

type Channel = {
  id: number;
  name: string;
  image: string;
  isLive: boolean;
};

function generateRoomId() {
  return Math.random().toString(36).slice(2, 10);
}

const channels: Channel[] = [
  { id: 1, name: "ときのそら", image: "https://images.unsplash.com/photo-1629196613828-20513a90eaa3?w=200&h=200&fit=crop", isLive: false },
  { id: 2, name: "白上フブキ", image: "https://images.unsplash.com/photo-1574111114169-48bceb906030?w=200&h=200&fit=crop", isLive: true },
  { id: 3, name: "夏色まつり", image: "https://images.unsplash.com/photo-1751780247095-651fc13047ff?w=200&h=200&fit=crop", isLive: false },
  { id: 4, name: "星野るな", image: "https://images.unsplash.com/photo-1587741097323-0fdcee8b0e24?w=200&h=200&fit=crop", isLive: true },
  { id: 5, name: "赤井はあと", image: "https://images.unsplash.com/photo-1770116119330-2c80bc762d0b?w=200&h=200&fit=crop", isLive: false },
  { id: 6, name: "夜空メル", image: "https://images.unsplash.com/photo-1563393471486-370b35d7de64?w=200&h=200&fit=crop", isLive: false },
];

const sessions: Session[] = [
  {
    id: 1,
    vtuber: "ときのそら",
    title: "深夜のチル雑談 - みんなで話そう",
    thumbnail: "https://images.unsplash.com/photo-1629196613828-20513a90eaa3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    startsIn: "25分後に開始",
    slotsLeft: 3,
    isSubscribed: true,
    description: "深夜のゆったりとした雑談配信です。視聴者の皆さんと一緒に楽しい時間を過ごしましょう。",
    duration: "約60分",
    participationType: "First-come",
    userHistory: { totalParticipations: 12, lastParticipation: "2026.02.20" },
  },
  {
    id: 2,
    vtuber: "白上フブキ",
    title: "ゲーム配信: Apex Legends ランク",
    thumbnail: "https://images.unsplash.com/photo-1574111114169-48bceb906030?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    startsIn: "1時間30分後に開始",
    slotsLeft: 8,
    isSubscribed: true,
    description: "ランクマッチに挑戦！視聴者参加型で一緒にプレイしましょう。",
    duration: "約90分",
    participationType: "First-come",
    userHistory: { totalParticipations: 5, lastParticipation: "2026.02.18" },
  },
  {
    id: 3,
    vtuber: "夏色まつり",
    title: "歌枠 - リクエスト歌います！",
    thumbnail: "https://images.unsplash.com/photo-1751780247095-651fc13047ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    startsIn: "2時間後に開始",
    slotsLeft: 15,
    isSubscribed: false,
    description: "リクエスト受付中の歌枠！好きな曲をコメントで教えてください。",
    duration: "約120分",
    participationType: "Lottery",
  },
  {
    id: 4,
    vtuber: "星野るな",
    title: "English Learning Stream with Chat",
    thumbnail: "https://images.unsplash.com/photo-1587741097323-0fdcee8b0e24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    startsIn: "2時間45分後に開始",
    slotsLeft: 5,
    isSubscribed: true,
    description: "Let's practice English together! Beginners welcome!",
    duration: "約75分",
    participationType: "First-come",
    userHistory: { totalParticipations: 8, lastParticipation: "2026.02.22" },
  },
];

export default function HomePage() {
  const router = useRouter();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const userName = useMemo(() => "田中太郎", []);

  function goRoom() {
    router.push(`/room/${generateRoomId()}`);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-[1400px] px-6 py-5 lg:px-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-[#1e3a5f] text-xs font-bold text-white">A</div>
              <span className="text-lg font-medium tracking-wide">aiment</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-[#1e3a5f]">ライブ</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">スケジュール</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">タレント</span>
              <span className="text-gray-300">|</span>
              <div className="rounded-full border border-gray-200 px-3 py-1.5">{userName}</div>
            </div>
          </div>
        </div>
      </nav>

      <section className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto w-full max-w-[1400px] px-6 py-6 lg:px-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium">登録チャンネル</h2>
            <button className="text-xs text-[#1e3a5f] hover:underline">すべて管理</button>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-2">
            {channels.map((channel) => (
              <div key={channel.id} className="w-16 flex-shrink-0">
                <div className="relative mb-2 h-16 w-16">
                  <img
                    src={channel.image}
                    alt={channel.name}
                    className={`h-full w-full rounded-full border-2 object-cover ${channel.isLive ? "border-red-500 ring-2 ring-red-200" : "border-gray-200"}`}
                  />
                  {channel.isLive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-red-500 px-2 py-0.5 text-[8px] font-bold whitespace-nowrap text-white">
                      LIVE
                    </div>
                  )}
                </div>
                <p className="line-clamp-2 text-center text-xs leading-tight">{channel.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1400px] px-6 py-12 lg:px-12 lg:py-16">
        <div className="mb-10">
          <h1 className="mb-2 text-4xl font-bold tracking-wide text-[#1e3a5f] lg:text-5xl">STARTING SOON</h1>
          <p className="text-sm text-gray-600">今すぐ参加予約 - まもなく開始する配信</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {sessions.map((session) => (
            <article
              key={session.id}
              className="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-[#1e3a5f] hover:shadow-xl"
              onClick={() => setSelectedSession(session)}
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={session.thumbnail}
                  alt={session.vtuber}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute left-4 top-4 rounded-lg bg-[#1e3a5f]/95 px-3 py-2 text-xs font-bold text-white shadow-lg">
                  {session.startsIn}
                </div>
                <div className="absolute right-4 top-4 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-2 text-sm font-bold text-gray-900 shadow-lg">
                  {session.slotsLeft} 枠
                </div>
              </div>

              <div className="p-6">
                <h3 className="mb-2 line-clamp-1 text-xl font-bold">{session.title}</h3>
                <p className="mb-4 text-base font-medium text-[#1e3a5f]">{session.vtuber}</p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 rounded-lg border-2 border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition-all hover:border-gray-400"
                    onClick={(event) => event.stopPropagation()}
                  >
                    視聴のみ
                  </button>
                  <button
                    className={`flex-1 rounded-lg px-5 py-3 text-sm font-bold transition-all ${session.isSubscribed ? "bg-gradient-to-r from-[#1e3a5f] to-[#2d5080] text-white" : "cursor-not-allowed bg-gray-200 text-gray-500"}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!session.isSubscribed) return;
                      goRoom();
                    }}
                    disabled={!session.isSubscribed}
                  >
                    {session.isSubscribed ? "参加する" : "登録して参加"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {selectedSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative">
              <div className="aspect-video bg-gradient-to-br from-purple-50 to-pink-50">
                <img src={selectedSession.thumbnail} alt={selectedSession.vtuber} className="h-full w-full object-cover" />
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="absolute right-4 top-4 h-10 w-10 rounded-full bg-black/70 text-white hover:bg-black/90"
              >
                ×
              </button>
            </div>
            <div className="space-y-5 p-8">
              <div>
                <h2 className="mb-2 text-2xl font-bold">{selectedSession.title}</h2>
                <p className="text-lg text-[#1e3a5f]">{selectedSession.vtuber}</p>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold">配信内容</h3>
                <p className="text-sm leading-relaxed text-gray-700">{selectedSession.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="mb-1 text-xs text-gray-600">配信時間</p>
                  <p className="text-sm font-bold">{selectedSession.duration}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="mb-1 text-xs text-gray-600">参加方式</p>
                  <p className="text-sm font-bold">{selectedSession.participationType === "First-come" ? "先着順" : "抽選制"}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-4 font-bold text-gray-900">
                  視聴のみ (無料)
                </button>
                <button
                  className={`flex-1 rounded-lg px-6 py-4 font-bold ${selectedSession.isSubscribed ? "bg-[#1e3a5f] text-white" : "cursor-not-allowed bg-gray-200 text-gray-400"}`}
                  disabled={!selectedSession.isSubscribed}
                  onClick={goRoom}
                >
                  参加する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
