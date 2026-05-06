"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownCircleIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  MicrophoneIcon,
  PhoneXMarkIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
} from "@heroicons/react/24/solid";
import { Room, RoomEvent, Track } from "livekit-client";
import type { CueCategory, CueEvent } from "../../components/cue/CueMiniPanel";
import { SmartPhraseAssist, type SmartPhraseSessionState } from "../../components/chat/SmartPhraseAssist";
import { useI18n } from "../../lib/i18n";

type Role = "host" | "listener" | "speaker" | "unknown";
type RequestedRole = "host" | "listener" | "speaker";
type Status = "idle" | "connecting" | "connected" | "failed";

type ChatMessage = {
  id: string;
  user: string;
  text: string;
  mine?: boolean;
  kind?: "chat" | "cue";
};

type CueMessage = Partial<CueEvent> & {
  type?: string;
};

const MAX_CHAT_MESSAGES = 200;

const INITIAL_CHAT: ChatMessage[] = [];

function parseRequestedRole(value: string | null): RequestedRole {
  if (value === "host" || value === "speaker" || value === "listener") return value;
  return "listener";
}

function isCueCategory(value: unknown): value is CueCategory {
  return value === "movement" || value === "flow" || value === "reaction" || value === "help";
}

function parseCueMessage(message: unknown): CueEvent | null {
  if (!message || typeof message !== "object") return null;
  const cueMessage = message as CueMessage;
  if (
    cueMessage.type !== "cue" ||
    typeof cueMessage.sessionId !== "string" ||
    typeof cueMessage.cueId !== "string" ||
    typeof cueMessage.english !== "string" ||
    typeof cueMessage.japanese !== "string" ||
    typeof cueMessage.icon !== "string" ||
    typeof cueMessage.createdAt !== "string" ||
    !isCueCategory(cueMessage.category)
  ) {
    return null;
  }

  return {
    sessionId: cueMessage.sessionId,
    cueId: cueMessage.cueId,
    english: cueMessage.english,
    japanese: cueMessage.japanese,
    icon: cueMessage.icon,
    category: cueMessage.category,
    createdAt: cueMessage.createdAt,
  };
}

export default function RoomPage() {
  const router = useRouter();
  const { tx } = useI18n();
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const roomId = params?.roomId ?? "";

  const requestedRole = useMemo<RequestedRole>(() => parseRequestedRole(searchParams.get("role")), [searchParams]);

  const [status, setStatus] = useState<Status>("idle");
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [assignedRole, setAssignedRole] = useState<Role>("unknown");
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [chatInput, setChatInput] = useState("");
  const [chatSendError, setChatSendError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVideoControls, setShowVideoControls] = useState(false);
  const [latestCue, setLatestCue] = useState<CueEvent | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const [micOn, setMicOn] = useState(requestedRole !== "listener" && searchParams.get("mic") !== "0");
  const [camOn, setCamOn] = useState(requestedRole === "host" && searchParams.get("cam") !== "0");
  const [selectedMicDeviceId, setSelectedMicDeviceId] = useState(searchParams.get("micDeviceId") ?? "");
  const [selectedCamDeviceId, setSelectedCamDeviceId] = useState(searchParams.get("camDeviceId") ?? "");
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [showMicMenu, setShowMicMenu] = useState(false);
  const [showCamMenu, setShowCamMenu] = useState(false);
  const [showDevicePanel, setShowDevicePanel] = useState(false);

  const videoShellRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioContainerRef = useRef<HTMLDivElement | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const roomRef = useRef<Room | null>(null);
  const seenChatIdsRef = useRef<Set<string>>(new Set(INITIAL_CHAT.map((m) => m.id)));
  const seenCueIdsRef = useRef<Set<string>>(new Set());
  const videoControlsTimerRef = useRef<number | null>(null);

  const canSendMic = assignedRole === "host" || assignedRole === "speaker";
  const canSendCam = assignedRole === "host";

  const cleanup = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    if (remoteAudioContainerRef.current) {
      remoteAudioContainerRef.current.innerHTML = "";
    }
    setAssignedRole("unknown");
    setRemoteConnected(false);
    setStatus("idle");
  }, []);

  const applyMic = useCallback(
    (enabled: boolean) => {
      if (!canSendMic) return;
      setMicOn(enabled);
      if (roomRef.current) {
        void roomRef.current.localParticipant.setMicrophoneEnabled(
          enabled,
          enabled && selectedMicDeviceId ? { deviceId: selectedMicDeviceId } : undefined,
        );
      }
    },
    [canSendMic, selectedMicDeviceId],
  );

  const applyCam = useCallback(
    (enabled: boolean) => {
      if (!canSendCam) return;
      setCamOn(enabled);
      if (roomRef.current) {
        void roomRef.current.localParticipant.setCameraEnabled(
          enabled,
          enabled && selectedCamDeviceId ? { deviceId: selectedCamDeviceId } : undefined,
        );
      }
    },
    [canSendCam, selectedCamDeviceId],
  );

  const sendChatText = useCallback((text: string) => {
    const value = text.trim();
    if (!value) return;
    const room = roomRef.current;
    if (!room || status !== "connected") {
      setChatSendError(tx("接続後に送信できます。", "You can send after the room is connected."));
      return;
    }
    setChatSendError(null);
    const displayName = room.localParticipant.name ?? "you";
    const msg = { type: "chat", id: crypto.randomUUID(), user: displayName, text: value };
    seenChatIdsRef.current.add(msg.id);
    setChatMessages((prev) => [...prev, { id: msg.id, user: msg.user, text: msg.text, mine: true }].slice(-MAX_CHAT_MESSAGES));
    setChatInput("");
    void room.localParticipant
      .publishData(
        new TextEncoder().encode(JSON.stringify(msg)),
        { reliable: true },
      )
      .catch((error: unknown) => {
        console.error("Failed to publish chat message", error);
        setChatSendError(tx("コメントの送信に失敗しました。接続状態を確認してください。", "Failed to send the message. Please check your connection."));
      });
  }, [status, tx]);

  const sendChat = useCallback(() => {
    sendChatText(chatInput);
  }, [chatInput, sendChatText]);

  const insertChatPhrase = useCallback((phrase: string) => {
    setChatInput((current) => (current.trim() ? `${current.trimEnd()} ${phrase}` : phrase));
    window.requestAnimationFrame(() => chatInputRef.current?.focus());
  }, []);

  const toggleFullscreen = useCallback(() => {
    const videoShell = videoShellRef.current;
    if (typeof document === "undefined" || !videoShell) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {
        // no-op
      });
      return;
    }

    void videoShell.requestFullscreen().catch(() => {
      // no-op
    });
  }, []);

  const revealVideoControls = useCallback(() => {
    setShowVideoControls(true);
    if (videoControlsTimerRef.current) {
      window.clearTimeout(videoControlsTimerRef.current);
    }
    videoControlsTimerRef.current = window.setTimeout(() => {
      setShowVideoControls(false);
      videoControlsTimerRef.current = null;
    }, 1400);
  }, []);

  const hideVideoControls = useCallback(() => {
    if (videoControlsTimerRef.current) {
      window.clearTimeout(videoControlsTimerRef.current);
      videoControlsTimerRef.current = null;
    }
    setShowVideoControls(false);
  }, []);

  const phraseSessionState = useMemo<SmartPhraseSessionState>(() => {
    if (status !== "connected") return "waiting";
    return "game";
  }, [status]);

  useEffect(() => {
    if (!latestCue) return;
    const timeout = window.setTimeout(() => setLatestCue(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [latestCue]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === videoShellRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    return () => {
      if (videoControlsTimerRef.current) {
        window.clearTimeout(videoControlsTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!roomId) return;

    let mounted = true;

    const start = async () => {
      setStatus("connecting");

      // Get LiveKit token
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: roomId,
          role: requestedRole === "host" ? "vtuber" : requestedRole,
        }),
      });

      if (!res.ok) {
        if (!mounted) return;
        try {
          const errData = (await res.json()) as { error?: string };
          setFailureReason(errData.error ?? `HTTP ${res.status}`);
        } catch {
          setFailureReason(`HTTP ${res.status}`);
        }
        setStatus("failed");
        return;
      }

      const { token, livekitUrl } = (await res.json()) as { token: string; livekitUrl: string };

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.Connected, () => {
        if (!mounted) return;
        setStatus("connected");
        setAssignedRole(requestedRole === "host" ? "host" : requestedRole);

        if (requestedRole !== "listener") {
          void room.localParticipant.setMicrophoneEnabled(
            micOn,
            micOn && selectedMicDeviceId ? { deviceId: selectedMicDeviceId } : undefined,
          );
        }
        // Publish camera for host only
        if (requestedRole === "host") {
          void room.localParticipant.setCameraEnabled(
            camOn,
            camOn && selectedCamDeviceId ? { deviceId: selectedCamDeviceId } : undefined,
          );
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        if (!mounted) return;
        setStatus("idle");
        setAssignedRole("unknown");
        setRemoteConnected(false);
      });

      room.on(RoomEvent.TrackSubscribed, (track, _pub, _participant) => {
        if (!mounted) return;
        if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.play().catch(() => {
            if (!remoteVideoRef.current) return;
            remoteVideoRef.current.muted = true;
            void remoteVideoRef.current.play().catch(() => {
              // no-op
            });
          });
          setRemoteConnected(true);
        }
        if (track.kind === Track.Kind.Audio && remoteAudioContainerRef.current) {
          const audioEl = track.attach() as HTMLAudioElement;
          audioEl.autoplay = true;
          audioEl.muted = false;
          audioEl.dataset.lkTrackSid = track.sid;
          remoteAudioContainerRef.current.appendChild(audioEl);
          void audioEl.play().catch(() => {
            if (!audioEl) return;
            audioEl.muted = true;
          });
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
        if (track.kind === Track.Kind.Video) {
          setRemoteConnected(false);
        }
        if (track.kind === Track.Kind.Audio && remoteAudioContainerRef.current) {
          const audioEl = remoteAudioContainerRef.current.querySelector(
            `audio[data-lk-track-sid="${track.sid}"]`,
          );
          audioEl?.remove();
        }
      });

      room.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          if (participant?.identity && participant.identity === room.localParticipant.identity) {
            return;
          }
          const msg = JSON.parse(new TextDecoder().decode(payload)) as {
            type?: string;
            id?: string;
            user?: string;
            text?: string;
            sessionId?: string;
            cueId?: string;
            english?: string;
            japanese?: string;
            icon?: string;
            category?: CueCategory;
            createdAt?: string;
          };
          const id = msg.id;
          const user = msg.user;
          const text = msg.text;
          if (msg.type === "chat" && id && user && text && !seenChatIdsRef.current.has(id)) {
            seenChatIdsRef.current.add(id);
            setChatMessages((prev) => [
              ...prev,
              { id, user, text },
            ].slice(-MAX_CHAT_MESSAGES));
          }
          const cue = parseCueMessage(msg);
          if (cue) {
            const cueKey = `${cue.sessionId}:${cue.cueId}:${cue.createdAt}`;
            if (!seenCueIdsRef.current.has(cueKey)) {
              seenCueIdsRef.current.add(cueKey);
              setLatestCue(cue);
              setChatMessages((prev) => [
                ...prev,
                {
                  id: `cue-${cueKey}`,
                  user: "Live cue",
                  text: `${cue.icon} ${cue.english} / ${cue.japanese}`,
                  kind: "cue" as const,
                },
              ].slice(-MAX_CHAT_MESSAGES));
            }
          }
        } catch {
          // no-op
        }
      });

      try {
        await room.connect(livekitUrl, token);
      } catch (err) {
        if (!mounted) return;
        setFailureReason(err instanceof Error ? err.message : "LiveKit connection failed");
        setStatus("failed");
        room.disconnect();
        roomRef.current = null;
      }
    };

    start().catch((err: unknown) => {
      if (!mounted) return;
      setFailureReason(err instanceof Error ? err.message : "Unknown error");
      setStatus("failed");
    });

    return () => {
      mounted = false;
      cleanup();
    };
  }, [cleanup, requestedRole, roomId, selectedMicDeviceId, selectedCamDeviceId]);

  useEffect(() => {
    let mounted = true;
    const refreshDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!mounted) return;
        const audios = devices.filter((d) => d.kind === "audioinput");
        const videos = devices.filter((d) => d.kind === "videoinput");
        setAudioDevices(audios);
        setVideoDevices(videos);
        if (!selectedMicDeviceId && audios.length > 0) setSelectedMicDeviceId(audios[0].deviceId);
        if (!selectedCamDeviceId && videos.length > 0) setSelectedCamDeviceId(videos[0].deviceId);
      } catch {
        // no-op
      }
    };

    void refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => {
      mounted = false;
      navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
    };
  }, [selectedMicDeviceId, selectedCamDeviceId]);

  useEffect(() => {
    const el = chatListRef.current;
    if (!el) return;
    if (!shouldAutoScrollRef.current) {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollToBottom(distanceFromBottom >= 24);
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      const target = chatListRef.current;
      if (!target) return;
      target.scrollTo({ top: target.scrollHeight, behavior: "auto" });
      setShowScrollToBottom(false);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [chatMessages]);

  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = chatListRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    shouldAutoScrollRef.current = true;
    setShowScrollToBottom(false);
  }, []);

  const handleChatScroll = useCallback(() => {
    const el = chatListRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 24;
    shouldAutoScrollRef.current = atBottom;
    setShowScrollToBottom(!atBottom);
  }, []);

  const statusLabel =
    status === "connected"
      ? tx("接続済み", "Connected")
      : status === "connecting"
        ? tx("接続中", "Connecting")
        : status === "failed"
          ? tx("接続失敗", "Failed")
          : tx("待機中", "Idle");

  if (!roomId) {
    return <div className="p-8">{tx("Room IDを読み込んでいます...", "Loading room ID...")}</div>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <header className="shrink-0 bg-[var(--brand-bg-900)]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-3 lg:px-12">
          <button onClick={() => router.push("/")} className="flex items-center">
            <Image src="/logo/aiment_logotype.svg" alt="aiment" width={120} height={40} className="h-8 w-auto object-contain" />
          </button>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--brand-surface)] px-3 py-1 text-xs font-medium text-[var(--brand-text-muted)]">Room: {roomId}</span>
            <span className="rounded-full bg-[var(--brand-surface)] px-3 py-1 text-xs font-medium text-[var(--brand-text-muted)]">Role: {assignedRole}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                status === "connected"
                  ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]"
                  : "bg-[var(--brand-accent)]/20 text-[var(--brand-accent)]"
              }`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto min-h-0 w-full max-w-[1600px] flex-1 overflow-hidden px-4 pt-4 lg:px-8 ${
          requestedRole === "listener" ? "pb-4" : "pb-28"
        }`}
      >
        <div className={`grid h-full grid-cols-1 gap-4 ${chatOpen ? "xl:grid-cols-[1fr_360px]" : "xl:grid-cols-[1fr_64px]"}`}>
          <section className="min-h-0 min-w-0 space-y-4 overflow-y-auto pr-1">
            <div ref={videoShellRef} className="overflow-hidden rounded-2xl bg-black shadow-xl">
              <div
                onMouseMove={revealVideoControls}
                onMouseLeave={hideVideoControls}
                className={`relative bg-black ${isFullscreen ? "h-screen" : ""}`}
                style={isFullscreen ? undefined : { aspectRatio: "16/9" }}
              >
                <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                <div ref={remoteAudioContainerRef} className="hidden" aria-hidden />
                {status === "failed" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--brand-surface)] px-6 text-center">
                    <p className="text-sm font-semibold text-[var(--brand-accent)]">{tx("接続に失敗しました", "Connection failed")}</p>
                    {failureReason && (
                      <p className="rounded-xl bg-[var(--brand-accent)]/15 px-4 py-2 text-xs text-[var(--brand-accent)]">{failureReason}</p>
                    )}
                    <button
                      onClick={() => router.back()}
                      className="mt-1 rounded-xl bg-[var(--brand-primary)] px-5 py-2 text-sm font-bold text-white"
                    >
                      {tx("戻る", "Back")}
                    </button>
                  </div>
                )}
                {status !== "failed" && !remoteConnected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--brand-surface)] text-center">
                    <p className="text-sm font-semibold text-[var(--brand-text)]">{tx("配信者の映像を待機中", "Waiting for host stream")}</p>
                    <p className="text-xs text-[var(--brand-text-muted)]">
                      {tx("接続されると自動でライブ映像に切り替わります", "Stream switches automatically when connected")}
                    </p>
                  </div>
                )}

                <div className="absolute right-3 top-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? tx("フルスクリーンを終了", "Exit fullscreen") : tx("フルスクリーン", "Fullscreen")}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white shadow-lg backdrop-blur transition-all hover:bg-black/35 focus-visible:opacity-100 ${
                      showVideoControls ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {isFullscreen ? (
                      <ArrowsPointingInIcon className="h-5 w-5" aria-hidden />
                    ) : (
                      <ArrowsPointingOutIcon className="h-5 w-5" aria-hidden />
                    )}
                  </button>
                </div>

              </div>
            </div>

          </section>

          <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-[var(--brand-bg-800)]">
            {chatOpen ? (
              <>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{tx("ライブチャット", "Live Chat")}</p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[var(--brand-surface)] px-2 py-0.5 text-[11px] text-[var(--brand-text-muted)]">{chatMessages.length}件</span>
                  <button
                    type="button"
                    onClick={() => setChatOpen(false)}
                    aria-label={tx("コメントを閉じる", "Close comments")}
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-[var(--brand-surface)] px-3 text-[11px] font-bold text-[var(--brand-text-muted)] transition-colors hover:text-[var(--brand-text)]"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4" aria-hidden />
                    <span>{tx("OFF", "Off")}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              <div ref={chatListRef} onScroll={handleChatScroll} className="h-full space-y-3 overflow-y-auto px-3 py-3">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-lg px-3 py-2 ${
                      message.kind === "cue"
                        ? "bg-[var(--brand-bg-900)] ring-1 ring-[var(--brand-secondary)]/35"
                        : message.mine
                          ? "ml-6 bg-[var(--brand-primary)]/20"
                          : "mr-6 bg-[var(--brand-surface)]"
                    }`}
                  >
                    <p className={`mb-1 text-[11px] font-semibold ${message.kind === "cue" ? "text-[var(--brand-secondary)]" : "text-[var(--brand-primary)]"}`}>
                      {message.user}
                    </p>
                    <p className={`text-sm leading-relaxed ${message.kind === "cue" ? "font-bold text-[var(--brand-secondary)]" : "text-[var(--brand-text)]"}`}>
                      {message.text}
                    </p>
                  </div>
                ))}
              </div>
              {showScrollToBottom && (
                <button
                  type="button"
                  onClick={() => scrollChatToBottom("smooth")}
                  aria-label={tx("最新コメントへ移動", "Jump to latest comments")}
                  className="absolute bottom-3 right-3 z-10 rounded-full bg-[var(--brand-primary)] px-3 py-2 text-sm font-bold text-white shadow-lg shadow-black/25"
                >
                  <ArrowDownCircleIcon className="h-5 w-5" aria-hidden />
                </button>
              )}
            </div>

            <div className="p-3">
              {latestCue ? (
                <div className="mb-2 rounded-xl bg-[var(--brand-surface)] px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--brand-text-muted)]">Live cue</span>
                    <span className="text-[10px] font-bold text-[var(--brand-text-muted)]">{latestCue.category}</span>
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-[var(--brand-secondary)]">
                    <span aria-hidden>{latestCue.icon}</span> {latestCue.english}
                    <span className="ml-2 text-xs text-[var(--brand-text)]">{latestCue.japanese}</span>
                  </p>
                </div>
              ) : null}
              <div className="flex gap-2">
                <input
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
                    event.preventDefault();
                    sendChat();
                  }}
                  disabled={status !== "connected"}
                  placeholder={status === "connected" ? tx("チャットを入力", "Type a message") : tx("接続後に送信できます", "Connect to send")}
                  className="flex-1 rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm text-[var(--brand-text)] outline-none placeholder:text-[var(--brand-text-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  onClick={sendChat}
                  disabled={status !== "connected"}
                  className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-primary)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {tx("送信", "Send")}
                </button>
              </div>
              {chatSendError ? (
                <p className="mt-2 rounded-lg bg-[var(--brand-accent)]/15 px-3 py-2 text-xs font-semibold text-[var(--brand-accent)]">
                  {chatSendError}
                </p>
              ) : null}
              <SmartPhraseAssist
                sessionState={phraseSessionState}
                onSendPhrase={sendChatText}
                onInsertPhrase={insertChatPhrase}
                className="mt-2"
              />
            </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                aria-label={tx("コメントを開く", "Open comments")}
                className="flex h-full min-h-[64px] w-full flex-col items-center justify-center gap-2 text-[var(--brand-text-muted)] transition-colors hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text)]"
              >
                <ChatBubbleLeftRightIcon className="h-6 w-6" aria-hidden />
                <span className="text-[11px] font-bold [writing-mode:vertical-rl]">{tx("コメント", "Chat")}</span>
              </button>
            )}
          </aside>
        </div>
      </main>

      {requestedRole !== "listener" && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-30 w-[calc(100%-24px)] max-w-[720px] -translate-x-1/2">
          <div className="pointer-events-auto rounded-[28px] bg-[var(--brand-bg-800)]/95 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.38)] backdrop-blur">
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <div className="relative inline-flex items-center rounded-full bg-[var(--brand-bg-900)]">
                <button
                  onClick={() => applyMic(!micOn)}
                  disabled={!canSendMic}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                    canSendMic
                      ? micOn
                        ? "bg-[var(--brand-primary)] text-white"
                        : "bg-transparent text-[var(--brand-text-muted)]"
                      : "cursor-not-allowed bg-[var(--brand-surface)] text-[var(--brand-text-muted)]/60"
                  }`}
                >
                  {micOn ? (
                    <MicrophoneIcon className="h-5 w-5" aria-hidden />
                  ) : (
                    <span className="relative flex h-5 w-5 items-center justify-center">
                      <MicrophoneIcon className="h-5 w-5" aria-hidden />
                      <span className="pointer-events-none absolute h-6 w-[5px] -rotate-45 rounded-full bg-black" aria-hidden />
                      <span className="pointer-events-none absolute h-6 w-[2px] -rotate-45 rounded-full bg-current" aria-hidden />
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={!canSendMic}
                  onClick={() => {
                    setShowMicMenu((v) => !v);
                    setShowCamMenu(false);
                  }}
                  className="flex h-12 w-8 items-center justify-center border-l border-black/20 bg-transparent text-[var(--brand-text-muted)]"
                >
                  <ChevronDownIcon className="h-4 w-4" aria-hidden />
                </button>
                {showMicMenu && canSendMic && (
                  <div className="absolute bottom-14 left-0 z-20 min-w-[220px] rounded-xl bg-[var(--brand-surface)] p-2 shadow-xl shadow-black/35">
                    {audioDevices.map((device, index) => (
                      <button
                        key={device.deviceId}
                        type="button"
                        onClick={() => {
                          setSelectedMicDeviceId(device.deviceId);
                          setShowMicMenu(false);
                          if (roomRef.current && micOn) {
                            void roomRef.current.localParticipant.setMicrophoneEnabled(true, { deviceId: device.deviceId });
                          }
                        }}
                        className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                          selectedMicDeviceId === device.deviceId
                            ? "bg-[var(--brand-primary)] text-white font-bold"
                            : "text-[var(--brand-text)] hover:bg-[var(--brand-bg-900)]"
                        }`}
                      >
                        {device.label || `Microphone ${index + 1}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            {canSendCam && (
              <div className="relative inline-flex items-center rounded-full bg-[var(--brand-bg-900)]">
                <button
                  onClick={() => applyCam(!camOn)}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                    camOn ? "bg-[var(--brand-primary)] text-white" : "bg-transparent text-[var(--brand-text-muted)]"
                  }`}
                >
                  {camOn ? <VideoCameraIcon className="h-5 w-5" aria-hidden /> : <VideoCameraSlashIcon className="h-5 w-5" aria-hidden />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCamMenu((v) => !v);
                    setShowMicMenu(false);
                  }}
                  className="flex h-12 w-8 items-center justify-center border-l border-black/20 bg-transparent text-[var(--brand-text-muted)]"
                >
                  <ChevronDownIcon className="h-4 w-4" aria-hidden />
                </button>
                {showCamMenu && (
                  <div className="absolute bottom-14 left-0 z-20 min-w-[220px] rounded-xl bg-[var(--brand-surface)] p-2 shadow-xl shadow-black/35">
                    {videoDevices.map((device, index) => (
                      <button
                        key={device.deviceId}
                        type="button"
                        onClick={() => {
                          setSelectedCamDeviceId(device.deviceId);
                          setShowCamMenu(false);
                          if (roomRef.current && camOn) {
                            void roomRef.current.localParticipant.setCameraEnabled(true, { deviceId: device.deviceId });
                          }
                        }}
                        className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                          selectedCamDeviceId === device.deviceId
                            ? "bg-[var(--brand-primary)] text-white font-bold"
                            : "text-[var(--brand-text)] hover:bg-[var(--brand-bg-900)]"
                        }`}
                      >
                        {device.label || `Camera ${index + 1}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="inline-flex items-center rounded-full bg-[var(--brand-bg-900)]">
              <button
                onClick={() => {
                  setShowDevicePanel((v) => !v);
                  setShowMicMenu(false);
                  setShowCamMenu(false);
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full text-[var(--brand-text-muted)] transition-colors hover:text-[var(--brand-text)]"
              >
                <Cog6ToothIcon className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <button
              onClick={() => {
                cleanup();
                router.push("/");
              }}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--brand-accent)] px-4 text-sm font-semibold text-white"
            >
              <PhoneXMarkIcon className="h-5 w-5" aria-hidden />
              {tx("退出", "Leave")}
            </button>
          </div>

          {showDevicePanel && (
            <div className="mt-3 rounded-2xl bg-[var(--brand-surface)] p-3 text-sm text-[var(--brand-text)] shadow-lg shadow-black/25">
              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded-xl bg-[var(--brand-bg-900)] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--brand-text-muted)]">{tx("役割", "Role")}</p>
                  <p className="mt-1 font-semibold">{assignedRole}</p>
                </div>
                <div className="rounded-xl bg-[var(--brand-bg-900)] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--brand-text-muted)]">{tx("マイク", "Microphone")}</p>
                  <p className="mt-1 line-clamp-1 font-semibold">
                    {audioDevices.find((device) => device.deviceId === selectedMicDeviceId)?.label ?? tx("デフォルト", "Default")}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--brand-bg-900)] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--brand-text-muted)]">{tx("カメラ", "Camera")}</p>
                  <p className="mt-1 line-clamp-1 font-semibold">
                    {videoDevices.find((device) => device.deviceId === selectedCamDeviceId)?.label ?? tx("未使用", "Unused")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
