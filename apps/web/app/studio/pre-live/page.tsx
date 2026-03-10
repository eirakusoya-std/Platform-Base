"use client";

import { ComponentType, SVGProps, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatBubbleLeftRightIcon, MicrophoneIcon, RadioIcon, VideoCameraIcon } from "@heroicons/react/24/solid";
import { TopNav } from "../../components/home/TopNav";
import { StudioProgress } from "../../components/ui/StudioProgress";
import { isLikelyVirtualCamera, pickPreferredVideoDevice } from "../../lib/cameraDevices";
import { useI18n } from "../../lib/i18n";
import { createStreamSession } from "../../lib/streamSessions";
import { useUserSession } from "../../lib/userSession";

const CATEGORY_OPTIONS = ["雑談", "ゲーム", "歌枠", "英語"] as const;

type CircleControlProps = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  on: boolean;
  onToggle: () => void;
};

function CircleControl({ label, icon: Icon, on, onToggle }: CircleControlProps) {
  return (
    <button onClick={onToggle} className="group flex w-[84px] flex-col items-center gap-1">
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
          on
            ? "bg-[var(--brand-primary)] text-white"
            : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"
        }`}
      >
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <span className="text-[10px] font-semibold text-[var(--brand-text-muted)]">{label}</span>
      <span className={`text-[11px] font-semibold ${on ? "text-[var(--brand-primary)]" : "text-[var(--brand-text-muted)]"}`}>{on ? "ON" : "OFF"}</span>
    </button>
  );
}

export default function StudioPreLivePage() {
  const router = useRouter();
  const { tx } = useI18n();
  const { isVtuber, hydrated } = useUserSession();

  const [title, setTitle] = useState("【英会話参加型】推しと距離を縮めるリアルトーク");
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]>("英語");
  const [description, setDescription] = useState("視聴者参加で英語フレーズを実際に使いながら会話する配信です。");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatOn, setChatOn] = useState(true);
  const [recordOn, setRecordOn] = useState(true);
  const [creating, setCreating] = useState(false);
  const [publishMode, setPublishMode] = useState<"create_only" | "scheduled" | "go_live_now">("go_live_now");
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const target = new Date(Date.now() + 30 * 60 * 1000);
    const local = new Date(target.getTime() - target.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [startWarnings, setStartWarnings] = useState<string[]>([]);

  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState([
    { id: "m1", user: "mod_nana", text: "配信前チェック中です。音量テスト歓迎です。" },
    { id: "m2", user: "viewer_21", text: "待機しています！" },
  ]);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!isVtuber) router.replace("/");
  }, [hydrated, isVtuber, router]);

  useEffect(() => {
    let cancelled = false;

    const setupPreview = async () => {
      try {
        streamRef.current?.getTracks().forEach((track) => track.stop());

        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (previewRef.current) {
          previewRef.current.srcObject = stream;
          previewRef.current.muted = true;
        }

        stream.getAudioTracks().forEach((track) => {
          track.enabled = micOn;
        });
        stream.getVideoTracks().forEach((track) => {
          track.enabled = camOn;
        });

        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;

        const videos = devices.filter((device) => device.kind === "videoinput");
        setVideoDevices(videos);

        if (!selectedVideoDeviceId && videos.length > 0) {
          const preferred = pickPreferredVideoDevice(videos);
          if (preferred?.deviceId) setSelectedVideoDeviceId(preferred.deviceId);
        }

        setMediaError(null);
      } catch {
        if (!cancelled) {
          setMediaError(tx("カメラまたはマイクにアクセスできません。ブラウザ権限を確認してください。", "Camera/mic access denied. Check browser permissions."));
        }
      }
    };

    setupPreview();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (previewRef.current) previewRef.current.srcObject = null;
    };
  }, [selectedVideoDeviceId, camOn, micOn, tx]);

  const selectedVideoLabel = useMemo(
    () => videoDevices.find((device) => device.deviceId === selectedVideoDeviceId)?.label ?? tx("デフォルトカメラ", "Default camera"),
    [selectedVideoDeviceId, tx, videoDevices],
  );

  const usingVirtualCamera = useMemo(() => isLikelyVirtualCamera(selectedVideoLabel), [selectedVideoLabel]);

  const startBroadcastFlow = () => {
    setShowPublishMenu(false);
    const warnings: string[] = [];
    if (title.trim().length < 8) warnings.push(tx("タイトルは8文字以上で入力してください。", "Title must be at least 8 characters."));
    if (!category) warnings.push(tx("カテゴリを選択してください。", "Choose a category."));
    if (!micOn) warnings.push(tx("マイクをONにしてください。", "Turn MIC ON before continue."));
    if (!camOn) warnings.push(tx("カメラをONにしてください。", "Turn CAM ON before continue."));
    if (!selectedVideoDeviceId) warnings.push(tx("カメラソースを選択してください。", "Choose a camera source."));
    if (publishMode === "scheduled") {
      const parsed = new Date(scheduledAt);
      if (!scheduledAt || Number.isNaN(parsed.getTime())) {
        warnings.push(tx("予約開始時刻を指定してください。", "Set a scheduled start time."));
      } else if (parsed.getTime() <= Date.now() + 60 * 1000) {
        warnings.push(tx("予約時刻は1分以上先を指定してください。", "Scheduled time must be at least 1 minute in the future."));
      }
    }

    setStartWarnings(warnings);
    if (warnings.length > 0 || creating) return;

    setCreating(true);

    const startsAt =
      publishMode === "scheduled" && scheduledAt
        ? new Date(scheduledAt).toISOString()
        : new Date().toISOString();

    const created = createStreamSession({
      hostUserId: "vtuber-demo",
      hostName: "あなたのチャンネル",
      title: title.trim(),
      category,
      description: description.trim(),
      thumbnail: "/image/thumbnail/thumbnail_5.png",
      startsAt,
      participationType: "First-come",
      slotsTotal: 10,
      preferredVideoDeviceId: selectedVideoDeviceId || undefined,
      preferredVideoLabel: selectedVideoLabel || undefined,
    });

    if (publishMode === "go_live_now") {
      router.push(`/studio/live/${encodeURIComponent(created.sessionId)}?autostart=1`);
      return;
    }

    router.push(`/studio/live/${encodeURIComponent(created.sessionId)}`);
  };

  const sendChat = () => {
    const value = chatInput.trim();
    if (!value) return;
    setChat((prev) => [...prev, { id: `${Date.now()}`, user: "host", text: value }]);
    setChatInput("");
  };

  if (!hydrated || !isVtuber) return null;

  return (
    <div className="h-screen overflow-hidden bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav mode="studio" />

      <main className="mx-auto grid h-[calc(100vh-72px)] max-w-[1440px] grid-cols-[1fr_320px] gap-4 overflow-hidden px-4 py-3 lg:grid-cols-[58px_1fr_360px] lg:px-6">
        <aside className="hidden lg:block">
          <StudioProgress current="prelive" orientation="vertical" />
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Pre-Live Setup</h1>
              <p className="text-xs text-[var(--brand-text-muted)]">{tx("配信前の設定を行ってください。", "Set up your stream before going live.")}</p>
            </div>
            <div className="relative flex items-center">
              <button
                onClick={startBroadcastFlow}
                disabled={creating}
                className="rounded-l-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_26px_rgba(124,106,230,0.45)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating
                  ? tx("作成中...", "Creating...")
                  : publishMode === "go_live_now"
                    ? tx("作成して開始", "Create & Start")
                    : publishMode === "scheduled"
                      ? tx("予約枠を作成", "Create Scheduled Stream")
                      : tx("枠を作成", "Create Room")}
              </button>
              <button
                type="button"
                onClick={() => setShowPublishMenu((v) => !v)}
                className="rounded-r-xl border-l border-black/20 bg-[var(--brand-primary)] px-3 py-2.5 text-sm font-black text-white shadow-[0_10px_26px_rgba(124,106,230,0.45)]"
                aria-label={tx("配信モードを選択", "Select publish mode")}
              >
                ▾
              </button>
              {showPublishMenu && (
                <div className="absolute right-0 top-[44px] z-20 w-[260px] rounded-xl bg-[var(--brand-surface)] p-2 shadow-xl shadow-black/40">
                  <button
                    type="button"
                    onClick={() => {
                      setPublishMode("go_live_now");
                      setShowPublishMenu(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${publishMode === "go_live_now" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--brand-text)] hover:bg-[var(--brand-bg-900)]"}`}
                  >
                    {tx("今すぐ開始", "Start now")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPublishMode("create_only");
                      setShowPublishMenu(false);
                    }}
                    className={`mt-1 w-full rounded-lg px-3 py-2 text-left text-sm ${publishMode === "create_only" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--brand-text)] hover:bg-[var(--brand-bg-900)]"}`}
                  >
                    {tx("枠だけ作成", "Create room only")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPublishMode("scheduled");
                      setShowPublishMenu(false);
                    }}
                    className={`mt-1 w-full rounded-lg px-3 py-2 text-left text-sm ${publishMode === "scheduled" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--brand-text)] hover:bg-[var(--brand-bg-900)]"}`}
                  >
                    {tx("予約配信", "Schedule stream")}
                  </button>
                </div>
              )}
            </div>
          </div>

          {startWarnings.length > 0 && (
            <div className="mb-2 rounded-xl bg-[var(--brand-accent)]/15 p-2.5 text-xs text-[var(--brand-accent)]">
              {startWarnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}

          <section className="rounded-2xl bg-[var(--brand-surface)] p-3 shadow-lg shadow-black/25">
            <div
              className="relative mx-auto max-w-[640px] overflow-hidden rounded-xl bg-[var(--brand-bg-900)]"
              style={{ aspectRatio: "16/9" }}
            >
              <video ref={previewRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              {!camOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--brand-bg-900)]/70 text-sm font-semibold text-[var(--brand-text-muted)]">
                  {tx("カメラOFF", "Camera OFF")}
                </div>
              )}
            </div>
            {mediaError && <p className="mt-2 text-xs text-[var(--brand-accent)]">{mediaError}</p>}

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <CircleControl label="MIC" icon={MicrophoneIcon} on={micOn} onToggle={() => setMicOn((v) => !v)} />
              <CircleControl label="CAM" icon={VideoCameraIcon} on={camOn} onToggle={() => setCamOn((v) => !v)} />
              <CircleControl label="CHAT" icon={ChatBubbleLeftRightIcon} on={chatOn} onToggle={() => setChatOn((v) => !v)} />
              <CircleControl label="REC" icon={RadioIcon} on={recordOn} onToggle={() => setRecordOn((v) => !v)} />
            </div>
          </section>

          <section className="mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl bg-[var(--brand-surface)] p-3 shadow-lg shadow-black/25">
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-[var(--brand-text-muted)]">{tx("配信設定", "Stream Settings")}</h2>
            <div className="h-full space-y-3 overflow-y-auto pr-1">
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--brand-text-muted)]">{tx("タイトル", "Title")}</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text)] outline-none" />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-[var(--brand-text-muted)]">{tx("カテゴリ", "Category")}</span>
                <select value={category} onChange={(e) => setCategory(e.target.value as (typeof CATEGORY_OPTIONS)[number])} className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text)] outline-none">
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-[var(--brand-text-muted)]">{tx("配信カメラ", "Camera Source")}</span>
                <select value={selectedVideoDeviceId} onChange={(event) => setSelectedVideoDeviceId(event.target.value)} className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text)] outline-none">
                  <option value="">{tx("デフォルトカメラ", "Default camera")}</option>
                  {videoDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>

              {!usingVirtualCamera && (
                <div className="rounded-lg bg-[var(--brand-accent)]/15 px-3 py-2 text-xs text-[var(--brand-accent)]">
                  {tx("仮想カメラ以外が選択されています。VTuber配信では仮想カメラの利用を推奨します。", "A non-virtual camera is selected. Virtual camera is recommended.")}
                </div>
              )}

              <div className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm">
                <p className="text-[11px] text-[var(--brand-text-muted)]">{tx("公開方法", "Publish Mode")}</p>
                <p className="font-semibold text-[var(--brand-text)]">
                  {publishMode === "go_live_now"
                    ? tx("今すぐ開始", "Start now")
                    : publishMode === "scheduled"
                      ? tx("予約配信", "Schedule stream")
                      : tx("枠だけ作成", "Create room only")}
                </p>
              </div>

              {publishMode === "scheduled" && (
                <label className="grid gap-1 text-sm">
                  <span className="text-[var(--brand-text-muted)]">{tx("開始時刻", "Start time")}</span>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text)] outline-none"
                  />
                </label>
              )}

              <label className="grid gap-1 text-sm">
                <span className="text-[var(--brand-text-muted)]">{tx("概要", "Description")}</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text)] outline-none" />
              </label>
            </div>
          </section>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden">
          <section className="flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl bg-[var(--brand-surface)] shadow-lg shadow-black/25">
            <div className="border-b border-black/20 px-3 py-2">
              <p className="text-sm font-semibold">{tx("配信者チャット", "Host Chat")}</p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {chat.map((m) => (
                <div key={m.id} className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2">
                  <p className="mb-1 text-[11px] font-semibold text-[var(--brand-primary)]">{m.user}</p>
                  <p className="text-sm text-[var(--brand-text)]">{m.text}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-black/20 p-3">
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
                  placeholder={tx("告知・案内を入力", "Type announcement")}
                  className="flex-1 rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm text-[var(--brand-text)] outline-none placeholder:text-[var(--brand-text-muted)]"
                />
                <button onClick={sendChat} className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white">
                  {tx("送信", "Send")}
                </button>
              </div>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
