"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopNav } from "../../components/home/TopNav";
import { createStreamSession } from "../../lib/streamSessions";

const CATEGORY_OPTIONS = ["雑談", "ゲーム", "歌枠", "英語"] as const;

export default function StudioPreLivePage() {
  const router = useRouter();

  const [title, setTitle] = useState("【英会話参加型】推しと距離を縮めるリアルトーク");
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]>("英語");
  const [description, setDescription] = useState("視聴者参加で英語フレーズを実際に使いながら会話する配信です。");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatOn, setChatOn] = useState(true);
  const [recordOn, setRecordOn] = useState(true);
  const [creating, setCreating] = useState(false);

  const checklist = useMemo(
    () => [
      { label: "タイトル設定", ok: title.trim().length >= 8 },
      { label: "カテゴリ選択", ok: Boolean(category) },
      { label: "マイク有効", ok: micOn },
      { label: "カメラ有効", ok: camOn },
    ],
    [title, category, micOn, camOn],
  );

  const ready = checklist.every((item) => item.ok);

  const startBroadcastFlow = () => {
    if (!ready || creating) return;
    setCreating(true);

    const created = createStreamSession({
      hostUserId: "vtuber-demo",
      hostName: "あなたのチャンネル",
      title: title.trim(),
      category,
      description: description.trim(),
      thumbnail: "/image/thumbnail/thumbnail_5.png",
      participationType: "First-come",
      slotsTotal: 10,
    });

    router.push(`/studio/live/${encodeURIComponent(created.sessionId)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] pb-20 text-[var(--brand-text)] md:pb-0">
      <TopNav />

      <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--brand-text-muted)]">Studio</p>
            <h1 className="mt-1 text-2xl font-bold">Pre-Live Setup</h1>
            <p className="mt-1 text-sm text-[var(--brand-text-muted)]">配信前の設定と機材チェックを行います。</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]">
              戻る
            </Link>
            <button
              onClick={startBroadcastFlow}
              disabled={!ready || creating}
              className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--brand-bg-900)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "作成中..." : "枠を作成して進む"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
          <section className="space-y-4">
            <div className="rounded-2xl bg-[var(--brand-surface)] p-4 shadow-lg shadow-black/25">
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-[var(--brand-text-muted)]">配信情報</h2>
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-[var(--brand-text-muted)]">タイトル</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text)] outline-none"
                  />
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="text-[var(--brand-text-muted)]">カテゴリ</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as (typeof CATEGORY_OPTIONS)[number])}
                      className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text)] outline-none"
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="text-[var(--brand-text-muted)]">公開設定</span>
                    <select className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text)] outline-none">
                      <option>公開</option>
                      <option>メンバー限定</option>
                      <option>非公開テスト</option>
                    </select>
                  </label>
                </div>

                <label className="grid gap-1 text-sm">
                  <span className="text-[var(--brand-text-muted)]">概要</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text)] outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--brand-surface)] p-4 shadow-lg shadow-black/25">
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-[var(--brand-text-muted)]">プレビュー</h2>
              <div className="overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16/9" }}>
                <img src="/image/thumbnail/thumbnail_5.png" alt="preview" className="h-full w-full object-cover" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  onClick={() => setMicOn((v) => !v)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${micOn ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"}`}
                >
                  🎤 {micOn ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => setCamOn((v) => !v)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${camOn ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"}`}
                >
                  📷 {camOn ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => setChatOn((v) => !v)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${chatOn ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"}`}
                >
                  💬 {chatOn ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => setRecordOn((v) => !v)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${recordOn ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"}`}
                >
                  ⏺ {recordOn ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl bg-[var(--brand-surface)] p-4 shadow-lg shadow-black/25">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-[var(--brand-text-muted)]">配信開始チェック</h2>
            <div className="space-y-2">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm">
                  <span>{item.label}</span>
                  <span className={item.ok ? "text-[var(--brand-primary)]" : "text-[var(--brand-accent)]"}>{item.ok ? "OK" : "NG"}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg bg-[var(--brand-bg-900)] p-3 text-xs text-[var(--brand-text-muted)]">
              <p>推奨: 配信開始の2分前に「待機画面」へ切り替えて、視聴者の音量確認を行ってください。</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
