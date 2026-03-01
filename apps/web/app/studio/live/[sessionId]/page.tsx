"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { TopNav } from "../../../components/home/TopNav";
import { isLikelyVirtualCamera, pickPreferredVideoDevice } from "../../../lib/cameraDevices";
import { getStreamSession, setStreamSessionStatus, subscribeStreamSessions, type StreamSession, updateStreamSession } from "../../../lib/streamSessions";

type QueueItem = {
  id: string;
  name: string;
  level: "beginner" | "intermediate";
  topic: string;
};

type ConnectionStatus = "idle" | "starting" | "live" | "failed";

const EVENTS = {
  JOIN_ROOM: "join-room",
  PEER_JOINED: "peer-joined",
  OFFER: "offer",
  ANSWER: "answer",
  ICE_CANDIDATE: "ice-candidate",
  PEER_LEFT: "peer-left",
} as const;

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

function createPeerId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function StudioLiveSessionPage() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId ?? "";

  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<StreamSession | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [shareOn, setShareOn] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState(INITIAL_CHAT);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectedViewers, setConnectedViewers] = useState(0);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const [participantLink, setParticipantLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const peerIdRef = useRef<string>("");

  const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL;
  const iceServers = useMemo(() => ({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }), []);

  useEffect(() => {
    setHydrated(true);
    peerIdRef.current = createPeerId();
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const sync = () => {
      if (!sessionId) {
        setSession(null);
        setNotFound(true);
        return;
      }

      const found = getStreamSession(sessionId);
      setSession(found);
      setNotFound(!found);
    };

    sync();
    return subscribeStreamSessions(sync);
  }, [hydrated, sessionId]);

  useEffect(() => {
    if (!hydrated || notFound) return;

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
            if (sender.track?.kind === "audio" && audioTrack) {
              sender.replaceTrack(audioTrack).catch(() => {
                // no-op
              });
            }
            if (sender.track?.kind === "video" && videoTrack) {
              sender.replaceTrack(videoTrack).catch(() => {
                // no-op
              });
            }
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
          setMediaError("カメラまたはマイクにアクセスできません。ブラウザ権限を確認してください。");
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
  }, [hydrated, notFound, selectedVideoDeviceId, session?.preferredVideoDeviceId]);

  useEffect(() => {
    if (!hydrated || !session) return;
    setParticipantLink(`${window.location.origin}/join/${encodeURIComponent(session.sessionId)}`);
  }, [hydrated, session]);

  const selectedVideoLabel = useMemo(() => {
    return videoDevices.find((device) => device.deviceId === selectedVideoDeviceId)?.label ?? session?.preferredVideoLabel ?? "デフォルトカメラ";
  }, [selectedVideoDeviceId, session?.preferredVideoLabel, videoDevices]);

  const usingVirtualCamera = useMemo(() => isLikelyVirtualCamera(selectedVideoLabel), [selectedVideoLabel]);

  useEffect(() => {
    if (!session) return;
    if (!selectedVideoDeviceId) return;
    if (session.preferredVideoDeviceId === selectedVideoDeviceId && session.preferredVideoLabel === selectedVideoLabel) return;

    updateStreamSession(session.sessionId, {
      preferredVideoDeviceId: selectedVideoDeviceId,
      preferredVideoLabel: selectedVideoLabel,
    });
  }, [selectedVideoDeviceId, selectedVideoLabel, session?.preferredVideoDeviceId, session?.preferredVideoLabel, session?.sessionId]);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = micOn;
    });
  }, [micOn]);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = camOn;
    });
  }, [camOn]);

  const metrics = useMemo(
    () => [
      { label: "視聴者", value: `${Math.max(connectedViewers, 0)}` },
      { label: "同時会話", value: `${queue.length}` },
      { label: "平均遅延", value: "2.1s" },
      { label: "接続品質", value: connectionStatus === "live" ? "Good" : "-" },
    ],
    [connectionStatus, connectedViewers, queue.length],
  );

  const approve = (id: string) => setQueue((prev) => prev.filter((q) => q.id !== id));
  const reject = (id: string) => setQueue((prev) => prev.filter((q) => q.id !== id));

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChat((prev) => [...prev, { id: `${Date.now()}`, user: "host", text }]);
    setChatInput("");
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
    if (!signalingUrl) {
      setConnectionStatus("failed");
      setMediaError("NEXT_PUBLIC_SIGNALING_URL が未設定です。");
      return;
    }

    if (!streamRef.current) {
      setConnectionStatus("failed");
      setMediaError("カメラ/マイクの準備ができていません。");
      return;
    }

    cleanupConnection();
    setConnectionStatus("starting");

    const pc = new RTCPeerConnection(iceServers);
    pcRef.current = pc;

    streamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, streamRef.current as MediaStream);
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
      setMediaError("現在の構成では同時接続は1名までです。複数視聴者にはSFU対応が必要です。");
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

    setStreamSessionStatus(session.sessionId, "live");
  };

  const stopBroadcast = () => {
    if (!session) return;
    cleanupConnection();
    setStreamSessionStatus(session.sessionId, "ended");
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

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg-900)] pb-20 text-[var(--brand-text)] md:pb-0">
        <TopNav />
        <main className="mx-auto flex max-w-[900px] flex-col items-center gap-4 px-4 py-16 text-center">
          <p className="text-sm text-[var(--brand-text-muted)]">読み込み中...</p>
        </main>
      </div>
    );
  }

  if (notFound || !session) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg-900)] pb-20 text-[var(--brand-text)] md:pb-0">
        <TopNav />
        <main className="mx-auto flex max-w-[900px] flex-col items-center gap-4 px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">枠が見つかりません</h1>
          <p className="text-sm text-[var(--brand-text-muted)]">配信枠を先に作成してください。</p>
          <Link href="/studio/pre-live" className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--brand-bg-900)]">
            枠作成へ
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] pb-20 text-[var(--brand-text)] md:pb-0">
      <TopNav />

      <main className="mx-auto max-w-[1500px] px-4 py-4 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Live Studio</h1>
            <p className="text-sm text-[var(--brand-text-muted)]">{session.title}</p>
            <p className="mt-1 text-xs text-[var(--brand-text-muted)]">Session ID: {session.sessionId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={connectionStatus === "live" || session.status === "live" ? stopBroadcast : startBroadcast}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                connectionStatus === "live" || session.status === "live"
                  ? "bg-[var(--brand-accent)] text-[var(--brand-text)]"
                  : "bg-[var(--brand-primary)] text-[var(--brand-bg-900)]"
              }`}
            >
              {connectionStatus === "live" || session.status === "live" ? "配信終了" : "配信開始"}
            </button>
            <button
              onClick={() => {
                stopBroadcast();
                router.push("/");
              }}
              className="rounded-lg bg-[var(--brand-surface)] px-4 py-2 text-sm font-semibold text-[var(--brand-text-muted)]"
            >
              閉じる
            </button>
          </div>
        </div>

        <div className="mb-2 flex items-center gap-2 text-xs text-[var(--brand-text-muted)]">
          <span
            className={`rounded-full px-2 py-1 ${
              connectionStatus === "live"
                ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]"
                : connectionStatus === "failed"
                  ? "bg-[var(--brand-accent)]/20 text-[var(--brand-accent)]"
                  : "bg-[var(--brand-surface)]"
            }`}
          >
            {connectionStatus === "live" ? "配信中" : connectionStatus === "starting" ? "開始中" : connectionStatus === "failed" ? "失敗" : "待機"}
          </span>
          <span>接続視聴者: {connectedViewers}</span>
        </div>

        <div className="mb-4 rounded-xl bg-[var(--brand-surface)] p-3">
          <p className="mb-2 text-xs font-semibold text-[var(--brand-text-muted)]">参加者用リンク</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={participantLink}
              className="flex-1 rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-xs text-[var(--brand-text)] outline-none"
            />
            <button
              onClick={copyParticipantLink}
              className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-[var(--brand-bg-900)]"
            >
              {linkCopied ? "コピー済み" : "リンクをコピー"}
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-[var(--brand-surface)] p-3">
          <p className="mb-2 text-xs font-semibold text-[var(--brand-text-muted)]">配信カメラ</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedVideoDeviceId}
              onChange={(event) => setSelectedVideoDeviceId(event.target.value)}
              className="w-full rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm text-[var(--brand-text)] outline-none sm:max-w-[420px]"
            >
              <option value="">デフォルトカメラ</option>
              {videoDevices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--brand-text-muted)]">仮想カメラをインストール済みならここで選択できます。</span>
          </div>
          {!usingVirtualCamera && (
            <div className="mt-2 rounded-lg bg-[var(--brand-accent)]/15 px-3 py-2 text-xs text-[var(--brand-accent)]">
              仮想カメラ以外が選択されています。VTuber配信では仮想カメラの利用を推奨します。
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
          <section className="space-y-4">
            <div className="rounded-2xl bg-[var(--brand-surface)] p-3 shadow-lg shadow-black/25">
              <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16/9" }}>
                <video ref={previewRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                {!camOn && <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm text-[var(--brand-text-muted)]">カメラOFF</div>}
              </div>
              {mediaError && <p className="mt-2 text-xs text-[var(--brand-accent)]">{mediaError}</p>}
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
                        <p className="text-xs text-[var(--brand-text-muted)]">
                          {item.topic} / {item.level === "beginner" ? "初級" : "中級"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approve(item.id)} className="rounded-md bg-[var(--brand-primary)] px-2 py-1 text-xs font-semibold text-[var(--brand-bg-900)]">
                          承認
                        </button>
                        <button onClick={() => reject(item.id)} className="rounded-md bg-[var(--brand-accent)]/20 px-2 py-1 text-xs font-semibold text-[var(--brand-accent)]">
                          却下
                        </button>
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
