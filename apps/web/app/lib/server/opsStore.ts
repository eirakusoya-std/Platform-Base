import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ConsentRecord,
  CreateMonitoringEventInput,
  CreateReportInput,
  MonitoringEvent,
  MonitoringSummary,
  ReportRecord,
  SessionUser,
} from "../apiTypes";

type OpsStoreFile = {
  consents: ConsentRecord[];
  reports: ReportRecord[];
  monitoringEvents: MonitoringEvent[];
};

const DATA_DIR = process.env.VERCEL
  ? "/tmp"
  : path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "ops-store.json");
const SEED_FILE = process.env.VERCEL
  ? path.join(process.cwd(), "data", "ops-store.json")
  : null;
const DEFAULT_STORE: OpsStoreFile = { consents: [], reports: [], monitoringEvents: [] };

let writeQueue: Promise<unknown> = Promise.resolve();

function cloneStore(store: OpsStoreFile): OpsStoreFile {
  return {
    consents: [...store.consents],
    reports: [...store.reports],
    monitoringEvents: [...store.monitoringEvents],
  };
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
}

function parseStoreFile(raw: string): OpsStoreFile {
  const parsed = JSON.parse(raw) as Partial<OpsStoreFile>;
  return {
    consents: Array.isArray(parsed.consents) ? parsed.consents as ConsentRecord[] : [],
    reports: Array.isArray(parsed.reports) ? parsed.reports as ReportRecord[] : [],
    monitoringEvents: Array.isArray(parsed.monitoringEvents) ? parsed.monitoringEvents as MonitoringEvent[] : [],
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

async function readStore(): Promise<OpsStoreFile> {
  await ensureStoreFile();
  const raw = await readFile(STORE_FILE, "utf8");
  try { return parseStoreFile(raw); } catch { return cloneStore(DEFAULT_STORE); }
}

async function mutateStore<T>(mutator: (store: OpsStoreFile) => Promise<T> | T): Promise<T> {
  const run = async () => {
    const store = await readStore();
    const nextStore = cloneStore(store);
    const result = await mutator(nextStore);
    await writeFile(STORE_FILE, JSON.stringify(nextStore, null, 2), "utf8");
    return result;
  };

  const task = writeQueue.then(run, run);
  writeQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

export async function recordConsent(userId: string, input: { version: string; source: "signup" | "account"; termsAcceptedAt: string; privacyAcceptedAt: string }) {
  return mutateStore((store) => {
    const next: ConsentRecord = {
      consentId: makeId("consent"),
      userId,
      version: input.version,
      source: input.source,
      termsAcceptedAt: input.termsAcceptedAt,
      privacyAcceptedAt: input.privacyAcceptedAt,
    };
    store.consents.unshift(next);
    return next;
  });
}

export async function listConsentsForUser(userId: string) {
  const store = await readStore();
  return store.consents.filter((entry) => entry.userId === userId).sort((a, b) => (a.termsAcceptedAt < b.termsAcceptedAt ? 1 : -1));
}

export async function createReport(actor: SessionUser, input: CreateReportInput) {
  if (!input.targetId.trim()) throw new Error("targetId is required");
  if (!input.details.trim()) throw new Error("details are required");

  return mutateStore((store) => {
    const next: ReportRecord = {
      reportId: makeId("report"),
      reporterUserId: actor.id,
      reporterName: actor.name,
      targetType: input.targetType,
      targetId: input.targetId.trim(),
      category: input.category,
      details: input.details.trim(),
      status: "open",
      createdAt: new Date().toISOString(),
    };
    store.reports.unshift(next);
    return next;
  });
}

export async function listReportsForUser(userId: string) {
  const store = await readStore();
  return store.reports.filter((entry) => entry.reporterUserId === userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function recordMonitoringEvent(input: CreateMonitoringEventInput) {
  return mutateStore((store) => {
    const next: MonitoringEvent = {
      eventId: makeId("metric"),
      source: input.source,
      level: input.level,
      code: input.code,
      message: input.message,
      createdAt: new Date().toISOString(),
      meta: input.meta,
    };
    store.monitoringEvents.unshift(next);
    store.monitoringEvents = store.monitoringEvents.slice(0, 500);
    return next;
  });
}

export async function getMonitoringSummary(): Promise<MonitoringSummary> {
  const store = await readStore();
  const recentEvents = store.monitoringEvents.slice(0, 25);
  const connectionAttempts = store.monitoringEvents.filter((entry) => entry.code === "webrtc.connect.attempt").length;
  const connectionFailures = store.monitoringEvents.filter((entry) => entry.code === "webrtc.connect.failed").length;
  const paymentFailures = store.monitoringEvents.filter((entry) => entry.code === "billing.payment.failed").length;
  const serverErrors = store.monitoringEvents.filter((entry) => entry.source === "api" && entry.level === "error").length;

  return {
    connectionAttempts,
    connectionFailures,
    connectionFailureRate: connectionAttempts > 0 ? Number(((connectionFailures / connectionAttempts) * 100).toFixed(1)) : 0,
    paymentFailures,
    serverErrors,
    recentEvents,
  };
}
