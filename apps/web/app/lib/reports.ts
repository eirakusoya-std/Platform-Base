"use client";

import type { CreateReportInput, ReportRecord } from "./apiTypes";

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

export async function listReports() {
  return requestJson<{ reports: ReportRecord[] }>("/api/reports");
}

export async function createUserReport(input: CreateReportInput) {
  return requestJson<{ report: ReportRecord }>("/api/reports", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
