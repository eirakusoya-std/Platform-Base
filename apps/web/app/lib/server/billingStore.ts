import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@vercel/kv";

const kv = createClient({
  url: (process.env.KV_REST_API_URL ?? process.env.STORAGE_REST_API_URL) as string,
  token: (process.env.KV_REST_API_TOKEN ?? process.env.STORAGE_REST_API_TOKEN) as string,
});
import type {
  BillingProvider,
  BillingSubscription,
  PaymentEvent,
  PaymentEventStatus,
  SessionUser,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../apiTypes";

type BillingStoreFile = {
  subscriptions: BillingSubscription[];
  paymentEvents: PaymentEvent[];
};

const USE_KV = Boolean(process.env.KV_REST_API_URL ?? process.env.STORAGE_REST_API_URL);
const KV_KEY = "billing:store";
const DATA_DIR = process.env.VERCEL
  ? "/tmp"
  : path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "billing-store.json");
const SEED_FILE = process.env.VERCEL
  ? path.join(process.cwd(), "data", "billing-store.json")
  : null;
const DEFAULT_STORE: BillingStoreFile = { subscriptions: [], paymentEvents: [] };

let writeQueue: Promise<unknown> = Promise.resolve();

function cloneStore(store: BillingStoreFile): BillingStoreFile {
  return {
    subscriptions: [...store.subscriptions],
    paymentEvents: [...store.paymentEvents],
  };
}

function makeSubscriptionId() {
  return `sub_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
}

function makePaymentEventId() {
  return `payevt_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
}

function normalizeSubscription(entry: Partial<BillingSubscription>): BillingSubscription | null {
  if (
    typeof entry.subscriptionId !== "string" ||
    typeof entry.userId !== "string" ||
    typeof entry.provider !== "string" ||
    typeof entry.plan !== "string" ||
    typeof entry.status !== "string" ||
    typeof entry.cancelAtPeriodEnd !== "boolean" ||
    typeof entry.createdAt !== "string" ||
    typeof entry.updatedAt !== "string"
  ) {
    return null;
  }

  const provider: BillingProvider = entry.provider === "stripe" ? "stripe" : "mock";
  const plan: SubscriptionPlan =
    entry.plan === "premium" ? "premium" : entry.plan === "supporter" ? "supporter" : "free";
  const status: SubscriptionStatus =
    entry.status === "trialing" || entry.status === "active" || entry.status === "past_due" || entry.status === "canceled"
      ? entry.status
      : "inactive";

  return {
    subscriptionId: entry.subscriptionId,
    userId: entry.userId,
    provider,
    plan,
    status,
    cancelAtPeriodEnd: entry.cancelAtPeriodEnd,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    currentPeriodEnd: typeof entry.currentPeriodEnd === "string" ? entry.currentPeriodEnd : undefined,
    checkoutUrl: typeof entry.checkoutUrl === "string" ? entry.checkoutUrl : undefined,
    providerCustomerId: typeof entry.providerCustomerId === "string" ? entry.providerCustomerId : undefined,
    providerSubscriptionId: typeof entry.providerSubscriptionId === "string" ? entry.providerSubscriptionId : undefined,
    checkoutSessionId: typeof entry.checkoutSessionId === "string" ? entry.checkoutSessionId : undefined,
  };
}

function normalizePaymentEvent(entry: Partial<PaymentEvent>): PaymentEvent | null {
  if (
    typeof entry.eventId !== "string" ||
    typeof entry.provider !== "string" ||
    typeof entry.providerEventId !== "string" ||
    typeof entry.type !== "string" ||
    typeof entry.status !== "string" ||
    typeof entry.createdAt !== "string" ||
    typeof entry.summary !== "string"
  ) {
    return null;
  }

  const provider: BillingProvider = entry.provider === "stripe" ? "stripe" : "mock";
  const status: PaymentEventStatus =
    entry.status === "processed" || entry.status === "failed" ? entry.status : "received";

  return {
    eventId: entry.eventId,
    provider,
    providerEventId: entry.providerEventId,
    type: entry.type,
    status,
    createdAt: entry.createdAt,
    summary: entry.summary,
    relatedUserId: typeof entry.relatedUserId === "string" ? entry.relatedUserId : undefined,
    relatedSubscriptionId: typeof entry.relatedSubscriptionId === "string" ? entry.relatedSubscriptionId : undefined,
    errorMessage: typeof entry.errorMessage === "string" ? entry.errorMessage : undefined,
  };
}

function parseStoreFile(raw: string): BillingStoreFile {
  const parsed = JSON.parse(raw) as Partial<BillingStoreFile>;
  return {
    subscriptions: Array.isArray(parsed.subscriptions)
      ? parsed.subscriptions.map((entry) => normalizeSubscription(entry as Partial<BillingSubscription>)).filter((entry): entry is BillingSubscription => entry != null)
      : [],
    paymentEvents: Array.isArray(parsed.paymentEvents)
      ? parsed.paymentEvents.map((entry) => normalizePaymentEvent(entry as Partial<PaymentEvent>)).filter((entry): entry is PaymentEvent => entry != null)
      : [],
  };
}

async function ensureStoreFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    let seedData = JSON.stringify(DEFAULT_STORE, null, 2);
    if (SEED_FILE) {
      try {
        seedData = await readFile(SEED_FILE, "utf8");
      } catch {
        // seed file not readable, use DEFAULT_STORE
      }
    }
    await writeFile(STORE_FILE, seedData, "utf8");
  }
}

async function readStore(): Promise<BillingStoreFile> {
  if (USE_KV) {
    const stored = await kv.get<BillingStoreFile>(KV_KEY);
    if (stored) {
      try { return parseStoreFile(JSON.stringify(stored)); } catch { return cloneStore(DEFAULT_STORE); }
    }
    const seedPath = path.join(process.cwd(), "data", "billing-store.json");
    try {
      const seed = parseStoreFile(await readFile(seedPath, "utf8"));
      await kv.set(KV_KEY, seed);
      return seed;
    } catch {
      return cloneStore(DEFAULT_STORE);
    }
  }

  await ensureStoreFile();
  const raw = await readFile(STORE_FILE, "utf8");
  try { return parseStoreFile(raw); } catch { return cloneStore(DEFAULT_STORE); }
}

async function mutateStore<T>(mutator: (store: BillingStoreFile) => Promise<T> | T): Promise<T> {
  const run = async () => {
    const store = await readStore();
    const nextStore = cloneStore(store);
    const result = await mutator(nextStore);
    if (USE_KV) {
      await kv.set(KV_KEY, nextStore);
    } else {
      await writeFile(STORE_FILE, JSON.stringify(nextStore, null, 2), "utf8");
    }
    return result;
  };

  const task = writeQueue.then(run, run);
  writeQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

export function getPlanRank(plan: SubscriptionPlan) {
  if (plan === "premium") return 2;
  if (plan === "supporter") return 1;
  return 0;
}

export function canAccessPlan(currentPlan: SubscriptionPlan, requiredPlan: SubscriptionPlan) {
  return getPlanRank(currentPlan) >= getPlanRank(requiredPlan);
}

export async function listSubscriptionsForUser(userId: string) {
  const store = await readStore();
  return store.subscriptions.filter((entry) => entry.userId === userId).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getCurrentSubscriptionForUser(userId: string) {
  const subscriptions = await listSubscriptionsForUser(userId);
  return subscriptions.find((entry) => entry.status !== "canceled") ?? subscriptions[0] ?? null;
}

export async function getEffectivePlanForUser(userId: string): Promise<SubscriptionPlan> {
  const subscription = await getCurrentSubscriptionForUser(userId);
  if (!subscription) return "free";
  if (subscription.status === "active" || subscription.status === "trialing") {
    return subscription.plan;
  }
  return "free";
}

export async function attachBillingState<T extends SessionUser | null>(user: T): Promise<T> {
  if (!user) return user;
  const current = await getCurrentSubscriptionForUser(user.id);
  const plan = current && (current.status === "active" || current.status === "trialing") ? current.plan : "free";
  return {
    ...user,
    plan,
    subscriptionStatus: current?.status ?? "inactive",
    subscriptionRenewsAt: current?.currentPeriodEnd,
  } as T;
}

export async function createPendingSubscription(input: {
  userId: string;
  provider: BillingProvider;
  plan: Exclude<SubscriptionPlan, "free">;
  checkoutUrl?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  checkoutSessionId?: string;
}) {
  return mutateStore((store) => {
    const now = new Date().toISOString();
    const next: BillingSubscription = {
      subscriptionId: makeSubscriptionId(),
      userId: input.userId,
      provider: input.provider,
      plan: input.plan,
      status: "inactive",
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
      checkoutUrl: input.checkoutUrl,
      providerCustomerId: input.providerCustomerId,
      providerSubscriptionId: input.providerSubscriptionId,
      checkoutSessionId: input.checkoutSessionId,
    };
    store.subscriptions.unshift(next);
    return next;
  });
}

export async function activateMockSubscription(userId: string, plan: Exclude<SubscriptionPlan, "free">) {
  return mutateStore((store) => {
    const now = new Date().toISOString();
    for (const subscription of store.subscriptions) {
      if (subscription.userId === userId && subscription.status !== "canceled") {
        subscription.status = "canceled";
        subscription.updatedAt = now;
        subscription.cancelAtPeriodEnd = false;
      }
    }

    const next: BillingSubscription = {
      subscriptionId: makeSubscriptionId(),
      userId,
      provider: "mock",
      plan,
      status: "active",
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    store.subscriptions.unshift(next);
    store.paymentEvents.unshift({
      eventId: makePaymentEventId(),
      provider: "mock",
      providerEventId: `mock_checkout_${next.subscriptionId}`,
      type: "checkout.session.completed",
      status: "processed",
      createdAt: now,
      summary: `Mock subscription activated for ${plan}`,
      relatedUserId: userId,
      relatedSubscriptionId: next.subscriptionId,
    });
    return next;
  });
}

export async function cancelSubscriptionForUser(userId: string, subscriptionId: string) {
  return mutateStore((store) => {
    const subscription = store.subscriptions.find((entry) => entry.subscriptionId === subscriptionId && entry.userId === userId);
    if (!subscription) return null;
    subscription.cancelAtPeriodEnd = true;
    subscription.status = subscription.provider === "mock" ? "canceled" : subscription.status;
    subscription.updatedAt = new Date().toISOString();
    return subscription;
  });
}

export async function logPaymentEvent(input: {
  provider: BillingProvider;
  providerEventId: string;
  type: string;
  status?: PaymentEventStatus;
  summary: string;
  relatedUserId?: string;
  relatedSubscriptionId?: string;
  errorMessage?: string;
}) {
  return mutateStore((store) => {
    const next: PaymentEvent = {
      eventId: makePaymentEventId(),
      provider: input.provider,
      providerEventId: input.providerEventId,
      type: input.type,
      status: input.status ?? "received",
      createdAt: new Date().toISOString(),
      summary: input.summary,
      relatedUserId: input.relatedUserId,
      relatedSubscriptionId: input.relatedSubscriptionId,
      errorMessage: input.errorMessage,
    };
    store.paymentEvents.unshift(next);
    return next;
  });
}

export async function markSubscriptionStatusByProviderId(input: {
  providerSubscriptionId?: string;
  checkoutSessionId?: string;
  userId?: string;
  plan?: SubscriptionPlan;
  providerCustomerId?: string;
  status: SubscriptionStatus;
  provider: BillingProvider;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}) {
  return mutateStore((store) => {
    const match = store.subscriptions.find((entry) =>
      (input.providerSubscriptionId && entry.providerSubscriptionId === input.providerSubscriptionId)
      || (input.checkoutSessionId && entry.checkoutSessionId === input.checkoutSessionId)
      || (input.userId && entry.userId === input.userId && entry.provider === input.provider && entry.status !== "canceled"),
    );

    const now = new Date().toISOString();

    if (match) {
      match.status = input.status;
      match.updatedAt = now;
      match.currentPeriodEnd = input.currentPeriodEnd ?? match.currentPeriodEnd;
      match.cancelAtPeriodEnd = input.cancelAtPeriodEnd ?? match.cancelAtPeriodEnd;
      match.providerCustomerId = input.providerCustomerId ?? match.providerCustomerId;
      match.providerSubscriptionId = input.providerSubscriptionId ?? match.providerSubscriptionId;
      if (input.plan) match.plan = input.plan;
      return match;
    }

    if (!input.userId || !input.plan) return null;

    const next: BillingSubscription = {
      subscriptionId: makeSubscriptionId(),
      userId: input.userId,
      provider: input.provider,
      plan: input.plan,
      status: input.status,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      createdAt: now,
      updatedAt: now,
      currentPeriodEnd: input.currentPeriodEnd,
      providerCustomerId: input.providerCustomerId,
      providerSubscriptionId: input.providerSubscriptionId,
      checkoutSessionId: input.checkoutSessionId,
    };
    store.subscriptions.unshift(next);
    return next;
  });
}

export async function listRecentPaymentEvents(limit = 20) {
  const store = await readStore();
  return store.paymentEvents.slice(0, limit);
}

export async function listPaymentEventsForUser(userId: string, limit = 20) {
  const store = await readStore();
  return store.paymentEvents.filter((entry) => entry.relatedUserId === userId).slice(0, limit);
}
