"use client";

import { ComponentType, SVGProps, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ChatBubbleLeftRightIcon,
  LinkIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PlayIcon,
  StopIcon,
  VideoCameraIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { EVENTS } from "@repo/shared";
import { io, type Socket } from "socket.io-client";
import { TopNav } from "../../../components/home/TopNav";
import { StudioProgress } from "../../../components/ui/StudioProgress";
import { isLikelyVirtualCamera, pickPreferredVideoDevice } from "../../../lib/cameraDevices";
import { useI18n } from "../../../lib/i18n";
import { getStreamSession, setStreamSessionStatus, subscribeStreamSessions, type StreamSession, updateStreamSession } from "../../../lib/streamSessions";
import { useUserSession } from "../../../lib/userSession";

type ParticipantItem = {
  id: string;
  name: string;
  status: "watching" | "speaking" | "requested";
  muted: boolean;
};

type ConnectionStatus = "idle" | "starting" | "live" | "failed";

const INITIAL_PARTICIPANTS: ParticipantItem[] = [
  { id: "p1", name: "Kaito", status: "watching", muted: false },
  { id: "p2", name: "Ren", status: "requested", muted: false },
  { id: "p3", name: "Yuma", status: "speaking", muted: false },
];

const INITIAL_CHAT = [
  { id: "m1", user: "mod_nana", text: "参加希望は #join をつけて送ってください" },
  { id: "m2", user: "viewer_21", text: "#join 自己紹介いけます" },
  { id: "m3", user: "viewer_88", text: "音量ちょうどいいです！" },
];

function createPeerId() {
  return Math.random().toString(36).slice(2, 10);
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
  const [participants, setParticipants] = useState<ParticipantItem[]>(INITIAL_PARTICIPANTS);
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState(INITIAL_CHAT);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [startWarnings, setStartWarnings] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectedViewers, setConnectedViewers] = useState(0);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const peerIdRef = useRef<string>(createPeerId());
  const autoStartDoneRef = useRef(false);

  const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL;
  const iceServers = useMemo(() => ({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }), []);

  useEffect(() => {
    if (!sessionHydrated) return;
    if (!isVtuber) router.replace("/");
  }, [sessionHydrated, isVtuber, router]);

  useEffect(() => {
    let cancelled = false;

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
      setSession(found);
      setNotFound(!found);
    };

    void sync();
    const unsubscribe = subscribeStreamSessions(sync);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [sessionId]);

  useEffect(() => {
    if (notFound) return;

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

        if (pcRef.current) {
          const audioTrack = stream.getAudioTracks()[0];
          const videoTrack = stream.getVideoTracks()[0];
          for (const sender of pcRef.current.getSenders()) {
            if (sender.track?.kind === "audio" && audioTrack) sender.replaceTrack(audioTrack).catch(() => undefined);
            if (sender.track?.kind === "video" && videoTrack) sender.replaceTrack(videoTrack).catch(() => undefined);
          }
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
          setVideoDevices(videos);
          if (!selectedVideoDeviceId && videos.length > 0) {
            const sessionPreferred = session?.preferredVideoDeviceId
              ? videos.find((device) => device.deviceId === session.preferredVideoDeviceId) ?? null
              : null;
            const preferred = sessionPreferred ?? pickPreferredVideoDevice(videos);
            if (preferred?.deviceId) setSelectedVideoDeviceId(preferred.deviceId);
          }
          setMediaError(null);
        }
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
  }, [notFound, selectedVideoDeviceId, session?.preferredVideoDeviceId, micOn, camOn, tx]);

  const selectedVideoLabel = useMemo(() => {
    return videoDevices.find((device) => device.deviceId === selectedVideoDeviceId)?.label ?? session?.preferredVideoLabel ?? tx("デフォルトカメラ", "Default camera");
  }, [selectedVideoDeviceId, session?.preferredVideoLabel, tx, videoDevices]);

  const usingVirtualCamera = useMemo(() => isLikelyVirtualCamera(selectedVideoLabel), [selectedVideoLabel]);
  const participantLink = useMemo(() => {
    if (!session || typeof window === "undefined") return "";
    return `${window.location.origin}/join/${encodeURIComponent(session.sessionId)}`;
  }, [session]);

  useEffect(() => {
    if (!session || !selectedVideoDeviceId) return;
    if (session.preferredVideoDeviceId === selectedVideoDeviceId && session.preferredVideoLabel === selectedVideoLabel) return;

    void updateStreamSession(session.sessionId, {
      preferredVideoDeviceId: selectedVideoDeviceId,
      preferredVideoLabel: selectedVideoLabel,
    });
  }, [selectedVideoDeviceId, selectedVideoLabel, session?.preferredVideoDeviceId, session?.preferredVideoLabel, session?.sessionId]);

  const metrics = useMemo(
    () => [
      { label: tx("視聴者", "Viewers"), value: `${Math.max(connectedViewers, 0)}` },
      { label: tx("同時会話", "Active Talks"), value: `${participants.filter((p) => p.status === "speaking").length}` },
      { label: tx("平均遅延", "Avg Latency"), value: "2.1s" },
      { label: tx("接続品質", "Connection"), value: connectionStatus === "live" ? "Good" : "-" },
    ],
    [connectionStatus, connectedViewers, participants, tx],
  );

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChat((prev) => [...prev, { id: `${Date.now()}`, user: "host", text }]);
    setChatInput("");
  };

  const toggleParticipantMute = (id: string) => {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, muted: !p.muted } : p)));
  };

  const kickParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const cleanupConnection = () => {
    socketRef.current?.removeAllListeners();
    socketRef.current?.disconnect();
    socketRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    setConnectedViewers(0);
    setConnectionStatus("idle");
  };

  const startBroadcast = async () => {
    if (!session) return;

    const warnings: string[] = [];
    if (!micOn) warnings.push(tx("マイクをONにしてください。", "Turn MIC ON before starting."));
    if (!camOn) warnings.push(tx("カメラをONにしてください。", "Turn CAM ON before starting."));
    if (!selectedVideoDeviceId) warnings.push(tx("カメラソースを選択してください。", "Choose a camera source."));
    if (!streamRef.current) warnings.push(tx("カメラ/マイクの準備ができていません。", "Camera/mic is not ready."));
    setStartWarnings(warnings);
    if (warnings.length > 0) return;

    if (!signalingUrl) {
      setConnectionStatus("failed");
      setMediaError("NEXT_PUBLIC_SIGNALING_URL is not set.");
      return;
    }

    const localStream = streamRef.current;
    if (!localStream) return;

    setStartWarnings([]);
    cleanupConnection();
    setConnectionStatus("starting");

    const pc = new RTCPeerConnection(iceServers);
    pcRef.current = pc;

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
      if (!event.candidate || !session) return;
      socketRef.current?.emit(EVENTS.ICE_CANDIDATE, {
        roomId: session.sessionId,
        from: peerIdRef.current,
        candidate: event.candidate.toJSON(),
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnectionStatus("live");
      } else if (pc.connectionState === "failed") {
        setConnectionStatus("failed");
      }
    };

    const socket = io(signalingUrl, { transports: ["polling", "websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit(EVENTS.JOIN_ROOM, {
        roomId: session.sessionId,
        peerId: peerIdRef.current,
        requestedRole: "host",
      });
    });

    socket.on("room-full", () => {
      setConnectionStatus("failed");
      setMediaError(tx("現在の構成では同時接続は1名までです。", "Current signaling supports one viewer at a time."));
    });

    socket.on(EVENTS.PEER_JOINED, async () => {
      try {
        if (!pcRef.current || pcRef.current.signalingState !== "stable") return;
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socket.emit(EVENTS.OFFER, { roomId: session.sessionId, from: peerIdRef.current, sdp: offer });
        setConnectedViewers(1);
        setConnectionStatus("live");
      } catch {
        setConnectionStatus("failed");
      }
    });

    socket.on(EVENTS.ANSWER, async (payload: { sdp: RTCSessionDescriptionInit }) => {
      try {
        if (!pcRef.current) return;
        if (pcRef.current.signalingState !== "have-local-offer") return;
        await pcRef.current.setRemoteDescription(payload.sdp);
      } catch {
        setConnectionStatus("failed");
      }
    });

    socket.on(EVENTS.ICE_CANDIDATE, async (payload: { candidate: RTCIceCandidateInit }) => {
      try {
        if (!pcRef.current) return;
        await pcRef.current.addIceCandidate(payload.candidate);
      } catch {
        // ignore invalid candidate
      }
    });

    socket.on(EVENTS.PEER_LEFT, () => {
      setConnectedViewers(0);
    });

    void setStreamSessionStatus(session.sessionId, "live");
  };

  const stopBroadcast = () => {
    if (!session) return;
    cleanupConnection();
    void setStreamSessionStatus(session.sessionId, "ended");
  };

  const copyParticipantLink = async () => {
    if (!participantLink) return;
    await navigator.clipboard.writeText(participantLink);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1500);
  };

  useEffect(() => {
    return () => {
      cleanupConnection();
    };
  }, []);

  const shouldAutoStart = searchParams.get("autostart") === "1";

  useEffect(() => {
    if (!shouldAutoStart || autoStartDoneRef.current) return;
    if (notFound || !session) return;
    if (connectionStatus !== "idle") return;
    if (!streamRef.current || !selectedVideoDeviceId || !micOn || !camOn) return;

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
              <button
                onClick={isLive ? stopBroadcast : startBroadcast}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-extrabold ${
                  isLive
                    ? "bg-[var(--brand-accent)] text-[var(--brand-text)] shadow-[0_10px_24px_rgba(255,59,92,0.25)]"
                    : "bg-[var(--brand-primary)] text-white shadow-[0_10px_24px_rgba(124,106,230,0.4)]"
                }`}
              >
                {isLive ? <StopIcon className="h-4 w-4" aria-hidden /> : <PlayIcon className="h-4 w-4" aria-hidden />}
                {isLive ? tx("配信終了", "Stop Stream") : tx("配信開始", "Start Stream")}
              </button>
              <button
                onClick={() => { stopBroadcast(); router.push("/"); }}
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
            </div>
            {!camOn && <p className="mt-2 text-xs text-[var(--brand-text-muted)]">{tx("カメラOFF", "Camera OFF")}</p>}
            {mediaError && <p className="mt-2 text-xs text-[var(--brand-accent)]">{mediaError}</p>}

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <CircleControl label="MIC" icon={MicrophoneIcon} on={micOn} onToggle={() => setMicOn((v) => !v)} />
              <CircleControl label="CAM" icon={VideoCameraIcon} on={camOn} onToggle={() => setCamOn((v) => !v)} />
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

              <div>
                <p className="mb-2 text-xs font-semibold text-[var(--brand-text-muted)]">{tx("参加者一覧", "Participants")}</p>
                <div className="space-y-2">
                  {participants.length === 0 ? (
                    <p className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-3 text-sm text-[var(--brand-text-muted)]">{tx("参加者はいません", "No participants")}</p>
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
                          <button onClick={() => toggleParticipantMute(p.id)} className="rounded-md bg-[var(--brand-primary)]/20 px-2 py-1 text-xs font-semibold text-[var(--brand-primary)]">
                            {p.muted ? tx("解除", "Unmute") : tx("ミュート", "Mute")}
                          </button>
                          <button onClick={() => kickParticipant(p.id)} className="rounded-md bg-[var(--brand-accent)]/20 px-2 py-1 text-xs font-semibold text-[var(--brand-accent)]">
                            {tx("キック", "Kick")}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button onClick={copyParticipantLink} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white">
                <LinkIcon className="h-4 w-4" aria-hidden />
                {linkCopied ? tx("コピー済み", "Copied") : tx("参加リンクをコピー", "Copy Invite Link")}
              </button>
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
                <button onClick={sendChat} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white">
                  <PaperAirplaneIcon className="h-4 w-4" aria-hidden />
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
