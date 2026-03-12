"use client";

import type { CreateMonitoringEventInput, MonitoringSummary } from "./apiTypes";

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
  if (!response.ok) throw new Error(payload?.error ?? "Request failed");
  if (!payload) throw new Error("Empty response");
  return payload;
}

export async function reportMonitoringEvent(input: CreateMonitoringEventInput) {
  return requestJson("/api/monitoring/events", {
    method: "POST",
    body: JSON.stringify(input),
    keepalive: true,
  });
}

export async function getMonitoringSummary() {
  return requestJson<{ summary: MonitoringSummary }>("/api/monitoring/events");
}
