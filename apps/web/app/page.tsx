"use client";

import { MouseEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "./components/home/Footer";
import { SearchFilterBar } from "./components/home/SearchFilterBar";
import { SessionDetailModal } from "./components/home/SessionDetailModal";
import { TopNav } from "./components/home/TopNav";
import { TAGS } from "./components/home/data";
import { NowLiveSection } from "./components/home/sections/NowLiveSection";
import { StartingSoonSection } from "./components/home/sections/StartingSoonSection";
import { UpcomingTicker } from "./components/home/UpcomingTicker";
import { LiveSession, ModalSession, StartingSoonSession } from "./components/home/types";
import { matchesFilter } from "./components/home/utils";
import { listActiveStreamSessions, subscribeStreamSessions, type StreamSession } from "./lib/streamSessions";

function toSecondsUntil(startsAt: string) {
  const diffMs = new Date(startsAt).getTime() - Date.now();
  return Math.max(0, Math.floor(diffMs / 1000));
}

export default function HomePage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<ModalSession | null>(null);
  const [notifySet, setNotifySet] = useState<Set<string>>(new Set());
  const [reservedSet, setReservedSet] = useState<Set<string>>(new Set());
  const [dynamicSessions, setDynamicSessions] = useState<StreamSession[]>([]);
  const [countdown, setCountdown] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const sessions = await listActiveStreamSessions();
        if (!cancelled) setDynamicSessions(sessions);
      } catch {
        if (!cancelled) setDynamicSessions([]);
      }
    };
    void sync();
    const unsubscribe = subscribeStreamSessions(sync);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const dynamicStartingSoon = useMemo<StartingSoonSession[]>(
    () =>
      dynamicSessions
        .filter((session) => session.status === "prelive")
        .map((session) => ({
          id: session.sessionId,
          hostUserId: session.hostUserId,
          hostAvatarUrl: session.hostAvatarUrl,
          hostChannelName: session.hostChannelName,
          vtuber: session.hostName,
          title: session.title,
          thumbnail: session.thumbnail,
          startsInSeconds: toSecondsUntil(session.startsAt),
          slotsTotal: session.slotsTotal,
          slotsLeft: session.slotsLeft,
          participationType: session.participationType,
          reservationRequired: session.reservationRequired,
          isSubscribed: true,
          tags: [session.category, "参加型"],
          description: session.description,
          duration: "約60分",
          glowColor: "rgba(124,106,230,0.35)",
        })),
    [dynamicSessions],
  );

  const dynamicLive = useMemo<LiveSession[]>(
    () =>
      dynamicSessions
        .filter((session) => session.status === "live")
        .map((session) => ({
          id: session.sessionId,
          hostUserId: session.hostUserId,
          hostAvatarUrl: session.hostAvatarUrl,
          hostChannelName: session.hostChannelName,
          vtuber: session.hostName,
          title: session.title,
          thumbnail: session.thumbnail,
          viewers: 0,
          slotsTotal: session.slotsTotal,
          slotsLeft: session.slotsLeft,
          participationType: session.participationType,
          isSubscribed: true,
          tags: [session.category, "参加型"],
          description: session.description,
          duration: "配信中",
        })),
    [dynamicSessions],
  );

  const allStartingSoon = useMemo(() => dynamicStartingSoon, [dynamicStartingSoon]);
  const allLive = useMemo(() => dynamicLive, [dynamicLive]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        const next = { ...prev };
        for (const key in next) {
          if (next[key] > 0) next[key] -= 1;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const mergedCountdown = useMemo(() => {
    const next: Record<string, number> = {};
    for (const session of allStartingSoon) {
      next[session.id] = countdown[session.id] ?? session.startsInSeconds;
    }
    return next;
  }, [allStartingSoon, countdown]);

  const filteredStartingSoon = useMemo(
    () => allStartingSoon.filter((session) => matchesFilter(session, searchQuery, activeTags)),
    [allStartingSoon, searchQuery, activeTags],
  );

  const filteredLive = useMemo(
    () => allLive.filter((session) => matchesFilter(session, searchQuery, activeTags)),
    [allLive, searchQuery, activeTags],
  );

  const handleToggleTag = (tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleToggleReserve = (event: MouseEvent, sessionId: string) => {
    event.stopPropagation();
    setReservedSet((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const handleToggleNotify = (event: MouseEvent, sessionId: string) => {
    event.stopPropagation();
    setNotifySet((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const goPreJoin = (sessionId: string) => {
    router.push(`/join/${encodeURIComponent(sessionId)}`);
  };

  const goChannel = (userId: string) => {
    router.push(`/channels/${encodeURIComponent(userId)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] pb-20 md:pb-0">
      <TopNav />

      <SearchFilterBar
        tags={TAGS}
        searchQuery={searchQuery}
        activeTags={activeTags}
        onSearchChange={setSearchQuery}
        onToggleTag={handleToggleTag}
        onClearTags={() => setActiveTags([])}
      />

      <UpcomingTicker sessions={filteredStartingSoon} onParticipate={goPreJoin} />

      <div className="mx-auto max-w-[1400px] px-8">
        <StartingSoonSection
          sessions={filteredStartingSoon}
          countdown={mergedCountdown}
          reservedSet={reservedSet}
          onOpenSession={setSelectedSession}
          onOpenChannel={goChannel}
          onToggleReserve={handleToggleReserve}
        />

        <NowLiveSection
          sessions={filteredLive}
          notifySet={notifySet}
          onOpenSession={setSelectedSession}
          onOpenChannel={goChannel}
          onToggleNotify={handleToggleNotify}
        />
      </div>

      <Footer />

      {selectedSession && <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} onParticipate={(s) => goPreJoin(s.id)} />}
    </div>
  );
}
