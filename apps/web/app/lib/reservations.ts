"use client";

import type { CreateReservationInput, Reservation } from "./apiTypes";
import { notifyStreamSessionsUpdated } from "./streamSessions";

const UPDATE_EVENT = "aiment-reservations-updated";
const BROADCAST_CHANNEL = "aiment-reservations";

function emitUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));

  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL);
    channel.postMessage("updated");
    channel.close();
  }

  notifyStreamSessionsUpdated();
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

export async function listMyReservations(): Promise<Reservation[]> {
  const payload = await requestJson<{ reservations: Reservation[] }>("/api/reservations");
  return payload.reservations;
}

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const payload = await requestJson<{ reservation: Reservation }>("/api/reservations", {
    method: "POST",
    body: JSON.stringify(input),
  });
  emitUpdate();
  return payload.reservation;
}

export async function cancelReservation(reservationId: string): Promise<Reservation> {
  const payload = await requestJson<{ reservation: Reservation }>(`/api/reservations/${encodeURIComponent(reservationId)}`, {
    method: "DELETE",
  });
  emitUpdate();
  return payload.reservation;
}

export function subscribeReservations(onUpdate: () => void): () => void {
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
