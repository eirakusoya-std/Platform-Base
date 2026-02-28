"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const EVENTS = {
  JOIN_ROOM: "join-room",
  PEER_JOINED: "peer-joined",
  OFFER: "offer",
  ANSWER: "answer",
  ICE_CANDIDATE: "ice-candidate",
  PEER_LEFT: "peer-left",
} as const;

type Role = "host" | "guest" | "unknown";
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

export default function RoomPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const roomId = params?.roomId ?? "";

  const [peerId] = useState<string>(() => generateId());
  const [status, setStatus] = useState<Status>("idle");
  const [copied, setCopied] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);

  const [micOn, setMicOn] = useState(searchParams.get("mic") !== "0");
  const [camOn, setCamOn] = useState(searchParams.get("cam") !== "0");
  const [speakerOn, setSpeakerOn] = useState(searchParams.get("speaker") !== "0");

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const roleRef = useRef<Role>("unknown");
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL;
  const iceServers = useMemo(
    () => ({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }),
    [],
  );

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
    setRemoteConnected(false);
    setStatus("idle");
  }, []);

  const applyMic = useCallback((enabled: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setMicOn(enabled);
  }, []);

  const applyCam = useCallback((enabled: boolean) => {
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setCamOn(enabled);
  }, []);

  const applySpeaker = useCallback((enabled: boolean) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !enabled;
    }
    setSpeakerOn(enabled);
  }, []);

  const copyRoomLink = useCallback(async () => {
    if (!roomId) return;
    const url = `${location.origin}/room/${encodeURIComponent(roomId)}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !signalingUrl) return;
    if (!navigator.mediaDevices?.getUserMedia) return;

    let mounted = true;

    const start = async () => {
      setStatus("connecting");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;

      stream.getAudioTracks().forEach((track) => {
        track.enabled = micOn;
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = camOn;
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(iceServers);
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.muted = !speakerOn;
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
        socket.emit(EVENTS.JOIN_ROOM, { roomId, peerId });
      });

      socket.on("joined-room", (payload: JoinedRoomPayload) => {
        roleRef.current = payload.role;
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
        await pcRef.current.setRemoteDescription(payload.sdp);
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit(EVENTS.ANSWER, { roomId, from: peerId, sdp: answer });
      });

      socket.on(EVENTS.ANSWER, async (payload: SessionDescriptionPayload) => {
        if (!pcRef.current) return;
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
  }, [camOn, cleanup, iceServers, micOn, peerId, roomId, signalingUrl, speakerOn]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !speakerOn;
    }
  }, [speakerOn]);

  const statusLabel =
    status === "connected"
      ? "接続済み"
      : status === "connecting"
        ? "接続中"
        : status === "failed"
          ? "接続失敗"
          : "待機中";

  if (!roomId) {
    return <div className="p-8">Room IDを読み込んでいます...</div>;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-5 lg:px-12">
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#1e3a5f] text-xs font-bold text-white">A</div>
            <span className="text-lg font-medium tracking-wide">aiment</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">Room: {roomId}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                status === "connected"
                  ? "bg-emerald-50 text-emerald-700"
                  : status === "failed"
                    ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-8 py-8 lg:px-12">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold tracking-wide text-gray-500">あなたの映像</p>
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50" style={{ aspectRatio: "16/9" }}>
              <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              {!camOn && <div className="absolute inset-0 flex items-center justify-center bg-gray-900/75 text-sm font-medium text-white">カメラ OFF</div>}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold tracking-wide text-gray-500">配信者映像</p>
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50" style={{ aspectRatio: "16/9" }}>
              <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
              {!remoteConnected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-50 text-center">
                  <p className="text-sm font-semibold text-[#1e3a5f]">配信者の接続を待っています</p>
                  <p className="text-xs text-gray-500">接続されると自動で映像が表示されます</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => applyMic(!micOn)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                micOn ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" : "border-gray-300 text-gray-700 hover:border-gray-400"
              }`}
            >
              {micOn ? "🎤 マイク ON" : "🎤 マイク OFF"}
            </button>
            <button
              onClick={() => applyCam(!camOn)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                camOn ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" : "border-gray-300 text-gray-700 hover:border-gray-400"
              }`}
            >
              {camOn ? "📷 カメラ ON" : "📷 カメラ OFF"}
            </button>
            <button
              onClick={() => applySpeaker(!speakerOn)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                speakerOn ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" : "border-gray-300 text-gray-700 hover:border-gray-400"
              }`}
            >
              {speakerOn ? "🔊 スピーカー ON" : "🔊 スピーカー OFF"}
            </button>
            <button
              onClick={copyRoomLink}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400"
            >
              {copied ? "✅ リンクをコピーしました" : "🔗 招待リンクをコピー"}
            </button>
            <button
              onClick={() => {
                cleanup();
                router.push("/");
              }}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              ⛔ 退出
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
