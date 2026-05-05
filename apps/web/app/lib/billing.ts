"use client";

// SOLID: I（クライアントが必要なフィールドだけ依存できるよう戻り値型を明示）
import type {
  BillingSubscription,
  CreateCheckoutInput,
  CreateCheckoutResponse,
  CreateTicketCheckoutInput,
  CreateTicketCheckoutResponse,
  PaymentEvent,
  TicketPurchase,
} from "./apiTypes";

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

export async function listBillingSubscriptions() {
  return requestJson<{ subscriptions: BillingSubscription[]; paymentEvents: PaymentEvent[] }>("/api/billing/subscriptions");
}

export async function createCheckout(input: CreateCheckoutInput) {
  return requestJson<CreateCheckoutResponse>("/api/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function cancelBillingSubscription(subscriptionId: string) {
  return requestJson<{ subscription: BillingSubscription | null }>(`/api/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: "POST",
  });
}

export async function createTicketCheckout(input: CreateTicketCheckoutInput) {
  return requestJson<CreateTicketCheckoutResponse>("/api/billing/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listTicketPurchases() {
  return requestJson<{ purchases: TicketPurchase[] }>("/api/billing/tickets");
}
