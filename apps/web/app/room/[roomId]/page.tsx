"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useI18n } from "../../lib/i18n";
import { EVENTS } from "@repo/shared";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

type Role = "host" | "listener" | "speaker" | "unknown";
type RequestedRole = "host" | "listener" | "speaker";
type Status = "idle" | "connecting" | "connected" | "failed";

type JoinedRoomPayload = {
  role: Role;
};

type SessionDescriptionPayload = {
  sdp: RTCSessionDescriptionInit;
};

type IceCandidatePayload = {
  candidate: RTCIceCandidateInit;
};

type ChatMessage = {
  id: string;
  user: string;
  text: string;
  mine?: boolean;
};

type Participant = {
  id: string;
  name: string;
  avatar: string;
  status: "watching" | "requested" | "reserved";
};

const MOCK_PARTICIPANTS: Participant[] = [
  { id: "p1", name: "Reese", avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop", status: "watching" },
  { id: "p2", name: "Yan", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop", status: "requested" },
  { id: "p3", name: "Gela", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop", status: "reserved" },
  { id: "p4", name: "Ivie C", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop", status: "watching" },
  { id: "p5", name: "Marco", avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=200&h=200&fit=crop", status: "watching" },
];

const INITIAL_CHAT: ChatMessage[] = [
  { id: "c1", user: "mod_akira", text: "配信開始まであと少しです！音量チェックお願いします。" },
  { id: "c2", user: "Reese", text: "映像めっちゃ綺麗 👀" },
  { id: "c3", user: "Gela", text: "参加枠埋まるの早い！" },
  { id: "c4", user: "host_notice", text: "質問は #Q を先頭につけて送ってください。" },
];

function parseRequestedRole(value: string | null): RequestedRole {
  if (value === "host" || value === "speaker" || value === "listener") return value;
  return "listener";
}

export default function RoomPage() {
  const router = useRouter();
  const { tx } = useI18n();
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const roomId = params?.roomId ?? "";

  const requestedRole = useMemo<RequestedRole>(() => parseRequestedRole(searchParams.get("role")), [searchParams]);

  const [peerId] = useState<string>(() => generateId());
  const [status, setStatus] = useState<Status>("idle");
  const [assignedRole, setAssignedRole] = useState<Role>("unknown");
  const [copied, setCopied] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [chatInput, setChatInput] = useState("");

  const [micOn, setMicOn] = useState(requestedRole !== "listener" && searchParams.get("mic") !== "0");
  const [camOn, setCamOn] = useState(requestedRole === "host" && searchParams.get("cam") !== "0");
  const [speakerOn, setSpeakerOn] = useState(searchParams.get("speaker") !== "0");

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const roleRef = useRef<Role>("unknown");
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL;
  const iceServers = useMemo(() => ({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }), []);

  const canSendMic = assignedRole === "host" || assignedRole === "speaker";
  const canSendCam = assignedRole === "host";

  const cleanup = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }
    socketRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    roleRef.current = "unknown";
    setAssignedRole("unknown");
    setRemoteConnected(false);
    setStatus("idle");
  }, []);

  const applyMic = useCallback((enabled: boolean) => {
    if (!canSendMic) return;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setMicOn(enabled);
  }, [canSendMic]);

  const applyCam = useCallback((enabled: boolean) => {
    if (!canSendCam) return;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setCamOn(enabled);
  }, [canSendCam]);

  const applySpeaker = useCallback((enabled: boolean) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !enabled;
    }
    setSpeakerOn(enabled);
  }, []);

  const copyRoomLink = useCallback(async () => {
    if (!roomId) return;
    const url = `${location.origin}/room/${encodeURIComponent(roomId)}?role=listener&speaker=1`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [roomId]);

  const sendChat = useCallback(() => {
    const value = chatInput.trim();
    if (!value) return;
    setChatMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        user: "you",
        text: value,
        mine: true,
      },
    ]);
    setChatInput("");
  }, [chatInput]);

  useEffect(() => {
    if (!roomId || !signalingUrl) return;

    let mounted = true;

    const start = async () => {
      setStatus("connecting");

      const pc = new RTCPeerConnection(iceServers);
      pcRef.current = pc;

      let stream: MediaStream | null = null;

      if (requestedRole === "host") {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } else if (requestedRole === "speaker") {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }

      localStreamRef.current = stream;

      if (stream) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = micOn;
        });
        stream.getVideoTracks().forEach((track) => {
          track.enabled = camOn;
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        stream.getTracks().forEach((track) => pc.addTrack(track, stream as MediaStream));
      }

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.muted = !speakerOn;
          remoteVideoRef.current.play().catch(() => {
            if (!remoteVideoRef.current) return;
            // Fallback for autoplay restrictions on some devices/browsers.
            remoteVideoRef.current.muted = true;
            remoteVideoRef.current.play().catch(() => {
              // no-op
            });
            setSpeakerOn(false);
          });
        }
        setRemoteConnected(true);
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        socketRef.current?.emit(EVENTS.ICE_CANDIDATE, {
          roomId,
          from: peerId,
          candidate: event.candidate.toJSON(),
        });
      };

      pc.onconnectionstatechange = () => {
        if (!mounted) return;
        if (pc.connectionState === "connected") setStatus("connected");
        if (pc.connectionState === "connecting") setStatus("connecting");
        if (pc.connectionState === "failed") setStatus("failed");
        if (pc.connectionState === "disconnected") setStatus("idle");
      };

      const socket = io(signalingUrl, { transports: ["polling", "websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit(EVENTS.JOIN_ROOM, { roomId, peerId, requestedRole });
      });

      socket.on("joined-room", (payload: JoinedRoomPayload) => {
        roleRef.current = payload.role;
        setAssignedRole(payload.role);
      });

      socket.on("room-full", () => {
        if (!mounted) return;
        setStatus("failed");
      });

      socket.on(EVENTS.PEER_JOINED, async () => {
        if (roleRef.current !== "host") return;
        if (!pcRef.current || pcRef.current.signalingState !== "stable") return;

        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socket.emit(EVENTS.OFFER, { roomId, from: peerId, sdp: offer });
      });

      socket.on(EVENTS.OFFER, async (payload: SessionDescriptionPayload) => {
        if (!pcRef.current) return;
        if (pcRef.current.signalingState !== "stable") return;
        await pcRef.current.setRemoteDescription(payload.sdp);
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit(EVENTS.ANSWER, { roomId, from: peerId, sdp: answer });
      });

      socket.on(EVENTS.ANSWER, async (payload: SessionDescriptionPayload) => {
        if (!pcRef.current) return;
        if (pcRef.current.signalingState !== "have-local-offer") return;
        await pcRef.current.setRemoteDescription(payload.sdp);
      });

      socket.on(EVENTS.ICE_CANDIDATE, async (payload: IceCandidatePayload) => {
        try {
          if (!pcRef.current) return;
          await pcRef.current.addIceCandidate(payload.candidate);
        } catch {
          // ignore invalid ICE candidates
        }
      });

      socket.on(EVENTS.PEER_LEFT, () => {
        if (!mounted) return;
        setRemoteConnected(false);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      });
    };

    start().catch(() => {
      if (!mounted) return;
      setStatus("failed");
    });

    return () => {
      mounted = false;
      cleanup();
    };
  }, [cleanup, iceServers, peerId, requestedRole, roomId, signalingUrl]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !speakerOn;
    }
  }, [speakerOn]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <header className=" bg-[var(--brand-bg-900)]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-5 lg:px-12">
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--brand-primary)] text-xs font-bold text-white">A</div>
            <span className="text-lg font-medium tracking-wide text-[var(--brand-text)]">aiment</span>
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

      <main className="mx-auto w-full max-w-[1600px] px-4 py-4 lg:px-8">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
          <section className="min-w-0 space-y-4">
            <div className="overflow-hidden rounded-2xl bg-[var(--brand-bg-900)] shadow-xl">
              <div className="relative" style={{ aspectRatio: "16/9" }}>
                <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                {!remoteConnected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--brand-surface)] text-center">
                    <p className="text-sm font-semibold text-[var(--brand-text)]">配信者の映像を待機中</p>
                    <p className="text-xs text-[var(--brand-text-muted)]">{tx("接続されると自動でライブ映像に切り替わります", "Stream switches automatically when connected")}</p>
                  </div>
                )}

                <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold">LIVE</div>
                <div className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[11px]">視聴者 126</div>
                <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs">配信者メイン</div>
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--brand-bg-800)] p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-[var(--brand-text-muted)]">参加者</p>
                <p className="text-xs text-[var(--brand-text-muted)]">{MOCK_PARTICIPANTS.length + 1}人</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-xl bg-[var(--brand-surface)] p-2">
                  <div className="relative overflow-hidden rounded-lg bg-[var(--brand-bg-900)]" style={{ aspectRatio: "16/9" }}>
                    {assignedRole === "listener" ? (
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-[var(--brand-text-muted)]">NO CAM</div>
                    ) : (
                      <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                    )}
                    {assignedRole === "host" && !camOn && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--brand-text-muted)]">Cam OFF</div>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="truncate text-[11px]">あなた</p>
                    <span className={`text-[10px] ${micOn ? "text-[var(--brand-primary)]" : "text-[var(--brand-accent)]"}`}>
                      {canSendMic ? (micOn ? "MIC" : "MUTE") : "LISTEN"}
                    </span>
                  </div>
                </div>

                {MOCK_PARTICIPANTS.map((participant) => (
                  <div key={participant.id} className="rounded-xl bg-[var(--brand-surface)] p-2">
                    <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: "16/9" }}>
                      <img src={participant.avatar} alt={participant.name} className="h-full w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5 text-[10px] text-[var(--brand-text)]">
                        {participant.status === "requested" ? "参加申請中" : participant.status === "reserved" ? "予約済み" : "視聴中"}
                      </div>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-[var(--brand-text)]">{participant.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <section className="rounded-2xl bg-[var(--brand-bg-800)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => applyMic(!micOn)}
                  disabled={!canSendMic}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    canSendMic
                      ? micOn
                        ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]"
                        : "text-[var(--brand-text-muted)]"
                      : "cursor-not-allowed bg-[var(--brand-surface)] text-[var(--brand-text-muted)]/60"
                  }`}
                >
                  {micOn ? tx("MIC ON", "MIC ON") : tx("MIC OFF", "MIC OFF")}
                </button>
                <button
                  onClick={() => applyCam(!camOn)}
                  disabled={!canSendCam}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    canSendCam
                      ? camOn
                        ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]"
                        : "text-[var(--brand-text-muted)]"
                      : "cursor-not-allowed bg-[var(--brand-surface)] text-[var(--brand-text-muted)]/60"
                  }`}
                >
                  {camOn ? tx("CAM ON", "CAM ON") : tx("CAM OFF", "CAM OFF")}
                </button>
                <button
                  onClick={() => applySpeaker(!speakerOn)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    speakerOn ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "text-[var(--brand-text-muted)]"
                  }`}
                >
                  {speakerOn ? tx("SPK ON", "SPK ON") : tx("SPK OFF", "SPK OFF")}
                </button>
                <button onClick={copyRoomLink} className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--brand-text)] transition-colors ">
                  {copied ? tx("COPY OK", "COPY OK") : tx("LINK COPY", "LINK COPY")}
                </button>
                <button
                  onClick={() => {
                    cleanup();
                    router.push("/");
                  }}
                  className="ml-auto rounded-lg bg-[var(--brand-accent)]/15 px-3 py-2 text-xs font-medium text-[var(--brand-accent)] transition-colors hover:bg-[var(--brand-accent)]/25"
                >
                  {tx("退出", "Leave")}
                </button>
              </div>
            </section>
          </section>

          <aside className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl bg-[var(--brand-bg-800)]">
            <div className=" px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{tx("ライブチャット", "Live Chat")}</p>
                <span className="rounded-full bg-[var(--brand-surface)] px-2 py-0.5 text-[11px] text-[var(--brand-text-muted)]">{chatMessages.length}件</span>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {chatMessages.map((message) => (
                <div key={message.id} className={`rounded-lg px-3 py-2 ${message.mine ? "ml-6 bg-[var(--brand-surface-soft)]" : "mr-6 bg-[var(--brand-surface)]"}`}>
                  <p className="mb-1 text-[11px] font-semibold text-[var(--brand-primary)]">{message.user}</p>
                  <p className="text-sm leading-relaxed text-[var(--brand-text)]">{message.text}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className=" p-3">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      sendChat();
                    }
                  }}
                  placeholder={tx("チャットを入力", "Type a message")}
                  className="flex-1 rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm text-[var(--brand-text)] outline-none placeholder:text-[var(--brand-text-muted)] "
                />
                <button
                  onClick={sendChat}
                  className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-primary)]"
                >
                  {tx("送信", "Send")}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
