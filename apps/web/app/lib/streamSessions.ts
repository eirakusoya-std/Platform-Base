"use client";

import type {
  CreateStreamSessionInput,
  StreamSession,
  StreamSessionStatus,
  UpdateStreamSessionInput,
} from "./apiTypes";

const UPDATE_EVENT = "aiment-stream-sessions-updated";
const BROADCAST_CHANNEL = "aiment-stream-sessions";

function emitUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));

  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL);
    channel.postMessage("updated");
    channel.close();
  }
}

export function notifyStreamSessionsUpdated() {
  emitUpdate();
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as ({ error?: string } & T) | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed");
  }

  if (!payload) {
    throw new Error("Empty response");
  }

  return payload;
}

export type { StreamSession, StreamSessionStatus };

export async function listAllStreamSessions(): Promise<StreamSession[]> {
  const payload = await requestJson<{ sessions: StreamSession[] }>("/api/stream-sessions");
  return payload.sessions;
}

export async function listActiveStreamSessions(): Promise<StreamSession[]> {
  const payload = await requestJson<{ sessions: StreamSession[] }>("/api/stream-sessions?status=prelive,live");
  return payload.sessions;
}

export async function getStreamSession(sessionId: string): Promise<StreamSession | null> {
  try {
    const payload = await requestJson<{ session: StreamSession }>(`/api/stream-sessions/${encodeURIComponent(sessionId)}`);
    return payload.session;
  } catch {
    return null;
  }
}

export async function createStreamSession(input: CreateStreamSessionInput): Promise<StreamSession> {
  const payload = await requestJson<{ session: StreamSession }>("/api/stream-sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });
  emitUpdate();
  return payload.session;
}

export async function updateStreamSession(sessionId: string, patch: UpdateStreamSessionInput): Promise<StreamSession | null> {
  const payload = await requestJson<{ session: StreamSession }>(`/api/stream-sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  emitUpdate();
  return payload.session;
}

export async function setStreamSessionStatus(sessionId: string, status: StreamSessionStatus): Promise<StreamSession | null> {
  const action = status === "live" ? "start" : status === "ended" ? "end" : null;
  if (!action) {
    throw new Error("Direct transition to prelive is not supported");
  }

  const payload = await requestJson<{ session: StreamSession }>(`/api/stream-sessions/${encodeURIComponent(sessionId)}/${action}`, {
    method: "POST",
  });
  emitUpdate();
  return payload.session;
}

export function notifyStreamEndedOnUnload(sessionId: string) {
  const url = `/api/stream-sessions/${encodeURIComponent(sessionId)}/end`;

  if (typeof window === "undefined") return;

  try {
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon(url, new Blob(["{}"], { type: "application/json" }));
      if (ok) {
        emitUpdate();
        return;
      }
    }
  } catch {
    // Fall back to keepalive fetch below.
  }

  void fetch(url, {
    method: "POST",
    body: "{}",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
    },
  }).finally(() => {
    emitUpdate();
  });
}

export function subscribeStreamSessions(onUpdate: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener(UPDATE_EVENT, onUpdate);
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(BROADCAST_CHANNEL) : null;
  channel?.addEventListener("message", onUpdate);

  return () => {
    window.removeEventListener(UPDATE_EVENT, onUpdate);
    channel?.removeEventListener("message", onUpdate);
    channel?.close();
  };
}
