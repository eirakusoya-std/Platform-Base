"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { EVENTS } from "@repo/shared";

export default function RoomPage({ params }: { params: { roomId: string } }) {
  const roomId = params.roomId;

  const [peerId] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

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

      // 1) カメラ・マイク取得
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // 2) WebRTC接続（P2P）の器
      const pc = new RTCPeerConnection(iceServers);
      pcRef.current = pc;

      // 自分の音声/映像トラックを登録
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // 相手の映像が来たら表示
      pc.ontrack = (ev) => {
        const [remoteStream] = ev.streams;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      };

      // ICE候補（繋がる経路候補）が出たらsignalingへ
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        socketRef.current?.emit(EVENTS.ICE_CANDIDATE, {
          roomId,
          from: peerId,
          candidate: ev.candidate.toJSON(),
        });
      };

      // 3) signalingへ接続
      const socket = io(signalingUrl, { transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit(EVENTS.JOIN_ROOM, { roomId, peerId });
      });

      // 相手が入室した合図 -> 自分がofferを作る（シンプル運用）
      socket.on(EVENTS.PEER_JOINED, async () => {
        if (pc.signalingState !== "stable") return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit(EVENTS.OFFER, { roomId, from: peerId, sdp: offer });
      });

      // offer受信 -> answerを返す
      socket.on(EVENTS.OFFER, async (payload: any) => {
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit(EVENTS.ANSWER, { roomId, from: peerId, sdp: answer });
      });

      // answer受信 -> 接続確定へ
      socket.on(EVENTS.ANSWER, async (payload: any) => {
        await pc.setRemoteDescription(payload.sdp);
      });

      // ICE受信 -> 経路候補を追加
      socket.on(EVENTS.ICE_CANDIDATE, async (payload: any) => {
        try {
          await pc.addIceCandidate(payload.candidate);
        } catch {
          // タイミング差で失敗することがあるが、初期は無視でOK
        }
      });

      pc.onconnectionstatechange = () => {
        if (!mounted) return;
        if (pc.connectionState === "connected") setStatus("connected");
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") setStatus("idle");
      };

      socket.on(EVENTS.PEER_LEFT, () => {
        if (!mounted) return;
        setStatus("idle");
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      });
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

  function toggleMic() {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn(stream.getAudioTracks().some((t) => t.enabled));
  }

  function toggleCam() {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOn(stream.getVideoTracks().some((t) => t.enabled));
  }

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

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={toggleMic}>{micOn ? "Mute" : "Unmute"}</button>
        <button onClick={toggleCam}>{camOn ? "Camera Off" : "Camera On"}</button>
      </div>

      <p style={{ marginTop: 12, opacity: 0.8 }}>
        同じ roomId のURLを別ブラウザ or 別端末で開くと繋がります。
      </p>
    </div>
  );
}
