"use client";

import { ComponentType, SVGProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownCircleIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PlayIcon,
  StopIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { Room, RoomEvent, Track } from "livekit-client";
import { OpenCueMiniPanelButton, sendCue, type CueEvent } from "../../../components/cue/CueMiniPanel";
import { TopNav } from "../../../components/home/TopNav";
import { StudioProgress } from "../../../components/ui/StudioProgress";
import { isLikelyVirtualCamera, pickPreferredVideoDevice } from "../../../lib/cameraDevices";
import { useI18n } from "../../../lib/i18n";
import {
  getStreamSession,
  setStreamSessionStatus,
  subscribeStreamSessions,
  type StreamSession,
  updateStreamSession,
} from "../../../lib/streamSessions";
import { useUserSession } from "../../../lib/userSession";

type ParticipantItem = {
  id: string;
  name: string;
  status: "watching" | "speaking" | "requested";
  muted: boolean;
};

type ConnectionStatus = "idle" | "starting" | "live" | "failed";

type ChatItem = {
  id: string;
  user: string;
  text: string;
  mine?: boolean;
};

const INITIAL_CHAT: ChatItem[] = [];

const MAX_CHAT_MESSAGES = 200;

type CircleControlProps = {
  label?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  offIcon?: ComponentType<SVGProps<SVGSVGElement>>;
  slashedWhenOff?: boolean;
  on: boolean;
  onToggle: () => void;
};

function CircleControl({ icon: Icon, offIcon: OffIcon, slashedWhenOff, on, onToggle }: CircleControlProps) {
  const CurrentIcon = on ? Icon : (OffIcon ?? Icon);
  return (
    <button
      onClick={onToggle}
      className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
        on
          ? "bg-[var(--brand-primary)] text-white"
          : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"
      }`}
    >
      <span className="relative flex h-6 w-6 items-center justify-center">
        <CurrentIcon className="h-6 w-6" aria-hidden />
        {!on && slashedWhenOff && (
          <>
            <span className="pointer-events-none absolute h-7 w-[5px] -rotate-45 rounded-full bg-black" aria-hidden />
            <span className="pointer-events-none absolute h-7 w-[2px] -rotate-45 rounded-full bg-current" aria-hidden />
          </>
        )}
      </span>
    </button>
  );
}

export default function StudioLiveSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tx } = useI18n();
  const { isVtuber, hydrated: sessionHydrated } = useUserSession();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId ?? "";

  const [session, setSession] = useState<StreamSession | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<ChatItem[]>(INITIAL_CHAT);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [startWarnings, setStartWarnings] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectedViewers, setConnectedViewers] = useState(0);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState(() => searchParams.get("micDeviceId") ?? "");
  const [showMicMenu, setShowMicMenu] = useState(false);
  const [showCamMenu, setShowCamMenu] = useState(false);

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioContainerRef = useRef<HTMLDivElement | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const roomRef = useRef<Room | null>(null);
  const autoStartDoneRef = useRef(false);
  const seenChatIdsRef = useRef<Set<string>>(new Set(INITIAL_CHAT.map((m) => m.id)));

  const clearResolvedWarnings = useCallback((next: { micOn?: boolean; camOn?: boolean; hasVideoDevice?: boolean }) => {
    setStartWarnings((prev) =>
      prev.filter((warning) => {
        if ((warning.includes("マイク") || warning.includes("MIC")) && next.micOn) return false;
        if ((warning.includes("カメラ") || warning.includes("CAM")) && next.camOn) return false;
        if ((warning.includes("カメラソース") || warning.includes("camera source")) && next.hasVideoDevice) return false;
        return true;
      }),
    );
  }, []);

  useEffect(() => {
    if (!sessionHydrated) return;
    if (!isVtuber) router.replace("/");
  }, [sessionHydrated, isVtuber, router]);

  useEffect(() => {
    let cancelled = false;
    let everFound = false;

    const sync = async () => {
      if (!sessionId) {
        if (!cancelled) {
          setSession(null);
          setNotFound(true);
        }
        return;
      }

      const found = await getStreamSession(sessionId);
      if (cancelled) return;
      if (found) {
        everFound = true;
        setSession(found);
        setNotFound(false);
      } else if (!everFound) {
        setNotFound(true);
      }
      // once found, polling failures are treated as transient — keep showing last state
    };

    void sync();
    const unsubscribe = subscribeStreamSessions(sync);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [sessionId]);

  // Pre-live preview via getUserMedia (skipped while live)
  useEffect(() => {
    if (notFound || connectionStatus === "live" || connectionStatus === "starting") return;

    let cancelled = false;

    const setupPreview = async () => {
      try {
        streamRef.current?.getTracks().forEach((track) => track.stop());

        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true,
          audio: selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true,
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
        if (!cancelled) {
          const videos = devices.filter((device) => device.kind === "videoinput");
          const audios = devices.filter((device) => device.kind === "audioinput");
          setVideoDevices(videos);
          setAudioDevices(audios);
          if (!selectedVideoDeviceId && videos.length > 0) {
            const sessionPreferred = session?.preferredVideoDeviceId
              ? videos.find((device) => device.deviceId === session.preferredVideoDeviceId) ?? null
              : null;
            const preferred = sessionPreferred ?? pickPreferredVideoDevice(videos);
            if (preferred?.deviceId) setSelectedVideoDeviceId(preferred.deviceId);
          }
          if (!selectedAudioDeviceId && audios.length > 0) {
            setSelectedAudioDeviceId(audios[0].deviceId);
          }
          setMediaError(null);
        }
      } catch {
        if (!cancelled) {
          setMediaError(
            tx("カメラまたはマイクにアクセスできません。ブラウザ権限を確認してください。", "Camera/mic access denied. Check browser permissions."),
          );
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
  }, [notFound, selectedVideoDeviceId, selectedAudioDeviceId, session?.preferredVideoDeviceId, micOn, camOn, tx, connectionStatus]);

  const selectedVideoLabel = useMemo(() => {
    return (
      videoDevices.find((device) => device.deviceId === selectedVideoDeviceId)?.label ??
      session?.preferredVideoLabel ??
      tx("デフォルトカメラ", "Default camera")
    );
  }, [selectedVideoDeviceId, session?.preferredVideoLabel, tx, videoDevices]);

  const usingVirtualCamera = useMemo(() => isLikelyVirtualCamera(selectedVideoLabel), [selectedVideoLabel]);

  const selectedAudioLabel = useMemo(
    () => audioDevices.find((device) => device.deviceId === selectedAudioDeviceId)?.label ?? tx("デフォルトマイク", "Default microphone"),
    [audioDevices, selectedAudioDeviceId, tx],
  );

  useEffect(() => {
    if (!session || !selectedVideoDeviceId) return;
    if (
      session.preferredVideoDeviceId === selectedVideoDeviceId &&
      session.preferredVideoLabel === selectedVideoLabel
    )
      return;

    void updateStreamSession(session.sessionId, {
      preferredVideoDeviceId: selectedVideoDeviceId,
      preferredVideoLabel: selectedVideoLabel,
    });
  }, [selectedVideoDeviceId, selectedVideoLabel, session?.preferredVideoDeviceId, session?.preferredVideoLabel, session?.sessionId]);

  const metrics = useMemo(
    () => [
      { label: tx("スピーカー", "Speakers"), value: `${participants.length}` },
      { label: tx("接続数", "Connections"), value: `${connectedViewers}` },
      { label: tx("接続品質", "Connection"), value: connectionStatus === "live" ? "Good" : "-" },
      {
        label: tx("ステータス", "Status"),
        value: connectionStatus === "live" ? "LIVE" : connectionStatus === "starting" ? "..." : "-",
      },
    ],
    [connectionStatus, connectedViewers, participants, tx],
  );

  const sendChatText = useCallback((phrase: string) => {
    const text = phrase.trim();
    if (!text) return;
    const msg = { type: "chat", id: crypto.randomUUID(), user: "host", text };
    seenChatIdsRef.current.add(msg.id);
    setChat((prev) => [...prev, { id: msg.id, user: msg.user, text: msg.text, mine: true }].slice(-MAX_CHAT_MESSAGES));
    setChatInput("");
    if (roomRef.current && connectionStatus === "live") {
      void roomRef.current.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(msg)),
        { reliable: true },
      );
    }
  }, [connectionStatus]);

  const sendChat = useCallback(() => {
    sendChatText(chatInput);
  }, [chatInput, sendChatText]);

  const sendCueEvent = useCallback((cueEvent: CueEvent) => {
    sendCue(cueEvent);
    if (roomRef.current && connectionStatus === "live") {
      void roomRef.current.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "cue", ...cueEvent })),
        { reliable: true },
      );
    }
  }, [connectionStatus]);

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
  }, [chat]);

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

  const toggleParticipantMute = (id: string) => {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, muted: !p.muted } : p)));
  };

  const kickParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const cleanupConnection = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    if (remoteAudioContainerRef.current) {
      remoteAudioContainerRef.current.innerHTML = "";
    }
    setConnectedViewers(0);
    setConnectionStatus("idle");
    setParticipants([]);
  }, []);

  const handleMicToggle = () => {
    const next = !micOn;
    setMicOn(next);
    clearResolvedWarnings({ micOn: next });
    if (roomRef.current && connectionStatus === "live") {
      void roomRef.current.localParticipant.setMicrophoneEnabled(next);
    }
  };

  const handleCamToggle = () => {
    const next = !camOn;
    setCamOn(next);
    clearResolvedWarnings({ camOn: next });
    if (roomRef.current && connectionStatus === "live") {
      void roomRef.current.localParticipant.setCameraEnabled(next);
    }
  };

  const startBroadcast = async () => {
    if (!session) return;

    const warnings: string[] = [];
    if (camOn && !selectedVideoDeviceId) warnings.push(tx("カメラソースを選択してください。", "Choose a camera source."));
    setStartWarnings(warnings);
    if (warnings.length > 0) return;

    setStartWarnings([]);
    setConnectionStatus("starting");
    setMediaError(null);

    // Stop preview stream so LiveKit can acquire media
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;

    // Get LiveKit token
    let tokenData: { token: string; livekitUrl: string };
    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, role: "vtuber" }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Token error");
      }
      tokenData = (await res.json()) as { token: string; livekitUrl: string };
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : "Failed to get LiveKit token");
      setConnectionStatus("failed");
      return;
    }

    // Connect to LiveKit
    const room = new Room();
    roomRef.current = room;

    room.on(RoomEvent.Connected, () => {
      setConnectionStatus("live");
      void setStreamSessionStatus(session.sessionId, "live");
    });

    room.on(RoomEvent.Disconnected, () => {
      setConnectionStatus("idle");
      setConnectedViewers(0);
      setParticipants([]);
      roomRef.current = null;
    });

    room.on(RoomEvent.LocalTrackPublished, (pub) => {
      if (pub.source === Track.Source.Camera && previewRef.current && pub.track) {
        pub.track.attach(previewRef.current);
      }
    });

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      setParticipants((prev) => [
        ...prev.filter((p) => p.id !== participant.identity),
        {
          id: participant.identity,
          name: participant.name ?? participant.identity,
          status: "speaking",
          muted: false,
        },
      ]);
      setConnectedViewers((n) => n + 1);
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      setParticipants((prev) => prev.filter((p) => p.id !== participant.identity));
      setConnectedViewers((n) => Math.max(0, n - 1));
    });

    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind !== Track.Kind.Audio || !remoteAudioContainerRef.current) return;
      if (participant.identity === room.localParticipant.identity) return;

      const audioEl = track.attach() as HTMLAudioElement;
      audioEl.autoplay = true;
      audioEl.muted = false;
      audioEl.dataset.lkTrackSid = track.sid;
      remoteAudioContainerRef.current.appendChild(audioEl);

      void audioEl.play().catch(() => {
        setMediaError(tx("ブラウザの自動再生制限で音声が再生できません。", "Autoplay policy blocked remote audio."));
      });
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind !== Track.Kind.Audio || !remoteAudioContainerRef.current) return;
      const audioEl = remoteAudioContainerRef.current.querySelector(
        `audio[data-lk-track-sid="${track.sid}"]`,
      );
      audioEl?.remove();
      track.detach();
    });

    room.on(RoomEvent.MediaDevicesError, () => {
      setMediaError(tx("カメラまたはマイクにアクセスできません。", "Camera/mic access denied."));
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
        };
        const id = msg.id;
        const user = msg.user;
        const text = msg.text;
        if (msg.type === "chat" && id && user && text && !seenChatIdsRef.current.has(id)) {
          seenChatIdsRef.current.add(id);
          setChat((prev) => [
            ...prev,
            { id, user, text },
          ].slice(-MAX_CHAT_MESSAGES));
        }
      } catch {
        // no-op
      }
    });

    try {
      await room.connect(tokenData.livekitUrl, tokenData.token);
      await room.localParticipant.setCameraEnabled(camOn, {
        deviceId: selectedVideoDeviceId || undefined,
      });
      await room.localParticipant.setMicrophoneEnabled(micOn, {
        deviceId: selectedAudioDeviceId || undefined,
      });
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : "Failed to connect to LiveKit");
      setConnectionStatus("failed");
      room.disconnect();
      roomRef.current = null;
    }
  };

  const stopBroadcast = async () => {
    if (!session) return;
    cleanupConnection();
    const endedSession = await setStreamSessionStatus(session.sessionId, "ended");
    if (endedSession) {
      router.push(`/studio/live/${encodeURIComponent(session.sessionId)}/post`);
    }
  };

  useEffect(() => {
    return () => {
      cleanupConnection();
    };
  }, [cleanupConnection]);

  const shouldAutoStart = searchParams.get("autostart") === "1";

  useEffect(() => {
    if (!shouldAutoStart || autoStartDoneRef.current) return;
    if (notFound || !session) return;
    if (connectionStatus !== "idle") return;
    if (!streamRef.current) return;
    if (camOn && !selectedVideoDeviceId) return;

    autoStartDoneRef.current = true;
    const timer = window.setTimeout(() => {
      void startBroadcast();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [shouldAutoStart, notFound, session, connectionStatus, selectedVideoDeviceId, micOn, camOn]);

  if (!sessionHydrated || !isVtuber) return null;

  if (notFound || !session) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg-900)] pb-20 text-[var(--brand-text)] md:pb-0">
        <TopNav mode="studio" />
        <main className="mx-auto flex max-w-[900px] flex-col items-center gap-4 px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">{tx("枠が見つかりません", "Session not found")}</h1>
          <p className="text-sm text-[var(--brand-text-muted)]">{tx("配信枠を先に作成してください。", "Create a stream session first.")}</p>
          <Link href="/studio/pre-live" className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white">
            {tx("枠作成へ", "Go to Pre-live")}
          </Link>
        </main>
      </div>
    );
  }

  const isLive = connectionStatus === "live" || session.status === "live";

  return (
    <div className="h-screen overflow-hidden bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav mode="studio" />

      <main className="mx-auto grid h-[calc(100vh-72px)] max-w-[1440px] grid-cols-[1fr_320px] gap-4 overflow-hidden px-4 py-3 lg:grid-cols-[58px_1fr_360px] lg:px-6">
        <aside className="hidden lg:block">
          <StudioProgress current="live" orientation="vertical" />
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Live Studio</h1>
              <p className="line-clamp-1 text-xs text-[var(--brand-text-muted)]">{session.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isLive ? "bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]" : "bg-[var(--brand-surface)] text-[var(--brand-text-muted)]"}`}>
                {isLive ? tx("配信中", "Live now") : tx("待機中", "Standby")}
              </span>
              <button
                onClick={() => {
                  stopBroadcast();
                  router.push("/");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-sm font-semibold text-[var(--brand-text-muted)]"
              >
                <XMarkIcon className="h-4 w-4" aria-hidden />
                {tx("閉じる", "Close")}
              </button>
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
            <div className="mx-auto max-w-[640px] overflow-hidden rounded-xl bg-[var(--brand-bg-900)]" style={{ aspectRatio: "16/9" }}>
              <video ref={previewRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <div ref={remoteAudioContainerRef} className="hidden" aria-hidden />
            </div>
            {!camOn && <p className="mt-2 text-xs text-[var(--brand-text-muted)]">{tx("カメラOFF", "Camera OFF")}</p>}
            {mediaError && <p className="mt-2 text-xs text-[var(--brand-accent)]">{mediaError}</p>}

            <div className="mt-3 rounded-[24px] bg-[var(--brand-bg-900)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-[180px]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-text-muted)]">
                    {tx("配信コントロール", "Stream controls")}
                  </p>
                  <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                    {isLive
                      ? tx("このバーでマイクとカメラを即時制御できます。", "Use this bar to control mic and camera instantly.")
                      : tx("必要なデバイスだけONにして配信開始できます。", "Turn on only the devices you want to use before going live.")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <div className="relative inline-flex items-center rounded-full bg-[var(--brand-surface)]">
                    <CircleControl label="MIC" icon={MicrophoneIcon} slashedWhenOff on={micOn} onToggle={handleMicToggle} />
                    <button
                      type="button"
                      onClick={() => {
                        setShowMicMenu((v) => !v);
                        setShowCamMenu(false);
                      }}
                      className="flex h-12 w-8 items-center justify-center border-l border-black/20 bg-transparent text-[var(--brand-text-muted)]"
                    >
                      <ChevronDownIcon className="h-4 w-4" aria-hidden />
                    </button>
                    {showMicMenu && (
                      <div className="absolute left-0 top-16 z-20 min-w-[240px] rounded-xl bg-[var(--brand-surface)] p-2 shadow-xl shadow-black/35">
                        {audioDevices.map((device, index) => (
                          <button
                            key={device.deviceId}
                            type="button"
                            onClick={() => {
                              setSelectedAudioDeviceId(device.deviceId);
                              setShowMicMenu(false);
                              if (roomRef.current && micOn) {
                                void roomRef.current.localParticipant.setMicrophoneEnabled(true, { deviceId: device.deviceId });
                              }
                            }}
                            className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                              selectedAudioDeviceId === device.deviceId
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
                  <div className="relative inline-flex items-center rounded-full bg-[var(--brand-surface)]">
                    <CircleControl label="CAM" icon={VideoCameraIcon} offIcon={VideoCameraSlashIcon} on={camOn} onToggle={handleCamToggle} />
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
                      <div className="absolute left-0 top-16 z-20 min-w-[240px] rounded-xl bg-[var(--brand-surface)] p-2 shadow-xl shadow-black/35">
                        {videoDevices.map((device, index) => (
                          <button
                            key={device.deviceId}
                            type="button"
                            onClick={() => {
                              setSelectedVideoDeviceId(device.deviceId);
                              clearResolvedWarnings({ hasVideoDevice: true });
                              setShowCamMenu(false);
                              if (roomRef.current && camOn) {
                                void roomRef.current.localParticipant.setCameraEnabled(true, { deviceId: device.deviceId });
                              }
                            }}
                            className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                              selectedVideoDeviceId === device.deviceId
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
                </div>

                <button
                  onClick={
                    isLive
                      ? stopBroadcast
                      : () => {
                          void startBroadcast();
                        }
                  }
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-extrabold ${
                    isLive
                      ? "bg-[var(--brand-accent)] text-[var(--brand-text)] shadow-[0_10px_24px_rgba(255,59,92,0.25)]"
                      : "bg-[var(--brand-primary)] text-white shadow-[0_10px_24px_rgba(124,106,230,0.4)]"
                  }`}
                >
                  {isLive ? <StopIcon className="h-4 w-4" aria-hidden /> : <PlayIcon className="h-4 w-4" aria-hidden />}
                  {isLive ? tx("配信終了", "Stop Stream") : tx("配信開始", "Start Stream")}
                </button>
              </div>
            </div>
          </section>

          <section className="mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl bg-[var(--brand-surface)] p-3 shadow-lg shadow-black/25">
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-[var(--brand-text-muted)]">{tx("配信設定", "Stream Settings")}</h2>
            <div className="h-full space-y-3 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                {metrics.map((item) => (
                  <div key={item.label} className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2">
                    <p className="text-[10px] text-[var(--brand-text-muted)]">{item.label}</p>
                    <p className="text-sm font-bold text-[var(--brand-text)]">{item.value}</p>
                  </div>
                ))}
              </div>

              <label className="grid gap-1 text-sm">
                <span className="text-[var(--brand-text-muted)]">{tx("配信カメラ", "Camera Source")}</span>
                <select
                  value={selectedVideoDeviceId}
                  onChange={(event) => setSelectedVideoDeviceId(event.target.value)}
                  className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text)] outline-none"
                >
                  <option value="">{tx("デフォルトカメラ", "Default camera")}</option>
                  {videoDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-[var(--brand-text-muted)]">{tx("配信マイク", "Microphone Source")}</span>
                <select
                  value={selectedAudioDeviceId}
                  onChange={(event) => setSelectedAudioDeviceId(event.target.value)}
                  className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-[var(--brand-text)] outline-none"
                >
                  <option value="">{tx("デフォルトマイク", "Default microphone")}</option>
                  {audioDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${index + 1}`}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-[var(--brand-text-muted)]">{selectedAudioLabel}</span>
              </label>

              {!usingVirtualCamera && (
                <div className="rounded-lg bg-[var(--brand-accent)]/15 px-3 py-2 text-xs text-[var(--brand-accent)]">
                  {tx(
                    "仮想カメラ以外が選択されています。VTuber配信では仮想カメラの利用を推奨します。",
                    "A non-virtual camera is selected. Virtual camera is recommended.",
                  )}
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold text-[var(--brand-text-muted)]">{tx("スピーカー一覧", "Speakers")}</p>
                <div className="space-y-2">
                  {participants.length === 0 ? (
                    <p className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-3 text-sm text-[var(--brand-text-muted)]">
                      {connectionStatus === "live"
                        ? tx("スピーカーはいません", "No speakers yet")
                        : tx("配信を開始するとスピーカーが表示されます", "Start stream to see speakers")}
                    </p>
                  ) : (
                    participants.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg bg-[var(--brand-bg-900)] px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold">{p.name}</p>
                          <p className="text-xs text-[var(--brand-text-muted)]">
                            {p.status === "speaking" ? tx("会話中", "Speaking") : p.status === "requested" ? tx("申請中", "Requested") : tx("視聴中", "Watching")}
                            {" / "}
                            {p.muted ? tx("ミュート", "Muted") : tx("有効", "Unmuted")}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleParticipantMute(p.id)}
                            className="rounded-md bg-[var(--brand-primary)]/20 px-2 py-1 text-xs font-semibold text-[var(--brand-primary)]"
                          >
                            {p.muted ? tx("解除", "Unmute") : tx("ミュート", "Mute")}
                          </button>
                          <button
                            onClick={() => kickParticipant(p.id)}
                            className="rounded-md bg-[var(--brand-accent)]/20 px-2 py-1 text-xs font-semibold text-[var(--brand-accent)]"
                          >
                            {tx("キック", "Kick")}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden">
          <section className="flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl bg-[var(--brand-surface)] shadow-lg shadow-black/25">
            <div className="border-b border-black/20 px-3 py-2">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <ChatBubbleLeftRightIcon className="h-4 w-4" aria-hidden />
                {tx("配信者チャット", "Host Chat")}
              </p>
            </div>
            <div className="relative min-h-0 flex-1">
              <div ref={chatListRef} onScroll={handleChatScroll} className="h-full space-y-2 overflow-y-auto px-3 py-3">
                {chat.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg px-3 py-2 ${m.mine ? "ml-6 bg-[var(--brand-primary)]/20" : "mr-6 bg-[var(--brand-bg-900)]"}`}
                  >
                    <p className="mb-1 text-[11px] font-semibold text-[var(--brand-primary)]">{m.user}</p>
                    <p className="text-sm text-[var(--brand-text)]">{m.text}</p>
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
            <div className="border-t border-black/20 p-3">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return;
                    e.preventDefault();
                    sendChat();
                  }}
                  placeholder={tx("告知・案内を入力", "Type announcement")}
                  className="flex-1 rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm text-[var(--brand-text)] outline-none placeholder:text-[var(--brand-text-muted)]"
                />
                <button onClick={sendChat} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white">
                  <PaperAirplaneIcon className="h-4 w-4" aria-hidden />
                  {tx("送信", "Send")}
                </button>
              </div>
              <OpenCueMiniPanelButton sessionId={sessionId} onSendCue={sendCueEvent} className="mt-2" />
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
