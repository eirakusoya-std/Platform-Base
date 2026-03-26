"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Room, RoomEvent, Track } from "livekit-client";
import { useI18n } from "../../lib/i18n";

type Role = "host" | "listener" | "speaker" | "unknown";
type RequestedRole = "host" | "listener" | "speaker";
type Status = "idle" | "connecting" | "connected" | "failed";

type ChatMessage = {
  id: string;
  user: string;
  text: string;
  mine?: boolean;
};

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

  const [status, setStatus] = useState<Status>("idle");
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [assignedRole, setAssignedRole] = useState<Role>("unknown");
  const [copied, setCopied] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [chatInput, setChatInput] = useState("");

  const [micOn, setMicOn] = useState(requestedRole !== "listener" && searchParams.get("mic") !== "0");
  const [camOn, setCamOn] = useState(requestedRole === "host" && searchParams.get("cam") !== "0");
  const [speakerOn, setSpeakerOn] = useState(searchParams.get("speaker") !== "0");

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioContainerRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const roomRef = useRef<Room | null>(null);

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
        void roomRef.current.localParticipant.setMicrophoneEnabled(enabled);
      }
    },
    [canSendMic],
  );

  const applyCam = useCallback(
    (enabled: boolean) => {
      if (!canSendCam) return;
      setCamOn(enabled);
      if (roomRef.current) {
        void roomRef.current.localParticipant.setCameraEnabled(enabled);
      }
    },
    [canSendCam],
  );

  const applySpeaker = useCallback((enabled: boolean) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !enabled;
    }
    if (remoteAudioContainerRef.current) {
      const audioEls = remoteAudioContainerRef.current.querySelectorAll("audio");
      audioEls.forEach((el) => {
        el.muted = !enabled;
      });
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
    const displayName = roomRef.current?.localParticipant.name ?? "you";
    const msg = { type: "chat", id: `${Date.now()}`, user: displayName, text: value };
    setChatMessages((prev) => [...prev, { id: msg.id, user: msg.user, text: msg.text, mine: true }]);
    setChatInput("");
    if (roomRef.current && status === "connected") {
      void roomRef.current.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(msg)),
        { reliable: true },
      );
    }
  }, [chatInput, status]);

  useEffect(() => {
    if (!roomId || requestedRole === "listener") return;

    let mounted = true;

    const start = async () => {
      setStatus("connecting");

      // Get LiveKit token
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: roomId,
          role: requestedRole === "host" ? "vtuber" : "speaker",
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
        setAssignedRole(requestedRole === "host" ? "host" : "speaker");

        // Publish mic (always true here since listener exits early above)
        void room.localParticipant.setMicrophoneEnabled(micOn);
        // Publish camera for host only
        if (requestedRole === "host") {
          void room.localParticipant.setCameraEnabled(camOn);
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
          remoteVideoRef.current.muted = !speakerOn;
          remoteVideoRef.current.play().catch(() => {
            if (!remoteVideoRef.current) return;
            remoteVideoRef.current.muted = true;
            void remoteVideoRef.current.play().catch(() => {
              // no-op
            });
            setSpeakerOn(false);
          });
          setRemoteConnected(true);
        }
        if (track.kind === Track.Kind.Audio && remoteAudioContainerRef.current) {
          const audioEl = track.attach() as HTMLAudioElement;
          audioEl.autoplay = true;
          audioEl.muted = !speakerOn;
          audioEl.dataset.lkTrackSid = track.sid;
          remoteAudioContainerRef.current.appendChild(audioEl);
          void audioEl.play().catch(() => {
            if (!audioEl) return;
            audioEl.muted = true;
            setSpeakerOn(false);
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

      room.on(RoomEvent.DataReceived, (payload) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload)) as {
            type?: string;
            id?: string;
            user?: string;
            text?: string;
          };
          if (msg.type === "chat" && msg.user && msg.text) {
            setChatMessages((prev) => [
              ...prev,
              { id: msg.id ?? `${Date.now()}`, user: msg.user!, text: msg.text! },
            ]);
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
  }, [cleanup, requestedRole, roomId]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !speakerOn;
    }
    if (remoteAudioContainerRef.current) {
      const audioEls = remoteAudioContainerRef.current.querySelectorAll("audio");
      audioEls.forEach((el) => {
        el.muted = !speakerOn;
      });
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
      <header className="bg-[var(--brand-bg-900)]">
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
                {requestedRole === "listener" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--brand-surface)] text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
                      <span className="text-2xl">👂</span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--brand-text)]">{tx("リスナーモード", "Listener Mode")}</p>
                    <p className="max-w-[260px] text-xs text-[var(--brand-text-muted)]">
                      {tx("ライブ配信視聴機能は近日公開予定です。", "Live stream viewing is coming soon.")}
                    </p>
                  </div>
                ) : (
                  <>
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
                  </>
                )}

                {requestedRole !== "listener" && (
                  <>
                    <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold">LIVE</div>
                    <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs">
                      {assignedRole === "host" ? tx("配信者メイン", "Host Main") : tx("スピーカー", "Speaker")}
                    </div>
                  </>
                )}
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
                <button onClick={() => { void copyRoomLink(); }} className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--brand-text)] transition-colors">
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
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{tx("ライブチャット", "Live Chat")}</p>
                <span className="rounded-full bg-[var(--brand-surface)] px-2 py-0.5 text-[11px] text-[var(--brand-text-muted)]">{chatMessages.length}件</span>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-lg px-3 py-2 ${message.mine ? "ml-6 bg-[var(--brand-surface-soft)]" : "mr-6 bg-[var(--brand-surface)]"}`}
                >
                  <p className="mb-1 text-[11px] font-semibold text-[var(--brand-primary)]">{message.user}</p>
                  <p className="text-sm leading-relaxed text-[var(--brand-text)]">{message.text}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3">
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
                  className="flex-1 rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm text-[var(--brand-text)] outline-none placeholder:text-[var(--brand-text-muted)]"
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
