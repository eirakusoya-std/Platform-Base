"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

const EVENTS = {
  JOIN_ROOM: "join-room",
  PEER_JOINED: "peer-joined",
  OFFER: "offer",
  ANSWER: "answer",
  ICE_CANDIDATE: "ice-candidate",
  PEER_LEFT: "peer-left",
} as const;

type Status = "idle" | "connecting" | "connected" | "failed";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = typeof params?.roomId === "string" ? params.roomId : "test";

  // hydration対策：peerIdはクライアントで生成
  const [peerId, setPeerId] = useState<string | null>(null);
  useEffect(() => {
    setPeerId(crypto.randomUUID());
  }, []);

  const [status, setStatus] = useState<Status>("idle");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);

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

  function applyMic(on: boolean) {
    const stream = localStreamRef.current;
    if (stream) stream.getAudioTracks().forEach((t) => (t.enabled = on));
    setMicOn(on);
  }

  function applyCam(on: boolean) {
    const stream = localStreamRef.current;
    if (stream) stream.getVideoTracks().forEach((t) => (t.enabled = on));
    setCamOn(on);
  }

  function applySpeaker(on: boolean) {
    const v = remoteVideoRef.current;
    if (v) v.muted = !on;
    setSpeakerOn(on);
  }

  function cleanup() {
    socketRef.current?.disconnect();
    socketRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setStatus("idle");
  }

  async function copyRoomLink() {
    const url = `${location.origin}/room/${encodeURIComponent(roomId)}`;
    await navigator.clipboard.writeText(url);
  }

  useEffect(() => {
    if (!peerId) return;

    let mounted = true;

    async function start() {
      setStatus("connecting");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;

      // 初期状態を反映
      stream.getAudioTracks().forEach((t) => (t.enabled = micOn));
      stream.getVideoTracks().forEach((t) => (t.enabled = camOn));

      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(iceServers);
      pcRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (ev) => {
        const [remoteStream] = ev.streams;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.muted = !speakerOn;
        }
      };

      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        socketRef.current?.emit(EVENTS.ICE_CANDIDATE, {
          roomId,
          from: peerId,
          candidate: ev.candidate.toJSON(),
        });
      };

      pc.onconnectionstatechange = () => {
        if (!mounted) return;
        if (pc.connectionState === "connected") setStatus("connected");
        if (pc.connectionState === "failed") setStatus("failed");
        if (pc.connectionState === "disconnected") setStatus("idle");
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
        } catch {}
      });

      socket.on(EVENTS.PEER_LEFT, () => {
        if (!mounted) return;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        setStatus("idle");
      });
    }

    start().catch((e) => {
      console.error(e);
      setStatus("failed");
    });

    return () => {
      mounted = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId, roomId, signalingUrl, iceServers]);

  useEffect(() => {
    const v = remoteVideoRef.current;
    if (v) v.muted = !speakerOn;
  }, [speakerOn]);

  const badge =
    status === "connected"
      ? "🟢 connected"
      : status === "connecting"
      ? "🟡 connecting"
      : status === "failed"
      ? "🔴 failed"
      : "⚪ idle";

  return (
    <div style={{ padding: 16, fontFamily: "system-ui", color: "#eee", background: "#0b0b0b", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, opacity: 0.8 }}>Room</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{roomId}</div>
          <div style={{ marginTop: 6, fontSize: 14, opacity: 0.9 }}>{badge}</div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => applyMic(!micOn)} style={btnStyle(micOn)} title="マイク送信ON/OFF">
            🎤 {micOn ? "Mic ON" : "Mic OFF"}
          </button>

          <button onClick={() => applyCam(!camOn)} style={btnStyle(camOn)} title="カメラ送信ON/OFF">
            📷 {camOn ? "Cam ON" : "Cam OFF"}
          </button>

          <button onClick={() => applySpeaker(!speakerOn)} style={btnStyle(speakerOn)} title="相手音声ON/OFF">
            🔊 {speakerOn ? "Speaker ON" : "Speaker OFF"}
          </button>

          <button onClick={copyRoomLink} style={{ ...btnStyle(true), opacity: 0.95 }} title="部屋URLをコピー">
            🔗 Copy link
          </button>

          <button onClick={cleanup} style={{ ...btnStyle(false), borderColor: "#ff5b5b", color: "#ffbdbd" }} title="切断">
            ⛔ Leave
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={panelStyle}>
          <div style={labelStyle}>Local</div>
          <video ref={localVideoRef} autoPlay playsInline muted style={videoStyle} />
        </div>

        <div style={panelStyle}>
          <div style={labelStyle}>Remote</div>
          <video ref={remoteVideoRef} autoPlay playsInline style={videoStyle} />
        </div>
      </div>

      {peerId && (
        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
          peerId: {peerId.slice(0, 8)}…
        </div>
      )}
    </div>
  );
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${active ? "#5ad67d" : "#555"}`,
    background: active ? "rgba(90,214,125,0.12)" : "rgba(255,255,255,0.06)",
    color: active ? "#d7ffe1" : "#ddd",
    cursor: "pointer",
    userSelect: "none",
  };
}

const panelStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: 10,
  background: "rgba(255,255,255,0.04)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.8,
  marginBottom: 6,
};

const videoStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "16 / 9",
  background: "#111",
  borderRadius: 12,
};
