"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

// sharedがまだ赤いなら一旦これを使う（後で戻す）
const EVENTS = {
  JOIN_ROOM: "join-room",
  PEER_JOINED: "peer-joined",
  OFFER: "offer",
  ANSWER: "answer",
  ICE_CANDIDATE: "ice-candidate",
  PEER_LEFT: "peer-left",
} as const;

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = typeof params.roomId === "string" ? params.roomId : "test";

  const [peerId] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle");

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL!;
  const iceServers = useMemo(
    () => ({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function start() {
      setStatus("connecting");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(iceServers);
      pcRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (ev) => {
        const [remoteStream] = ev.streams;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      };

      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        socketRef.current?.emit(EVENTS.ICE_CANDIDATE, {
          roomId,
          from: peerId,
          candidate: ev.candidate.toJSON(),
        });
      };

      const socket = io(signalingUrl, { transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit(EVENTS.JOIN_ROOM, { roomId, peerId });
      });

      socket.on(EVENTS.PEER_JOINED, async () => {
        if (pc.signalingState !== "stable") return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit(EVENTS.OFFER, { roomId, from: peerId, sdp: offer });
      });

      socket.on(EVENTS.OFFER, async (payload: any) => {
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit(EVENTS.ANSWER, { roomId, from: peerId, sdp: answer });
      });

      socket.on(EVENTS.ANSWER, async (payload: any) => {
        await pc.setRemoteDescription(payload.sdp);
      });

      socket.on(EVENTS.ICE_CANDIDATE, async (payload: any) => {
        try {
          await pc.addIceCandidate(payload.candidate);
        } catch { }
      });

      pc.onconnectionstatechange = () => {
        if (!mounted) return;
        if (pc.connectionState === "connected") setStatus("connected");
      };
    }

    start().catch((e) => {
      console.error(e);
      setStatus("idle");
    });

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [iceServers, peerId, roomId, signalingUrl]);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1>Room: {roomId}</h1>
      <p>Status: {status}</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3>Local</h3>
          <video ref={localVideoRef} autoPlay playsInline muted style={{ width: 360, background: "#111" }} />
        </div>
        <div>
          <h3>Remote</h3>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 360, background: "#111" }} />
        </div>
      </div>
    </div>
  );
}
