"use client";

import { MouseEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "./components/home/Footer";
import { SearchFilterBar } from "./components/home/SearchFilterBar";
import { SessionDetailModal } from "./components/home/SessionDetailModal";
import { TopNav } from "./components/home/TopNav";
import { LIVE_NOW_SESSIONS, STARTING_SOON_SESSIONS, TAGS } from "./components/home/data";
import { NowLiveSection } from "./components/home/sections/NowLiveSection";
import { StartingSoonSection } from "./components/home/sections/StartingSoonSection";
import { UpcomingTicker } from "./components/home/UpcomingTicker";
import { ModalSession } from "./components/home/types";
import { matchesFilter } from "./components/home/utils";

export default function HomePage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<ModalSession | null>(null);
  const [notifySet, setNotifySet] = useState<Set<number>>(new Set());
  const [reservedSet, setReservedSet] = useState<Set<number>>(new Set());

  const [countdown, setCountdown] = useState<Record<number, number>>(() =>
    Object.fromEntries(STARTING_SOON_SESSIONS.map((session) => [session.id, session.startsInSeconds])),
  );

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

  const filteredStartingSoon = useMemo(
    () => STARTING_SOON_SESSIONS.filter((session) => matchesFilter(session, searchQuery, activeTags)),
    [searchQuery, activeTags],
  );

  const filteredLive = useMemo(
    () => LIVE_NOW_SESSIONS.filter((session) => matchesFilter(session, searchQuery, activeTags)),
    [searchQuery, activeTags],
  );

  const handleToggleTag = (tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleToggleReserve = (event: MouseEvent, sessionId: number) => {
    event.stopPropagation();
    setReservedSet((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const handleToggleNotify = (event: MouseEvent, sessionId: number) => {
    event.stopPropagation();
    setNotifySet((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const goPreJoin = (sessionId: number) => {
    router.push(`/join/${encodeURIComponent(String(sessionId))}`);
  };

  return (
    <div className="min-h-screen bg-white">
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
          countdown={countdown}
          reservedSet={reservedSet}
          onOpenSession={setSelectedSession}
          onToggleReserve={handleToggleReserve}
          onParticipate={goPreJoin}
        />

        <NowLiveSection
          sessions={filteredLive}
          notifySet={notifySet}
          onOpenSession={setSelectedSession}
          onToggleNotify={handleToggleNotify}
        />
      </div>

      <Footer />

      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onParticipate={goPreJoin}
        />
      )}
    </div>
  );
}
