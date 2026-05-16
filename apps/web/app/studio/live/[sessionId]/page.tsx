"use client";

import { ComponentType, SVGProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDownCircleIcon,
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PlayIcon,
  StopIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
} from "@heroicons/react/24/solid";
import { Room, RoomEvent, Track, type Participant } from "livekit-client";
import { TopNav } from "../../../components/home/TopNav";
import { VTuberTranslationAssistPanel } from "../../../components/translation/TranslationAssistPanels";
import { StudioProgress } from "../../../components/ui/StudioProgress";
import {
  parseChatDataPayload,
  primaryTextForMessage,
  secondaryTextForMessage,
  type BilingualChatMessage,
  type ChatSenderRole,
} from "../../../lib/chatMessages";
import { useI18n } from "../../../lib/i18n";
import {
  getStreamSession,
  setStreamSessionStatus,
  subscribeStreamSessions,
  type StreamSession,
} from "../../../lib/streamSessions";
import { useUserSession } from "../../../lib/userSession";
import { ObsStreamPanel } from "./ObsStreamPanel";

type ParticipantItem = {
  id: string;
  name: string;
  status: "watching" | "speaking" | "requested";
  muted: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  lastSpokeAt: number | null;
};

type ConnectionStatus = "idle" | "starting" | "live" | "failed";

type ChatItem = BilingualChatMessage & {
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

function SpeakerTalkOverlay({
  participants,
  tx,
}: {
  participants: ParticipantItem[];
  tx: (ja: string, en: string) => string;
}) {
  return (
    <aside className="fixed bottom-4 left-3 right-3 top-auto z-[80] max-h-[38vh] overflow-hidden rounded-2xl border border-white/12 bg-[var(--brand-bg-800)]/78 shadow-[0_18px_44px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:bottom-auto sm:left-auto sm:right-5 sm:top-20 sm:w-[320px] sm:max-h-[min(520px,calc(100vh-112px))]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
        <p className="text-xs font-bold text-[var(--brand-text)]">{tx("スピーカー", "Speakers")}</p>
        <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-text-muted)]">
          {participants.length}
        </span>
      </div>
      <div className="max-h-[calc(38vh-42px)] space-y-1.5 overflow-y-auto p-2 sm:max-h-[calc(min(520px,100vh-112px)-42px)]">
        {participants.length === 0 ? (
          <p className="rounded-xl bg-white/6 px-3 py-3 text-xs text-[var(--brand-text-muted)]">
            {tx("スピーカーはいません", "No speakers yet")}
          </p>
        ) : (
          participants.map((participant) => {
            const isSpeaking = participant.isSpeaking;
            const level = Math.max(0.08, Math.min(1, participant.audioLevel || 0));
            const initial = (participant.name || participant.id).trim().charAt(0).toUpperCase();

            return (
              <div
                key={participant.id}
                className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-all duration-200 ${
                  isSpeaking
                    ? "border-green-400/55 bg-green-500/10 shadow-[0_0_22px_rgba(34,197,94,0.22)]"
                    : "border-white/8 bg-white/5"
                }`}
              >
                <div
                  className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
                    isSpeaking
                      ? "bg-green-500 text-white ring-2 ring-green-400/65 ring-offset-2 ring-offset-[var(--brand-bg-800)]"
                      : "bg-[var(--brand-surface)] text-[var(--brand-text)]"
                  }`}
                >
                  <span>{initial || "S"}</span>
                  {isSpeaking ? (
                    <span className="absolute -inset-1 rounded-full border border-green-400/55 shadow-[0_0_18px_rgba(34,197,94,0.55)]" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-[var(--brand-text)]">{participant.name}</p>
                    {isSpeaking ? (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-green-500/25 px-1.5 py-0.5 text-[9px] font-bold text-green-400">
                        <span className="h-2 w-0.5 rounded-full bg-current opacity-60" style={{ transform: `scaleY(${0.6 + level * 0.7})` }} />
                        <span className="h-2.5 w-0.5 rounded-full bg-current" style={{ transform: `scaleY(${0.75 + level * 0.8})` }} />
                        <span className="h-2 w-0.5 rounded-full bg-current opacity-75" style={{ transform: `scaleY(${0.55 + level * 0.75})` }} />
                        <span className="ml-0.5">{tx("発話中", "Speaking")}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${
                          isSpeaking ? "bg-green-400" : "bg-white/18"
                        }`}
                        style={{ width: `${Math.round(level * 100)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-semibold ${participant.muted ? "text-[var(--brand-accent)]" : "text-[var(--brand-text-muted)]"}`}>
                      {participant.muted ? tx("ミュート", "Muted") : tx("有効", "On")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default function StudioLiveSessionPage() {
  const router = useRouter();
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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectedViewers, setConnectedViewers] = useState(0);
  const [obsConnected, setObsConnected] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioContainerRef = useRef<HTMLDivElement | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const roomRef = useRef<Room | null>(null);
  const seenChatIdsRef = useRef<Set<string>>(new Set(INITIAL_CHAT.map((m) => m.id)));
  const activeSpeakerIdsRef = useRef<Set<string>>(new Set());
  const speakingLingerTimersRef = useRef<Map<string, number>>(new Map());

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

  const sendTranslatedChatMessage = useCallback((message: BilingualChatMessage) => {
    seenChatIdsRef.current.add(message.id);
    setChat((prev) => [...prev, { ...message, mine: true }].slice(-MAX_CHAT_MESSAGES));
    setChatInput("");
    if (roomRef.current && connectionStatus === "live") {
      void roomRef.current.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "chat", ...message })),
        { reliable: true },
      );
    }
  }, [connectionStatus]);

  const sendChatText = useCallback((phrase: string) => {
    const text = phrase.trim();
    if (!text) return;
    const message: BilingualChatMessage = {
      id: crypto.randomUUID(),
      sessionId,
      senderRole: "vtuber",
      senderName: "host",
      originalText: text,
      originalLang: "ja",
      createdAt: new Date().toISOString(),
    };
    sendTranslatedChatMessage(message);
  }, [sendTranslatedChatMessage, sessionId]);

  const sendChat = useCallback(() => {
    sendChatText(chatInput);
  }, [chatInput, sendChatText]);

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

  const isSpeakerParticipant = useCallback((participant: Participant) => {
    // If the participant has audio track publications, they're definitely a speaker
    if (participant.audioTrackPublications.size > 0) return true;
    if (participant.isMicrophoneEnabled) return true;
    // Fall back to permissions — canPublishSources is a protobuf repeated field so it's
    // always an array (never undefined), but permissions itself can be undefined when the
    // LiveKit server omits the permission field from ParticipantInfo.
    const sources = participant.permissions?.canPublishSources;
    if (sources !== undefined) return sources.length > 0;
    // Unknown at connection time — defer; TrackSubscribed will resolve it
    return false;
  }, []);

  const clearSpeakingTimer = useCallback((participantId: string) => {
    const timer = speakingLingerTimersRef.current.get(participantId);
    if (timer) {
      window.clearTimeout(timer);
      speakingLingerTimersRef.current.delete(participantId);
    }
  }, []);

  const upsertParticipant = useCallback((participant: Participant, patch: Partial<ParticipantItem> = {}) => {
    if (!isSpeakerParticipant(participant)) {
      setParticipants((prev) => prev.filter((item) => item.id !== participant.identity));
      return;
    }

    const nextItem: ParticipantItem = {
      id: participant.identity,
      name: participant.name ?? participant.identity,
      status: participant.isSpeaking ? "speaking" : "watching",
      muted: !participant.isMicrophoneEnabled,
      isSpeaking: participant.isSpeaking,
      audioLevel: participant.audioLevel,
      lastSpokeAt: participant.isSpeaking ? Date.now() : null,
      ...patch,
    };

    setParticipants((prev) => {
      const exists = prev.some((item) => item.id === participant.identity);
      if (!exists) return [...prev, nextItem];
      return prev.map((item) =>
        item.id === participant.identity
          ? {
              ...item,
              name: nextItem.name,
              muted: nextItem.muted,
              status: nextItem.isSpeaking ? "speaking" : item.status === "requested" ? "requested" : "watching",
              isSpeaking: nextItem.isSpeaking,
              audioLevel: nextItem.audioLevel,
              lastSpokeAt: nextItem.lastSpokeAt ?? item.lastSpokeAt,
              ...patch,
            }
          : item,
      );
    });
  }, [isSpeakerParticipant]);

  const cleanupConnection = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    if (remoteAudioContainerRef.current) {
      remoteAudioContainerRef.current.innerHTML = "";
    }
    speakingLingerTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    speakingLingerTimersRef.current.clear();
    activeSpeakerIdsRef.current.clear();
    setConnectedViewers(0);
    setConnectionStatus("idle");
    setParticipants([]);
  }, []);

  const handleMicToggle = () => {
    const next = !micOn;
    setMicOn(next);
    if (roomRef.current && connectionStatus === "live") {
      void roomRef.current.localParticipant.setMicrophoneEnabled(next);
    }
  };

  const handleCamToggle = () => {
    const next = !camOn;
    setCamOn(next);
    if (roomRef.current && connectionStatus === "live") {
      void roomRef.current.localParticipant.setCameraEnabled(next);
    }
  };

  const startBroadcast = async () => {
    if (!session) return;

    setConnectionStatus("starting");
    setMediaError(null);

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
      room.remoteParticipants.forEach((participant) => {
        upsertParticipant(participant);
      });
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
      upsertParticipant(participant, {
        status: participant.isSpeaking ? "speaking" : "watching",
        isSpeaking: participant.isSpeaking,
        audioLevel: participant.audioLevel,
        lastSpokeAt: participant.isSpeaking ? Date.now() : null,
      });
      setConnectedViewers((n) => n + 1);
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      clearSpeakingTimer(participant.identity);
      activeSpeakerIdsRef.current.delete(participant.identity);
      setParticipants((prev) => prev.filter((p) => p.id !== participant.identity));
      setConnectedViewers((n) => Math.max(0, n - 1));
    });

    room.on(RoomEvent.ParticipantNameChanged, (_name, participant) => {
      if (participant.identity === room.localParticipant.identity) return;
      upsertParticipant(participant);
    });

    room.on(RoomEvent.TrackMuted, (publication, participant) => {
      if (publication.source !== Track.Source.Microphone || participant.identity === room.localParticipant.identity) return;
      upsertParticipant(participant, { muted: true, isSpeaking: false, audioLevel: 0, status: "watching" });
    });

    room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
      if (publication.source !== Track.Source.Microphone || participant.identity === room.localParticipant.identity) return;
      upsertParticipant(participant, { muted: false });
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const previousActiveIds = activeSpeakerIdsRef.current;
      const nextActiveIds = new Set(
        speakers
          .filter((participant) => participant.identity !== room.localParticipant.identity)
          .map((participant) => participant.identity),
      );
      const now = Date.now();

      speakers.forEach((participant) => {
        if (participant.identity === room.localParticipant.identity) return;
        clearSpeakingTimer(participant.identity);
        upsertParticipant(participant, {
          status: "speaking",
          muted: !participant.isMicrophoneEnabled,
          isSpeaking: true,
          audioLevel: participant.audioLevel,
          lastSpokeAt: now,
        });
      });

      previousActiveIds.forEach((participantId) => {
        if (nextActiveIds.has(participantId)) return;
        clearSpeakingTimer(participantId);
        const timer = window.setTimeout(() => {
          setParticipants((prev) =>
            prev.map((participant) =>
              participant.id === participantId && participant.lastSpokeAt != null && Date.now() - participant.lastSpokeAt >= 650
                ? { ...participant, status: "watching", isSpeaking: false, audioLevel: 0 }
                : participant,
            ),
          );
          speakingLingerTimersRef.current.delete(participantId);
        }, 700);
        speakingLingerTimersRef.current.set(participantId, timer);
      });

      activeSpeakerIdsRef.current = nextActiveIds;
    });

    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind !== Track.Kind.Audio) return;
      if (participant.identity === room.localParticipant.identity) return;

      // Audio subscription is definitive proof this is a speaker — add directly.
      // Do this before the ref check so participant tracking always runs.
      const audioItem: ParticipantItem = {
        id: participant.identity,
        name: participant.name ?? participant.identity,
        status: participant.isSpeaking ? "speaking" : "watching",
        muted: !participant.isMicrophoneEnabled,
        isSpeaking: participant.isSpeaking,
        audioLevel: participant.audioLevel,
        lastSpokeAt: participant.isSpeaking ? Date.now() : null,
      };
      setParticipants((prev) => {
        const exists = prev.some((item) => item.id === participant.identity);
        return exists
          ? prev.map((item) => item.id === participant.identity ? { ...item, ...audioItem } : item)
          : [...prev, audioItem];
      });

      if (!remoteAudioContainerRef.current) return;
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
        const decoded = new TextDecoder().decode(payload);
        console.debug("[studio] DataReceived from", participant?.identity ?? "server", decoded.slice(0, 80));
        const msg = JSON.parse(decoded) as {
          type?: string;
          id?: string;
          user?: string;
          text?: string;
          senderRole?: ChatSenderRole;
          senderName?: string;
          originalText?: string;
          originalLang?: "ja" | "en";
          translatedText?: string;
          translatedLang?: "ja" | "en";
          createdAt?: string;
        };
        const chatMessage = parseChatDataPayload(msg, {
          sessionId,
          senderRole: "speaker",
          senderName: msg.user,
        });
        if (chatMessage && !seenChatIdsRef.current.has(chatMessage.id)) {
          seenChatIdsRef.current.add(chatMessage.id);
          setChat((prev) => [
            ...prev,
            chatMessage,
          ].slice(-MAX_CHAT_MESSAGES));
        }
      } catch {
        // no-op
      }
    });

    try {
      await room.connect(tokenData.livekitUrl, tokenData.token);
      await room.localParticipant.setCameraEnabled(camOn);
      await room.localParticipant.setMicrophoneEnabled(micOn);
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
    // Ingress を削除してから終了（上限超過を防ぐ）
    await fetch(`/api/livekit/ingress?sessionId=${encodeURIComponent(session.sessionId)}`, {
      method: "DELETE",
    }).catch(() => null);
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
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav mode="studio" />
      <SpeakerTalkOverlay participants={participants} tx={tx} />

      <main className="mx-auto grid max-w-[1440px] grid-cols-[1fr_320px] items-start gap-4 px-4 py-3 lg:grid-cols-[58px_1fr_360px] lg:px-6">
        <aside className="sticky top-4 hidden lg:block">
          <StudioProgress current="live" orientation="vertical" />
        </aside>

        <section className="flex flex-col gap-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Live Studio</h1>
              <p className="line-clamp-1 text-xs text-[var(--brand-text-muted)]">{session.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isLive ? "bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]" : "bg-[var(--brand-surface)] text-[var(--brand-text-muted)]"}`}>
                {isLive ? tx("配信中", "Live now") : tx("待機中", "Standby")}
              </span>
            </div>
          </div>

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
                  <CircleControl label="MIC" icon={MicrophoneIcon} slashedWhenOff on={micOn} onToggle={handleMicToggle} />
                  <CircleControl label="CAM" icon={VideoCameraIcon} offIcon={VideoCameraSlashIcon} on={camOn} onToggle={handleCamToggle} />
                </div>

                <button
                  onClick={
                    isLive
                      ? () => setShowStopConfirm(true)
                      : () => { void startBroadcast(); }
                  }
                  disabled={!isLive && !obsConnected && connectionStatus === "idle"}
                  title={!isLive && !obsConnected ? tx("OBSを先に接続してください", "Connect OBS first") : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-extrabold disabled:opacity-50 ${
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

          <section className="rounded-2xl bg-[var(--brand-surface)] p-3 shadow-lg shadow-black/25">
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-[var(--brand-text-muted)]">{tx("配信設定", "Stream Settings")}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {metrics.map((item) => (
                  <div key={item.label} className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2">
                    <p className="text-[10px] text-[var(--brand-text-muted)]">{item.label}</p>
                    <p className="text-sm font-bold text-[var(--brand-text)]">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-[var(--brand-bg-900)] p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-text-muted)]">
                  {tx("OBS配信設定", "OBS Stream Setup")}
                </p>
                <ObsStreamPanel
                  sessionId={sessionId}
                  onConnectionChange={setObsConnected}
                />
              </div>
            </div>
          </section>
        </section>

        <aside className="sticky top-4 max-h-[calc(100vh-88px)] self-start space-y-3 overflow-y-auto pr-1">
          <section className="flex h-[520px] flex-col overflow-hidden rounded-2xl bg-[var(--brand-surface)] shadow-lg shadow-black/25">
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
                    <p className="mb-1 text-[11px] font-semibold text-[var(--brand-primary)]">{m.senderName ?? m.senderRole}</p>
                    <p className="text-sm text-[var(--brand-text)]">{primaryTextForMessage(m)}</p>
                    {secondaryTextForMessage(m) ? (
                      <p className="mt-1 text-xs leading-relaxed text-[var(--brand-text-muted)]">{secondaryTextForMessage(m)}</p>
                    ) : null}
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
            </div>
          </section>
          <VTuberTranslationAssistPanel
            sessionId={sessionId}
            messages={chat}
            onSendMessage={sendTranslatedChatMessage}
          />
        </aside>
      </main>

      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--brand-surface)] p-6 shadow-2xl shadow-black/50">
            <h2 className="text-base font-bold text-[var(--brand-text)]">
              {tx("配信を停止しますか？", "Stop the stream?")}
            </h2>
            <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
              {tx(
                "配信を停止すると視聴者との接続が切断されます。この操作は取り消せません。",
                "Stopping the stream will disconnect all viewers. This cannot be undone.",
              )}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 rounded-xl bg-[var(--brand-bg-900)] px-4 py-2.5 text-sm font-semibold text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
              >
                {tx("キャンセル", "Cancel")}
              </button>
              <button
                onClick={() => {
                  setShowStopConfirm(false);
                  void stopBroadcast();
                }}
                className="flex-1 rounded-xl bg-[var(--brand-accent)] px-4 py-2.5 text-sm font-extrabold text-white"
              >
                {tx("配信を停止する", "Stop Stream")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
