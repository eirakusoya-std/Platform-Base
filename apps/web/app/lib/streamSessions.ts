"use client";

export type StreamSessionStatus = "prelive" | "live" | "ended";

export type StreamSession = {
  sessionId: string;
  hostUserId: string;
  title: string;
  status: StreamSessionStatus;
  createdAt: string;
  startsAt: string;
  description: string;
  category: string;
  thumbnail: string;
  hostName: string;
  participationType: "First-come" | "Lottery";
  slotsTotal: number;
  slotsLeft: number;
};

type CreateStreamSessionInput = {
  hostUserId: string;
  title: string;
  description: string;
  category: string;
  thumbnail?: string;
  hostName?: string;
  startsAt?: string;
  participationType?: "First-come" | "Lottery";
  slotsTotal?: number;
};

const STORAGE_KEY = "aiment.stream-sessions.v1";
const UPDATE_EVENT = "aiment-stream-sessions-updated";

let memorySessions: StreamSession[] = [];

function isBrowser() {
  return typeof window !== "undefined";
}

function parseSessions(raw: string | null): StreamSession[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item?.sessionId === "string");
  } catch {
    return [];
  }
}

function readSessions(): StreamSession[] {
  if (!isBrowser()) return memorySessions;
  const parsed = parseSessions(window.localStorage.getItem(STORAGE_KEY));
  memorySessions = parsed;
  return parsed;
}

function writeSessions(next: StreamSession[]) {
  memorySessions = next;
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

function makeSessionId() {
  const seed = Math.random().toString(36).slice(2, 7);
  return `session-${Date.now().toString(36)}-${seed}`;
}

export function listAllStreamSessions(): StreamSession[] {
  return readSessions().slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function listActiveStreamSessions(): StreamSession[] {
  return listAllStreamSessions().filter((session) => session.status === "prelive" || session.status === "live");
}

export function getStreamSession(sessionId: string): StreamSession | null {
  return readSessions().find((session) => session.sessionId === sessionId) ?? null;
}

export function createStreamSession(input: CreateStreamSessionInput): StreamSession {
  const now = new Date();
  const startsAt = input.startsAt ?? new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const created: StreamSession = {
    sessionId: makeSessionId(),
    hostUserId: input.hostUserId,
    title: input.title,
    status: "prelive",
    createdAt: now.toISOString(),
    startsAt,
    description: input.description,
    category: input.category,
    thumbnail: input.thumbnail ?? "/image/thumbnail/thumbnail_5.png",
    hostName: input.hostName ?? "あなたのチャンネル",
    participationType: input.participationType ?? "First-come",
    slotsTotal: input.slotsTotal ?? 10,
    slotsLeft: input.slotsTotal ?? 10,
  };

  writeSessions([created, ...readSessions()]);
  return created;
}

export function updateStreamSession(sessionId: string, patch: Partial<StreamSession>): StreamSession | null {
  const current = readSessions();
  let updated: StreamSession | null = null;

  const next = current.map((session) => {
    if (session.sessionId !== sessionId) return session;
    updated = { ...session, ...patch, sessionId: session.sessionId };
    return updated;
  });

  if (!updated) return null;
  writeSessions(next);
  return updated;
}

export function setStreamSessionStatus(sessionId: string, status: StreamSessionStatus) {
  return updateStreamSession(sessionId, { status });
}

export function subscribeStreamSessions(onUpdate: () => void): () => void {
  if (!isBrowser()) return () => undefined;

  const handler = () => onUpdate();
  window.addEventListener(UPDATE_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(UPDATE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
