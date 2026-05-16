"use client";

import type { StreamSession, StreamSessionStatus, SubscriptionPlan } from "./apiTypes";

export type { StreamSession, StreamSessionStatus };

type CreateStreamSessionInput = {
  title: string;
  description: string;
  category: string;
  thumbnail?: string;
  hostName?: string;
  startsAt?: string;
  participationType?: "First-come" | "Lottery";
  slotsTotal?: number;
  speakerSlotsTotal?: number;
  requiredPlan?: SubscriptionPlan;
  speakerRequiredPlan?: SubscriptionPlan;
  preferredVideoDeviceId?: string;
  preferredVideoLabel?: string;
};

const UPDATE_EVENT = "aiment-stream-sessions-updated";
const BC_CHANNEL = "aiment-stream-updates";
const API_BASE = "/api/stream-sessions";

// Module-level cache — survives React unmount/remount and page-to-page SPA navigation
let _activeSessionsCache: StreamSession[] | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 60_000;

export function getCachedActiveSessions(): StreamSession[] | null {
  if (_activeSessionsCache !== null && Date.now() - _cacheTime < CACHE_TTL_MS) {
    return _activeSessionsCache;
  }
  return null;
}

function setCachedActiveSessions(sessions: StreamSession[]) {
  _activeSessionsCache = sessions;
  _cacheTime = Date.now();
}

function sessionUrl(sessionId: string) {
  return `${API_BASE}/${encodeURIComponent(sessionId)}`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

async function requestJson<T>(fetchUrl: string, init?: RequestInit): Promise<T> {
  const response = await fetch(fetchUrl, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body?.error === "string") message = body.error;
      else if (typeof body?.message === "string") message = body.message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
}

function notifyUpdated() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  // notify other tabs
  try {
    const bc = new BroadcastChannel(BC_CHANNEL);
    bc.postMessage("update");
    bc.close();
  } catch {
    // no-op (BroadcastChannel not available in some environments)
  }
}

export function notifyStreamSessionsUpdated() {
  notifyUpdated();
}

export async function listAllStreamSessions(): Promise<StreamSession[]> {
  const { sessions } = await requestJson<{ sessions: StreamSession[] }>(API_BASE);
  return sessions.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listActiveStreamSessions(): Promise<StreamSession[]> {
  const { sessions } = await requestJson<{ sessions: StreamSession[] }>(`${API_BASE}?status=prelive,live`);
  const sorted = sessions.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  setCachedActiveSessions(sorted);
  return sorted;
}

export async function getStreamSession(sessionId: string): Promise<StreamSession | null> {
  try {
    const { session } = await requestJson<{ session: StreamSession }>(sessionUrl(sessionId));
    return session;
  } catch {
    return null;
  }
}

export async function createStreamSession(input: CreateStreamSessionInput): Promise<StreamSession> {
  const { session } = await requestJson<{ session: StreamSession }>(API_BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
  notifyUpdated();
  return session;
}

export async function listMyStreamSessions(): Promise<StreamSession[]> {
  const { sessions } = await requestJson<{ sessions: StreamSession[] }>(`${API_BASE}?mine=1`);
  return sessions.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function deleteStreamSession(sessionId: string): Promise<boolean> {
  try {
    await requestJson<{ ok: boolean }>(sessionUrl(sessionId), { method: "DELETE" });
    notifyUpdated();
    return true;
  } catch {
    return false;
  }
}

export async function updateStreamSession(sessionId: string, patch: Partial<StreamSession>): Promise<StreamSession | null> {
  try {
    const { session } = await requestJson<{ session: StreamSession }>(sessionUrl(sessionId), {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    notifyUpdated();
    return session;
  } catch {
    return null;
  }
}

export async function setStreamSessionStatus(sessionId: string, status: StreamSessionStatus): Promise<StreamSession | null> {
  try {
    const fetchUrl =
      status === "live"
        ? `${sessionUrl(sessionId)}/start`
        : status === "ended"
          ? `${sessionUrl(sessionId)}/end`
          : sessionUrl(sessionId);
    const body = status === "prelive" ? JSON.stringify({ status }) : undefined;
    const { session } = await requestJson<{ session: StreamSession }>(fetchUrl, {
      method: status === "live" || status === "ended" ? "POST" : "PATCH",
      body,
    });
    notifyUpdated();
    return session;
  } catch {
    return null;
  }
}

export function subscribeStreamSessions(onUpdate: () => void, intervalMs = 10000): () => void {
  if (!isBrowser()) return () => undefined;

  let lastCount = -1;

  const checkCount = async () => {
    try {
      const res = await fetch(`${API_BASE}?status=prelive,live&count=1`, { cache: "no-store" });
      if (!res.ok) return;
      const { count } = (await res.json()) as { count: number };
      if (count !== lastCount) {
        lastCount = count;
        onUpdate();
      }
    } catch {
      // transient error — ignore
    }
  };

  // immediate local events (same tab mutations) still trigger instantly
  const onLocalUpdate = () => {
    lastCount = -1; // force re-fetch on next tick
    onUpdate();
  };

  void checkCount();
  const timer = window.setInterval(() => void checkCount(), intervalMs);
  window.addEventListener(UPDATE_EVENT, onLocalUpdate);

  // cross-tab updates via BroadcastChannel
  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(BC_CHANNEL);
    bc.onmessage = onLocalUpdate;
  } catch {
    // no-op
  }

  return () => {
    window.clearInterval(timer);
    window.removeEventListener(UPDATE_EVENT, onLocalUpdate);
    bc?.close();
  };
}
