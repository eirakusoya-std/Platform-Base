"use client";

import { useMemo, useState } from "react";
import { TopNav } from "../../components/home/TopNav";

type QueueItem = {
  id: string;
  name: string;
  level: "beginner" | "intermediate";
  topic: string;
};

const INITIAL_QUEUE: QueueItem[] = [
  { id: "q1", name: "Kaito", level: "beginner", topic: "自己紹介" },
  { id: "q2", name: "Ren", level: "intermediate", topic: "推しトーク" },
  { id: "q3", name: "Yuma", level: "beginner", topic: "ゲーム感想" },
];

const INITIAL_CHAT = [
  { id: "m1", user: "mod_nana", text: "参加希望は #join をつけて送ってください" },
  { id: "m2", user: "viewer_21", text: "#join 自己紹介いけます" },
  { id: "m3", user: "viewer_88", text: "音量ちょうどいいです！" },
];

export default function StudioLivePage() {
  const [isLive, setIsLive] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [shareOn, setShareOn] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState(INITIAL_CHAT);

  const metrics = useMemo(
    () => [
      { label: "視聴者", value: "128" },
      { label: "同時会話", value: `${queue.length}` },
      { label: "平均遅延", value: "2.1s" },
      { label: "接続品質", value: "Good" },
    ],
    [queue.length],
  );

  const approve = (id: string) => setQueue((prev) => prev.filter((q) => q.id !== id));
  const reject = (id: string) => setQueue((prev) => prev.filter((q) => q.id !== id));

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChat((prev) => [...prev, { id: `${Date.now()}`, user: "host", text }]);
    setChatInput("");
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] pb-20 text-[var(--brand-text)] md:pb-0">
      <TopNav />

      <main className="mx-auto max-w-[1500px] px-4 py-4 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Live Studio</h1>
            <p className="text-sm text-[var(--brand-text-muted)]">配信中のモニタリングと参加者コントロール</p>
          </div>
          <div className="flex items-center gap-2">
          <a href="/room/studio-main?role=host&mic=1&cam=1&speaker=1" className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--brand-bg-900)] transition-all hover:brightness-110">
            WebRTCで配信
          </a>
          <button
            onClick={() => setIsLive((v) => !v)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              isLive ? "bg-[var(--brand-accent)] text-[var(--brand-text)]" : "bg-[var(--brand-primary)] text-[var(--brand-bg-900)]"
            }`}
          >
            {isLive ? "配信終了" : "配信再開"}
          </button>
        </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
          <section className="space-y-4">
            <div className="rounded-2xl bg-[var(--brand-surface)] p-3 shadow-lg shadow-black/25">
              <div className="overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16/9" }}>
                <img src="/image/thumbnail/thumbnail_5.png" alt="live" className="h-full w-full object-cover" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  onClick={() => setMicOn((v) => !v)}
                  className={`rounded-lg px-3 py-2 text-sm ${micOn ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"}`}
                >
                  🎤 {micOn ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => setCamOn((v) => !v)}
                  className={`rounded-lg px-3 py-2 text-sm ${camOn ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"}`}
                >
                  📷 {camOn ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => setShareOn((v) => !v)}
                  className={`rounded-lg px-3 py-2 text-sm ${shareOn ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"}`}
                >
                  🖥 {shareOn ? "共有中" : "共有"}
                </button>
                <button className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm text-[var(--brand-text-muted)]">🎬 シーン切替</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {metrics.map((item) => (
                <div key={item.label} className="rounded-xl bg-[var(--brand-surface)] px-3 py-2 shadow-lg shadow-black/25">
                  <p className="text-[11px] text-[var(--brand-text-muted)]">{item.label}</p>
                  <p className="text-lg font-bold text-[var(--brand-text)]">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-[var(--brand-surface)] p-4 shadow-lg shadow-black/25">
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-[var(--brand-text-muted)]">参加キュー（英会話）</h2>
              <div className="space-y-2">
                {queue.length === 0 ? (
                  <p className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-3 text-sm text-[var(--brand-text-muted)]">待機中の参加者はいません</p>
                ) : (
                  queue.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-[var(--brand-bg-900)] px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-[var(--brand-text-muted)]">{item.topic} / {item.level === "beginner" ? "初級" : "中級"}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approve(item.id)} className="rounded-md bg-[var(--brand-primary)] px-2 py-1 text-xs font-semibold text-[var(--brand-bg-900)]">承認</button>
                        <button onClick={() => reject(item.id)} className="rounded-md bg-[var(--brand-accent)]/20 px-2 py-1 text-xs font-semibold text-[var(--brand-accent)]">却下</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl bg-[var(--brand-surface)] shadow-lg shadow-black/25">
            <div className="px-4 py-3">
              <p className="text-sm font-semibold">配信者チャット</p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {chat.map((m) => (
                <div key={m.id} className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2">
                  <p className="mb-1 text-[11px] font-semibold text-[var(--brand-primary)]">{m.user}</p>
                  <p className="text-sm text-[var(--brand-text)]">{m.text}</p>
                </div>
              ))}
            </div>
            <div className="p-3">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      sendChat();
                    }
                  }}
                  placeholder="告知・案内を入力"
                  className="flex-1 rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm text-[var(--brand-text)] outline-none placeholder:text-[var(--brand-text-muted)]"
                />
                <button onClick={sendChat} className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--brand-bg-900)]">
                  送信
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
