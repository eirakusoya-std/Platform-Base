"use client";

import { ComponentType, SVGProps, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatBubbleLeftRightIcon, MicrophoneIcon, RadioIcon, VideoCameraIcon } from "@heroicons/react/24/solid";
import { TopNav } from "../../components/home/TopNav";
import { StudioProgress } from "../../components/ui/StudioProgress";
import { isLikelyVirtualCamera, pickPreferredVideoDevice } from "../../lib/cameraDevices";
import { useI18n } from "../../lib/i18n";
import { createStreamSession, listAllStreamSessions, subscribeStreamSessions, type StreamSession, updateStreamSession } from "../../lib/streamSessions";
import { useUserSession } from "../../lib/userSession";

const CATEGORY_OPTIONS = ["雑談", "ゲーム", "歌枠", "英語"] as const;

function toLocalDateTimeInputValue(value: string) {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "";
  const local = new Date(target.getTime() - target.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatSessionTime(value: string) {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "-";
  return target.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusTone(status: StreamSession["status"]) {
  if (status === "live") return "bg-[var(--brand-accent)]/20 text-[var(--brand-accent)]";
  if (status === "ended") return "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]";
  return "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]";
}

function getStatusLabel(status: StreamSession["status"]) {
  if (status === "live") return "LIVE";
  if (status === "ended") return "ENDED";
  return "PRELIVE";
}

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
  const { user, isVtuber, loading } = useUserSession();

  const [title, setTitle] = useState("【英会話参加型】推しと距離を縮めるリアルトーク");
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]>("英語");
  const [description, setDescription] = useState("視聴者参加で英語フレーズを実際に使いながら会話する配信です。");
  const [participationType, setParticipationType] = useState<StreamSession["participationType"]>("First-come");
  const [reservationRequired, setReservationRequired] = useState(false);
  const [slotsTotal, setSlotsTotal] = useState(10);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatOn, setChatOn] = useState(true);
  const [recordOn, setRecordOn] = useState(true);
  const [creating, setCreating] = useState(false);
  const [publishMode, setPublishMode] = useState<"create_only" | "scheduled" | "go_live_now">("go_live_now");
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [ownSessions, setOwnSessions] = useState<StreamSession[]>([]);
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
  const [isDedicatedStudioTab, setIsDedicatedStudioTab] = useState(false);

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!loading && !isVtuber) router.replace("/");
  }, [isVtuber, loading, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsDedicatedStudioTab(params.get("studioTab") === "1");
  }, []);

  useEffect(() => {
    if (!isVtuber || !user) return;

    const sync = async () => {
      const sessions = await listAllStreamSessions().catch(() => []);
      setOwnSessions(sessions.filter((session) => session.hostUserId === user.id));
    };

    void sync();
    return subscribeStreamSessions(() => {
      void sync();
    });
  }, [isVtuber, user]);

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
  const selectedSession = useMemo(
    () => ownSessions.find((session) => session.sessionId === selectedSessionId) ?? null,
    [ownSessions, selectedSessionId],
  );
  const visibleOwnSessions = useMemo(() => ownSessions.filter((session) => session.status !== "ended"), [ownSessions]);

  useEffect(() => {
    if (!selectedSessionId) return;
    if (ownSessions.some((session) => session.sessionId === selectedSessionId)) return;
    setSelectedSessionId(null);
  }, [ownSessions, selectedSessionId]);

  const resetDraft = () => {
    setSelectedSessionId(null);
    setTitle("【英会話参加型】推しと距離を縮めるリアルトーク");
    setCategory("英語");
    setDescription("視聴者参加で英語フレーズを実際に使いながら会話する配信です。");
    setParticipationType("First-come");
    setReservationRequired(false);
    setSlotsTotal(10);
    setPublishMode("go_live_now");
    const target = new Date(Date.now() + 30 * 60 * 1000);
    const local = new Date(target.getTime() - target.getTimezoneOffset() * 60000);
    setScheduledAt(local.toISOString().slice(0, 16));
    setStartWarnings([]);
  };

  const loadSessionForEditing = (session: StreamSession) => {
    setSelectedSessionId(session.sessionId);
    setTitle(session.title);
    setCategory(CATEGORY_OPTIONS.includes(session.category as (typeof CATEGORY_OPTIONS)[number]) ? (session.category as (typeof CATEGORY_OPTIONS)[number]) : "雑談");
    setDescription(session.description);
    setParticipationType(session.participationType);
    setReservationRequired(session.reservationRequired);
    setSlotsTotal(session.slotsTotal);
    setScheduledAt(toLocalDateTimeInputValue(session.startsAt));
    setSelectedVideoDeviceId(session.preferredVideoDeviceId ?? "");
    setPublishMode(
      session.status === "prelive" && new Date(session.startsAt).getTime() > Date.now() + 60 * 1000 ? "scheduled" : "create_only",
    );
    setStartWarnings([]);
  };

  const actionLabel = selectedSession
    ? publishMode === "go_live_now"
      ? selectedSession.status === "live"
        ? tx("更新して管理へ", "Update & Open Live")
        : tx("更新して開始", "Update & Start")
      : publishMode === "scheduled"
        ? tx("予約枠を更新", "Update Scheduled Stream")
        : tx("枠を更新", "Update Room")
    : publishMode === "go_live_now"
      ? tx("作成して開始", "Create & Start")
      : publishMode === "scheduled"
        ? tx("予約枠を作成", "Create Scheduled Stream")
        : tx("枠を作成", "Create Room");

  const openLiveStudioTab = (sessionId: string, autoStart: boolean) => {
    const nextUrl = autoStart
      ? `/studio/live/${encodeURIComponent(sessionId)}?autostart=1&liveTab=1`
      : `/studio/live/${encodeURIComponent(sessionId)}?liveTab=1`;

    const opened = window.open(nextUrl, "_blank");
    if (opened) {
      opened.focus();
      return;
    }

    router.push(nextUrl);
  };

  const startBroadcastFlow = async () => {
    if (!user) return;
    setShowPublishMenu(false);
    const warnings: string[] = [];
    if (title.trim().length < 8) warnings.push(tx("タイトルは8文字以上で入力してください。", "Title must be at least 8 characters."));
    if (!category) warnings.push(tx("カテゴリを選択してください。", "Choose a category."));
    if (!micOn) warnings.push(tx("マイクをONにしてください。", "Turn MIC ON before continue."));
    if (!camOn) warnings.push(tx("カメラをONにしてください。", "Turn CAM ON before continue."));
    if (!selectedVideoDeviceId) warnings.push(tx("カメラソースを選択してください。", "Choose a camera source."));
    if (!Number.isFinite(slotsTotal) || slotsTotal < 1 || slotsTotal > 20) {
      warnings.push(tx("参加人数は1〜20人で設定してください。", "Participant limit must be between 1 and 20."));
    }
    if (reservationRequired && participationType !== "First-come") {
      warnings.push(tx("予約必須の枠は先着順で作成してください。", "Reservation-required sessions must use first-come participation."));
    }
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

    try {
      const startsAt =
        publishMode === "scheduled" && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : new Date().toISOString();

      const draft = {
        hostName: user.name,
        title: title.trim(),
        category,
        description: description.trim(),
        thumbnail: "/image/thumbnail/thumbnail_5.png",
        startsAt,
        participationType,
        reservationRequired,
        slotsTotal,
        preferredVideoDeviceId: selectedVideoDeviceId || undefined,
        preferredVideoLabel: selectedVideoLabel || undefined,
      };

      const targetSession = selectedSession
        ? await updateStreamSession(selectedSession.sessionId, draft)
        : await createStreamSession(draft);

      if (!targetSession) {
        throw new Error(tx("枠の更新に失敗しました。", "Failed to update stream."));
    }

    if (publishMode === "go_live_now") {
      const nextUrl =
        targetSession.status === "live"
          ? `/studio/live/${encodeURIComponent(targetSession.sessionId)}?liveTab=1`
          : `/studio/live/${encodeURIComponent(targetSession.sessionId)}?autostart=1&liveTab=1`;

      if (isDedicatedStudioTab) {
        router.push(nextUrl);
      } else {
        openLiveStudioTab(targetSession.sessionId, targetSession.status !== "live");
      }
      return;
    }

      router.push(`/studio/live/${encodeURIComponent(targetSession.sessionId)}`);
    } catch (error) {
      setStartWarnings([error instanceof Error ? error.message : tx("処理に失敗しました。", "Request failed.")]);
    } finally {
      setCreating(false);
    }
  };

  const sendChat = () => {
    const value = chatInput.trim();
    if (!value) return;
    setChat((prev) => [...prev, { id: `${Date.now()}`, user: "host", text: value }]);
    setChatInput("");
  };

  if (loading || !isVtuber) return null;

  return (
    <div className="h-screen overflow-hidden bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav mode="studio" />

      <main className="mx-auto grid h-[calc(100vh-72px)] max-w-[1680px] grid-cols-1 gap-4 overflow-hidden px-4 py-3 lg:grid-cols-[58px_1fr_640px] lg:px-6">
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
                {creating ? tx("処理中...", "Working...") : actionLabel}
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

          {isDedicatedStudioTab && (
            <div className="mb-2 rounded-xl bg-[var(--brand-primary)]/15 p-2.5 text-xs text-[var(--brand-primary)]">
              <p>{tx("このタブが配信専用タブです。設定、開始、終了までこの1タブで進行します。", "This is the dedicated studio tab. Use this single tab for setup, start, and end.")}</p>
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
              {selectedSession && (
                <div className="flex items-center justify-between rounded-lg bg-[var(--brand-primary)]/10 px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-[var(--brand-text)]">{tx("編集中の枠", "Editing Session")}</p>
                    <p className="text-[11px] text-[var(--brand-text-muted)]">{selectedSession.title}</p>
                  </div>
                  <button onClick={resetDraft} className="rounded-md bg-[var(--brand-bg-900)] px-2.5 py-1.5 text-xs font-semibold text-[var(--brand-text)]">
                    {tx("新規作成へ", "New Draft")}
                  </button>
                </div>
              )}

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
                <span className="text-[var(--brand-text-muted)]">{tx("参加方式", "Participation Type")}</span>
                <select
                  value={participationType}
                  onChange={(e) => setParticipationType(e.target.value as StreamSession["participationType"])}
                  className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text)] outline-none"
                >
                  <option value="First-come">{tx("先着順", "First-come")}</option>
                  <option value="Lottery">{tx("抽選制", "Lottery")}</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-[var(--brand-text-muted)]">{tx("参加人数上限", "Participant Limit")}</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={slotsTotal}
                  onChange={(e) => setSlotsTotal(Number.parseInt(e.target.value || "0", 10) || 0)}
                  className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text)] outline-none"
                />
              </label>

              <label className="grid gap-2 rounded-lg bg-[var(--brand-bg-900)] px-3 py-3 text-sm">
                <span className="text-[var(--brand-text-muted)]">{tx("参加予約", "Reservation Rule")}</span>
                <select
                  value={reservationRequired ? "required" : "optional"}
                  onChange={(e) => setReservationRequired(e.target.value === "required")}
                  className="rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-[var(--brand-text)] outline-none"
                >
                  <option value="optional">{tx("予約は任意", "Reservation optional")}</option>
                  <option value="required">{tx("予約必須の枠", "Reservation required")}</option>
                </select>
                <p className="text-[11px] text-[var(--brand-text-muted)]">
                  {reservationRequired
                    ? tx("この枠は事前予約したリスナー向けです。", "This session is for listeners who reserved in advance.")
                    : tx("通常参加のほか、事前予約も受け付けます。", "Listeners can join normally or reserve in advance.")}
                </p>
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

        <aside className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
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

          <section className="flex min-h-[220px] flex-col overflow-hidden rounded-2xl bg-[var(--brand-surface)] shadow-lg shadow-black/25">
            <div className="flex items-center justify-between border-b border-black/20 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">{tx("作成済みの枠", "Your Sessions")}</p>
                <p className="text-[11px] text-[var(--brand-text-muted)]">{tx("クリックで編集、開始、再利用できます。", "Click a session to edit or start it.")}</p>
              </div>
              <button onClick={resetDraft} className="rounded-md bg-[var(--brand-bg-900)] px-2 py-1 text-[11px] font-semibold text-[var(--brand-text)]">
                {tx("新規", "New")}
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {visibleOwnSessions.length === 0 ? (
                <div className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-4 text-sm text-[var(--brand-text-muted)]">
                  {tx("表示できる作成済みの枠はありません。", "No visible sessions yet.")}
                </div>
              ) : (
                visibleOwnSessions.map((session) => {
                  const active = session.sessionId === selectedSessionId;
                  return (
                    <button
                      key={session.sessionId}
                      type="button"
                      onClick={() => loadSessionForEditing(session)}
                      className={`w-full overflow-hidden rounded-2xl border text-left transition-all ${
                        active
                          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/8 shadow-[0_12px_28px_rgba(124,106,230,0.18)]"
                          : "border-transparent bg-[var(--brand-bg-900)] hover:border-white/10"
                      }`}
                    >
                      <div className="relative" style={{ aspectRatio: "16/9" }}>
                        <img src={session.thumbnail} alt={session.title} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-bg-900)] via-[var(--brand-bg-900)]/30 to-transparent" />
                        <div className="absolute left-3 top-3 flex items-center gap-2">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-black ${getStatusTone(session.status)}`}>
                            {getStatusLabel(session.status)}
                          </span>
                          <span className="rounded-full bg-black/45 px-2 py-1 text-[10px] font-bold text-white">
                            {session.category}
                          </span>
                          {session.reservationRequired && (
                            <span className="rounded-full bg-[var(--brand-accent)]/80 px-2 py-1 text-[10px] font-black text-white">
                              {tx("予約必須", "Reservation Required")}
                            </span>
                          )}
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="line-clamp-2 text-sm font-extrabold leading-tight text-white">{session.title}</p>
                          <p className="mt-1 text-[11px] text-white/75">{session.hostName}</p>
                        </div>
                      </div>

                      <div className="space-y-2 px-3 py-3">
                        <div className="flex items-center justify-between text-[11px] text-[var(--brand-text-muted)]">
                          <span>{formatSessionTime(session.startsAt)}</span>
                          <span>
                            {tx("残り枠", "Slots left")} {session.slotsLeft}/{session.slotsTotal}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[var(--brand-text-muted)]">
                            {session.status === "live" ? tx("配信中の枠", "Live session") : tx("編集可能な枠", "Editable session")}
                          </span>
                          <span className="text-[11px] font-semibold text-[var(--brand-primary)]">
                            {session.status === "live" ? tx("管理へ", "Manage") : tx("編集", "Edit")}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
