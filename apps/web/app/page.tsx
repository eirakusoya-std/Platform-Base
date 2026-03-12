"use client";

import { MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "./components/home/Footer";
import { SearchFilterBar } from "./components/home/SearchFilterBar";
import { SessionDetailModal } from "./components/home/SessionDetailModal";
import { TopNav } from "./components/home/TopNav";
import { LIVE_NOW_SESSIONS, STARTING_SOON_SESSIONS, TAGS } from "./components/home/data";
import { NowLiveSection } from "./components/home/sections/NowLiveSection";
import { StartingSoonSection } from "./components/home/sections/StartingSoonSection";
import { UpcomingTicker } from "./components/home/UpcomingTicker";
import { LiveSession, ModalSession, StartingSoonSession } from "./components/home/types";
import { matchesFilter } from "./components/home/utils";
import { cancelReservation, createReservation, listMyReservations, subscribeReservations } from "./lib/reservations";
import { canAccessRequiredPlan, planLabel } from "./lib/planAccess";
import { listActiveStreamSessions, subscribeStreamSessions, type StreamSession } from "./lib/streamSessions";
import { useUserSession } from "./lib/userSession";

const LIVE_SYNC_POLL_MS = 5000;

function toSecondsUntil(startsAt: string) {
  const diffMs = new Date(startsAt).getTime() - Date.now();
  return Math.max(0, Math.floor(diffMs / 1000));
}

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useUserSession();

  const [hydrated, setHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<ModalSession | null>(null);
  const [notifySet, setNotifySet] = useState<Set<string>>(new Set());
  const [reservedSet, setReservedSet] = useState<Set<string>>(new Set());
  const [reservationIds, setReservationIds] = useState<Record<string, string>>({});
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [dynamicSessions, setDynamicSessions] = useState<StreamSession[]>([]);
  const [recentlyStartedReservedIds, setRecentlyStartedReservedIds] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<Record<string, number>>(() =>
    Object.fromEntries(STARTING_SOON_SESSIONS.map((session) => [session.id, session.startsInSeconds])),
  );
  const previousStatusesRef = useRef<Record<string, StreamSession["status"]>>({});
  const initializedStatusesRef = useRef(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    setNotificationPermission(window.Notification.permission);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const sync = async () => {
      const sessions = await listActiveStreamSessions().catch(() => []);
      setDynamicSessions(sessions);
    };

    void sync();
    const intervalId = window.setInterval(() => {
      void sync();
    }, LIVE_SYNC_POLL_MS);

    const unsubscribe = subscribeStreamSessions(() => {
      void sync();
    });
    return () => {
      window.clearInterval(intervalId);
      unsubscribe();
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      setReservedSet(new Set());
      setReservationIds({});
      return;
    }

    const sync = async () => {
      const reservations = await listMyReservations().catch(() => []);
      const active = reservations.filter((reservation) => reservation.status === "reserved");
      setReservedSet(new Set(active.map((reservation) => reservation.sessionId)));
      setReservationIds(
        Object.fromEntries(active.map((reservation) => [reservation.sessionId, reservation.reservationId])),
      );
    };

    void sync();
    const intervalId = window.setInterval(() => {
      void sync();
    }, LIVE_SYNC_POLL_MS);

    const unsubscribe = subscribeReservations(() => {
      void sync();
    });
    return () => {
      window.clearInterval(intervalId);
      unsubscribe();
    };
  }, [hydrated, isAuthenticated]);

  useEffect(() => {
    setSelectedSession((current) => {
      if (!current) return null;
      const dynamicSession = dynamicSessions.find((session) => session.sessionId === current.id);

      return {
        ...current,
        reserved: reservedSet.has(current.id),
        streamStatus: dynamicSession?.status ?? current.streamStatus,
        reservationRequired: dynamicSession?.reservationRequired ?? current.reservationRequired,
        requiredPlan: dynamicSession?.requiredPlan ?? current.requiredPlan,
        isSubscribed: dynamicSession ? canAccessRequiredPlan(user?.plan, dynamicSession.requiredPlan) : current.isSubscribed,
        slotsLeft: dynamicSession?.slotsLeft ?? current.slotsLeft,
      };
    });
  }, [dynamicSessions, reservedSet, user?.plan]);

  const dynamicStartingSoon = useMemo<StartingSoonSession[]>(
    () =>
      dynamicSessions
        .filter((session) => session.status === "prelive")
        .map((session) => ({
          id: session.sessionId,
          vtuber: session.hostName,
          title: session.title,
          thumbnail: session.thumbnail,
          startsInSeconds: toSecondsUntil(session.startsAt),
          slotsTotal: session.slotsTotal,
          slotsLeft: session.slotsLeft,
          participationType: session.participationType,
          requiredPlan: session.requiredPlan,
          reservationRequired: session.reservationRequired,
          isSubscribed: canAccessRequiredPlan(user?.plan, session.requiredPlan),
          tags: [session.category, "参加型"],
          description: session.description,
          duration: "約60分",
          glowColor: "rgba(124,106,230,0.35)",
        })),
    [dynamicSessions, user?.plan],
  );

  const dynamicLive = useMemo<LiveSession[]>(
    () =>
      dynamicSessions
        .filter((session) => session.status === "live")
        .map((session) => ({
          id: session.sessionId,
          vtuber: session.hostName,
          title: session.title,
          thumbnail: session.thumbnail,
          viewers: 0,
          slotsTotal: session.slotsTotal,
          slotsLeft: session.slotsLeft,
          participationType: session.participationType,
          requiredPlan: session.requiredPlan,
          reservationRequired: session.reservationRequired,
          isSubscribed: canAccessRequiredPlan(user?.plan, session.requiredPlan),
          tags: [session.category, "参加型"],
          description: session.description,
          duration: "配信中",
        })),
    [dynamicSessions, user?.plan],
  );

  const allStartingSoon = useMemo(() => [...dynamicStartingSoon, ...STARTING_SOON_SESSIONS], [dynamicStartingSoon]);
  const allLive = useMemo(() => [...dynamicLive, ...LIVE_NOW_SESSIONS], [dynamicLive]);

  useEffect(() => {
    setCountdown((prev) => {
      const next = { ...prev };
      const validIds = new Set(allStartingSoon.map((session) => session.id));

      for (const session of allStartingSoon) {
        if (next[session.id] == null) {
          next[session.id] = session.startsInSeconds;
        }
      }

      for (const id of Object.keys(next)) {
        if (!validIds.has(id)) delete next[id];
      }

      return next;
    });
  }, [allStartingSoon]);

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
    () => allStartingSoon.filter((session) => matchesFilter(session, searchQuery, activeTags)),
    [allStartingSoon, searchQuery, activeTags],
  );

  const filteredLive = useMemo(
    () => allLive.filter((session) => matchesFilter(session, searchQuery, activeTags)),
    [allLive, searchQuery, activeTags],
  );

  const recentlyStartedReservedSessions = useMemo(
    () =>
      recentlyStartedReservedIds
        .map((sessionId) => dynamicSessions.find((session) => session.sessionId === sessionId) ?? null)
        .filter((session): session is StreamSession => session != null && session.status === "live"),
    [dynamicSessions, recentlyStartedReservedIds],
  );

  const handleToggleTag = (tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const openSessionModal = (session: ModalSession) => {
    setSelectedSession({
      ...session,
      reserved: reservedSet.has(session.id),
    });
  };

  const toggleReservation = async (sessionId: string) => {
    if (loading) return;
    if (!isAuthenticated) {
      router.push("/auth?mode=signup");
      return;
    }

    setReservationError(null);

    try {
      const existingReservationId = reservationIds[sessionId];
      const targetSession = dynamicSessions.find((entry) => entry.sessionId === sessionId);
      if (targetSession && !canAccessRequiredPlan(user?.plan, targetSession.requiredPlan)) {
        throw new Error(`この枠は ${planLabel(targetSession.requiredPlan)} プランが必要です。`);
      }
      if (existingReservationId) {
        await cancelReservation(existingReservationId);
        return;
      }

      await createReservation({ sessionId });
    } catch (error) {
      setReservationError(error instanceof Error ? error.message : "Failed to update reservation");
    }
  };

  const handleToggleReserve = async (event: MouseEvent, sessionId: string) => {
    event.stopPropagation();
    await toggleReservation(sessionId);
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

  const handleSessionPrimaryAction = async (session: ModalSession) => {
    if (!canAccessRequiredPlan(user?.plan, session.requiredPlan)) {
      setReservationError(`この枠は ${planLabel(session.requiredPlan)} プランが必要です。`);
      router.push("/account");
      return;
    }

    if (session.streamStatus === "prelive") {
      await toggleReservation(session.id);
      return;
    }

    if (session.streamStatus === "live") {
      if (session.reservationRequired && !reservedSet.has(session.id)) {
        setReservationError("この枠は予約必須です。先に予約してください。");
        return;
      }

      goPreJoin(session.id);
    }
  };

  useEffect(() => {
    const previousStatuses = previousStatusesRef.current;
    const nextStatuses = Object.fromEntries(dynamicSessions.map((session) => [session.sessionId, session.status]));

    if (!initializedStatusesRef.current) {
      previousStatusesRef.current = nextStatuses;
      initializedStatusesRef.current = true;
      return;
    }

    const newlyStartedReserved = dynamicSessions.filter((session) => {
      const previousStatus = previousStatuses[session.sessionId];
      return previousStatus === "prelive" && session.status === "live" && reservedSet.has(session.sessionId);
    });

    if (newlyStartedReserved.length > 0) {
      setRecentlyStartedReservedIds((current) => {
        const next = new Set(current);
        for (const session of newlyStartedReserved) {
          next.add(session.sessionId);
        }
        return [...next];
      });
    }

    previousStatusesRef.current = nextStatuses;
  }, [dynamicSessions, reservedSet]);

  useEffect(() => {
    if (notificationPermission !== "granted" || recentlyStartedReservedSessions.length === 0) return;

    for (const session of recentlyStartedReservedSessions) {
      if (window.sessionStorage.getItem(`aiment-live-notified:${session.sessionId}`) === "1") continue;

      new Notification("予約していた配信が開始しました", {
        body: `${session.hostName} / ${session.title}`,
      });
      window.sessionStorage.setItem(`aiment-live-notified:${session.sessionId}`, "1");
    }
  }, [notificationPermission, recentlyStartedReservedSessions]);

  const enableBrowserNotifications = async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);
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

      {reservationError && (
        <div className="mx-auto max-w-[1400px] px-8 pt-4">
          <div className="rounded-xl bg-[var(--brand-accent)]/15 px-4 py-3 text-sm text-[var(--brand-accent)]">
            {reservationError}
          </div>
        </div>
      )}

      {recentlyStartedReservedSessions.length > 0 && (
        <div className="mx-auto max-w-[1400px] px-8 pt-4">
          <div className="rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/12 px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--brand-primary)]">予約していた配信が開始しました</p>
                <p className="text-xs text-[var(--brand-text-muted)]">下のボタンからすぐ参加前チェックへ移動できます。</p>
              </div>
              {notificationPermission === "default" && (
                <button
                  type="button"
                  onClick={() => {
                    void enableBrowserNotifications();
                  }}
                  className="rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-xs font-semibold text-[var(--brand-text)]"
                >
                  ブラウザ通知を有効化
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {recentlyStartedReservedSessions.map((session) => (
                <button
                  key={session.sessionId}
                  type="button"
                  onClick={() => goPreJoin(session.sessionId)}
                  className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white"
                >
                  {session.hostName} - 参加する
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <UpcomingTicker sessions={filteredStartingSoon} onParticipate={goPreJoin} />

      <div className="mx-auto max-w-[1400px] px-8">
        <StartingSoonSection
          sessions={filteredStartingSoon}
          countdown={countdown}
          reservedSet={reservedSet}
          onOpenSession={openSessionModal}
          onToggleReserve={handleToggleReserve}
        />

        <NowLiveSection
          sessions={filteredLive}
          notifySet={notifySet}
          onOpenSession={openSessionModal}
          onToggleNotify={handleToggleNotify}
        />
      </div>

      <Footer />

      {selectedSession && <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} onParticipate={handleSessionPrimaryAction} />}
    </div>
  );
}
