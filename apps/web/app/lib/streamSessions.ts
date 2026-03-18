"use client";

import type { StreamSession, StreamSessionStatus } from "./apiTypes";

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
  preferredVideoDeviceId?: string;
  preferredVideoLabel?: string;
};

const UPDATE_EVENT = "aiment-stream-sessions-updated";
const API_BASE = "/api/stream-sessions";

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
  return sessions.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
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
      method: "PATCH",
      body,
    });
    notifyUpdated();
    return session;
  } catch {
    return null;
  }
}

export function subscribeStreamSessions(onUpdate: () => void, intervalMs = 6000): () => void {
  if (!isBrowser()) return () => undefined;

  const tick = () => onUpdate();
  const timer = window.setInterval(tick, intervalMs);
  window.addEventListener(UPDATE_EVENT, tick);
  window.addEventListener("focus", tick);
  document.addEventListener("visibilitychange", tick);

  return () => {
    window.clearInterval(timer);
    window.removeEventListener(UPDATE_EVENT, tick);
    window.removeEventListener("focus", tick);
    document.removeEventListener("visibilitychange", tick);
  };
}
