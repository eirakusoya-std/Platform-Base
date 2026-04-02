import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type {
  AuthProvider,
  CreateReservationInput,
  CreateStreamSessionInput,
  Reservation,
  ReservationStatus,
  ReservationType,
  LoginInput,
  SessionUser,
  SignupInput,
  StreamSession,
  StreamSessionStatus,
  UpdateStreamSessionInput,
} from "../apiTypes";
import { canAccessPlan, getEffectivePlanForUser } from "./billingStore";

type StoredUser = SessionUser & {
  passwordHash?: string;
  pendingEmailCode?: string;
  pendingPhoneCode?: string;
  verificationRequestedAt?: string;
};

type StoreFile = {
  users: StoredUser[];
  streamSessions: StreamSession[];
  reservations: Reservation[];
};

const LEGACY_USER_DEFAULTS: Record<string, Partial<StoredUser>> = {
  "listener-demo": {
    email: "listener-demo@aiment.local",
    authProvider: "password",
    createdAt: new Date("2026-03-10T00:00:00.000Z").toISOString(),
    termsAcceptedAt: new Date("2026-03-10T00:00:00.000Z").toISOString(),
    privacyAcceptedAt: new Date("2026-03-10T00:00:00.000Z").toISOString(),
    emailVerifiedAt: new Date("2026-03-10T00:00:00.000Z").toISOString(),
  },
  "vtuber-demo": {
    email: "vtuber-demo@aiment.local",
    authProvider: "password",
    createdAt: new Date("2026-03-10T00:00:00.000Z").toISOString(),
    termsAcceptedAt: new Date("2026-03-10T00:00:00.000Z").toISOString(),
    privacyAcceptedAt: new Date("2026-03-10T00:00:00.000Z").toISOString(),
    emailVerifiedAt: new Date("2026-03-10T00:00:00.000Z").toISOString(),
    phoneNumber: "09000000000",
    phoneVerifiedAt: new Date("2026-03-10T00:00:00.000Z").toISOString(),
    channelName: "Demo VTuber",
  },
};

// ---------------------------------------------------------------------------
// Storage backend selection
// ---------------------------------------------------------------------------

const USE_NEON = Boolean(process.env.DATABASE_URL);

// ---------------------------------------------------------------------------
// File-based store (local dev fallback)
// ---------------------------------------------------------------------------

const DATA_DIR = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "runtime-store.json");
const SEED_FILE = process.env.VERCEL ? path.join(process.cwd(), "data", "runtime-store.json") : null;

const DEFAULT_STORE: StoreFile = {
  users: [],
  streamSessions: [],
  reservations: [],
};

let writeQueue: Promise<unknown> = Promise.resolve();

// ---------------------------------------------------------------------------
// Helper / normalizer functions (shared by both backends)
// ---------------------------------------------------------------------------

function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sanitizeUser(user: StoredUser): SessionUser {
  const {
    passwordHash: _passwordHash,
    pendingEmailCode: _pendingEmailCode,
    pendingPhoneCode: _pendingPhoneCode,
    verificationRequestedAt: _verificationRequestedAt,
    ...safeUser
  } = user;
  return safeUser;
}

function normalizeReservation(entry: Partial<Reservation>): Reservation | null {
  if (
    typeof entry.reservationId !== "string" ||
    typeof entry.sessionId !== "string" ||
    typeof entry.userId !== "string" ||
    typeof entry.userName !== "string" ||
    typeof entry.createdAt !== "string"
  ) {
    return null;
  }

  const status: ReservationStatus = entry.status === "cancelled" ? "cancelled" : "reserved";
  const type: ReservationType = entry.type === "speaker" ? "speaker" : "listener";

  return {
    reservationId: entry.reservationId,
    sessionId: entry.sessionId,
    userId: entry.userId,
    userName: entry.userName,
    createdAt: entry.createdAt,
    status,
    type,
    cancelledAt: typeof entry.cancelledAt === "string" ? entry.cancelledAt : undefined,
  };
}

function normalizeStreamSession(entry: Partial<StreamSession>): StreamSession | null {
  if (
    typeof entry.sessionId !== "string" ||
    typeof entry.hostUserId !== "string" ||
    typeof entry.title !== "string" ||
    typeof entry.createdAt !== "string" ||
    typeof entry.startsAt !== "string" ||
    typeof entry.description !== "string" ||
    typeof entry.category !== "string" ||
    typeof entry.thumbnail !== "string" ||
    typeof entry.hostName !== "string"
  ) {
    return null;
  }

  const status: StreamSessionStatus =
    entry.status === "live" || entry.status === "ended" ? entry.status : "prelive";
  const participationType = entry.participationType === "Lottery" ? "Lottery" : "First-come";
  const slotsTotal =
    typeof entry.slotsTotal === "number" && entry.slotsTotal > 0 ? entry.slotsTotal : 10;
  const slotsLeft =
    typeof entry.slotsLeft === "number" && entry.slotsLeft >= 0
      ? Math.min(entry.slotsLeft, slotsTotal)
      : slotsTotal;
  const speakerSlotsTotal =
    typeof entry.speakerSlotsTotal === "number" && entry.speakerSlotsTotal > 0
      ? entry.speakerSlotsTotal
      : 5;
  const speakerSlotsLeft =
    typeof entry.speakerSlotsLeft === "number" && entry.speakerSlotsLeft >= 0
      ? Math.min(entry.speakerSlotsLeft, speakerSlotsTotal)
      : speakerSlotsTotal;

  return {
    sessionId: entry.sessionId,
    hostUserId: entry.hostUserId,
    hostAvatarUrl:
      typeof entry.hostAvatarUrl === "string" ? entry.hostAvatarUrl : undefined,
    hostChannelName:
      typeof entry.hostChannelName === "string" ? entry.hostChannelName : undefined,
    title: entry.title,
    status,
    createdAt: entry.createdAt,
    startsAt: entry.startsAt,
    description: entry.description,
    category: entry.category,
    thumbnail: entry.thumbnail,
    hostName: entry.hostName,
    participationType,
    requiredPlan:
      entry.requiredPlan === "premium"
        ? "premium"
        : entry.requiredPlan === "supporter"
          ? "supporter"
          : "free",
    reservationRequired: entry.reservationRequired === true,
    slotsTotal,
    slotsLeft,
    speakerSlotsTotal,
    speakerSlotsLeft,
    speakerRequiredPlan:
      entry.speakerRequiredPlan === "premium"
        ? "premium"
        : entry.speakerRequiredPlan === "supporter"
          ? "supporter"
          : "free",
    preferredVideoDeviceId:
      typeof entry.preferredVideoDeviceId === "string" ? entry.preferredVideoDeviceId : undefined,
    preferredVideoLabel:
      typeof entry.preferredVideoLabel === "string" ? entry.preferredVideoLabel : undefined,
  };
}

function normalizeStoredUser(entry: Partial<StoredUser>): StoredUser | null {
  if (typeof entry.id !== "string" || typeof entry.name !== "string") return null;
  const role =
    entry.role === "vtuber" ? "vtuber" : entry.role === "listener" ? "listener" : null;
  if (!role) return null;

  const legacyDefaults = LEGACY_USER_DEFAULTS[entry.id] ?? {};
  const createdAt =
    typeof entry.createdAt === "string"
      ? entry.createdAt
      : (legacyDefaults.createdAt ?? new Date().toISOString());
  const emailRaw =
    typeof entry.email === "string" && entry.email.trim() ? entry.email : legacyDefaults.email;
  const email =
    typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : `${entry.id}@aiment.local`;

  return {
    id: entry.id,
    name: entry.name,
    role,
    email,
    authProvider:
      (entry.authProvider === "google" ||
      entry.authProvider === "google_demo" ||
      entry.authProvider === "password"
        ? entry.authProvider
        : legacyDefaults.authProvider) ?? "password",
    createdAt,
    lastLoginAt: typeof entry.lastLoginAt === "string" ? entry.lastLoginAt : undefined,
    channelName:
      typeof entry.channelName === "string" ? entry.channelName : legacyDefaults.channelName,
    bio: typeof entry.bio === "string" ? entry.bio : undefined,
    avatarUrl: typeof entry.avatarUrl === "string" ? entry.avatarUrl : undefined,
    headerUrl: typeof entry.headerUrl === "string" ? entry.headerUrl : undefined,
    phoneNumber:
      typeof entry.phoneNumber === "string" ? entry.phoneNumber : legacyDefaults.phoneNumber,
    emailVerifiedAt:
      typeof entry.emailVerifiedAt === "string"
        ? entry.emailVerifiedAt
        : legacyDefaults.emailVerifiedAt,
    phoneVerifiedAt:
      typeof entry.phoneVerifiedAt === "string"
        ? entry.phoneVerifiedAt
        : legacyDefaults.phoneVerifiedAt,
    termsAcceptedAt:
      typeof entry.termsAcceptedAt === "string"
        ? entry.termsAcceptedAt
        : legacyDefaults.termsAcceptedAt,
    privacyAcceptedAt:
      typeof entry.privacyAcceptedAt === "string"
        ? entry.privacyAcceptedAt
        : legacyDefaults.privacyAcceptedAt,
    passwordHash: typeof entry.passwordHash === "string" ? entry.passwordHash : undefined,
    pendingEmailCode:
      typeof entry.pendingEmailCode === "string" ? entry.pendingEmailCode : undefined,
    pendingPhoneCode:
      typeof entry.pendingPhoneCode === "string" ? entry.pendingPhoneCode : undefined,
    verificationRequestedAt:
      typeof entry.verificationRequestedAt === "string"
        ? entry.verificationRequestedAt
        : undefined,
  };
}

function makeSessionId() {
  return `session-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
}

function makeUserId(role: SessionUser["role"]) {
  return `${role}-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
}

function makeReservationId() {
  return `reservation-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
}

function normalizeStartsAt(startsAt?: string) {
  if (!startsAt) return new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const parsed = new Date(startsAt);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid startsAt");
  return parsed.toISOString();
}

function validateTransition(current: StreamSessionStatus, next: StreamSessionStatus) {
  if (current === next) return;
  if (current === "prelive" && (next === "live" || next === "ended")) return;
  if (current === "live" && next === "ended") return;
  throw new Error(`Invalid transition: ${current} -> ${next}`);
}

function requireVerifiedVtuber(actor: SessionUser) {
  if (actor.role !== "vtuber") throw new Error("Only VTuber accounts can perform this action");
  if (!actor.phoneVerifiedAt) throw new Error("VTuber registration requires verified phone");
}


function makeVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ---------------------------------------------------------------------------
// Neon backend
// ---------------------------------------------------------------------------

let _sql: NeonQueryFunction<false, false> | null = null;

function getDb(): NeonQueryFunction<false, false> {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL!);
  }
  return _sql;
}

let _schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!_schemaReady) {
    _schemaReady = initSchema();
  }
  return _schemaReady;
}

async function initSchema() {
  const db = getDb();
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT NOT NULL,
      auth_provider TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_login_at TEXT,
      channel_name TEXT,
      bio TEXT,
      avatar_url TEXT,
      header_url TEXT,
      phone_number TEXT,
      email_verified_at TEXT,
      phone_verified_at TEXT,
      terms_accepted_at TEXT,
      privacy_accepted_at TEXT,
      password_hash TEXT,
      pending_email_code TEXT,
      pending_phone_code TEXT,
      verification_requested_at TEXT
    )
  `;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS header_url TEXT`;
  await db`
    CREATE TABLE IF NOT EXISTS stream_sessions (
      session_id TEXT PRIMARY KEY,
      host_user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'prelive',
      created_at TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      thumbnail TEXT NOT NULL,
      host_name TEXT NOT NULL,
      participation_type TEXT NOT NULL DEFAULT 'First-come',
      required_plan TEXT NOT NULL DEFAULT 'free',
      reservation_required BOOLEAN NOT NULL DEFAULT FALSE,
      slots_total INTEGER NOT NULL DEFAULT 10,
      slots_left INTEGER NOT NULL DEFAULT 10,
      speaker_slots_total INTEGER NOT NULL DEFAULT 5,
      speaker_slots_left INTEGER NOT NULL DEFAULT 5,
      speaker_required_plan TEXT NOT NULL DEFAULT 'free',
      preferred_video_device_id TEXT,
      preferred_video_label TEXT
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS reservations (
      reservation_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'reserved',
      type TEXT NOT NULL DEFAULT 'listener',
      cancelled_at TEXT
    )
  `;
}

// Row → TypeScript type converters

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToStoredUser(row: any): StoredUser {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as SessionUser["role"],
    email: row.email as string,
    authProvider: row.auth_provider as AuthProvider,
    createdAt: row.created_at as string,
    lastLoginAt: row.last_login_at ?? undefined,
    channelName: row.channel_name ?? undefined,
    bio: row.bio ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    headerUrl: row.header_url ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    emailVerifiedAt: row.email_verified_at ?? undefined,
    phoneVerifiedAt: row.phone_verified_at ?? undefined,
    termsAcceptedAt: row.terms_accepted_at ?? undefined,
    privacyAcceptedAt: row.privacy_accepted_at ?? undefined,
    passwordHash: row.password_hash ?? undefined,
    pendingEmailCode: row.pending_email_code ?? undefined,
    pendingPhoneCode: row.pending_phone_code ?? undefined,
    verificationRequestedAt: row.verification_requested_at ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToStreamSession(row: any): StreamSession {
  return {
    sessionId: row.session_id as string,
    hostUserId: row.host_user_id as string,
    hostAvatarUrl: row.host_avatar_url ?? undefined,
    hostChannelName: row.host_channel_name ?? undefined,
    title: row.title as string,
    status: row.status as StreamSessionStatus,
    createdAt: row.created_at as string,
    startsAt: row.starts_at as string,
    description: row.description as string,
    category: row.category as string,
    thumbnail: row.thumbnail as string,
    hostName: row.host_name as string,
    participationType: row.participation_type as "First-come" | "Lottery",
    requiredPlan: row.required_plan as "free" | "supporter" | "premium",
    reservationRequired: Boolean(row.reservation_required),
    slotsTotal: Number(row.slots_total),
    slotsLeft: Number(row.slots_left),
    speakerSlotsTotal: Number(row.speaker_slots_total),
    speakerSlotsLeft: Number(row.speaker_slots_left),
    speakerRequiredPlan: row.speaker_required_plan as "free" | "supporter" | "premium",
    preferredVideoDeviceId: row.preferred_video_device_id ?? undefined,
    preferredVideoLabel: row.preferred_video_label ?? undefined,
  };
}

function attachHostFields(
  sessions: StreamSession[],
  users: Pick<StoredUser, "id" | "avatarUrl" | "channelName" | "name">[],
) {
  const byId = new Map(users.map((user) => [user.id, user]));
  return sessions.map((session) => {
    const host = byId.get(session.hostUserId);
    if (!host) return session;
    return {
      ...session,
      hostAvatarUrl: host.avatarUrl,
      hostChannelName: host.channelName ?? host.name,
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToReservation(row: any): Reservation {
  return {
    reservationId: row.reservation_id as string,
    sessionId: row.session_id as string,
    userId: row.user_id as string,
    userName: row.user_name as string,
    createdAt: row.created_at as string,
    status: row.status as ReservationStatus,
    type: row.type as ReservationType,
    cancelledAt: row.cancelled_at ?? undefined,
  };
}

async function neonSyncSessionSlots(sessionId: string) {
  const db = getDb();
  await db`
    UPDATE stream_sessions SET
      slots_left = GREATEST(0, slots_total - (
        SELECT COUNT(*) FROM reservations
        WHERE session_id = ${sessionId} AND status = 'reserved' AND type = 'listener'
      )),
      speaker_slots_left = GREATEST(0, speaker_slots_total - (
        SELECT COUNT(*) FROM reservations
        WHERE session_id = ${sessionId} AND status = 'reserved' AND type = 'speaker'
      ))
    WHERE session_id = ${sessionId}
  `;
}

// ---------------------------------------------------------------------------
// File-based store functions (local dev fallback)
// ---------------------------------------------------------------------------

function cloneStore(store: StoreFile): StoreFile {
  return {
    users: [...store.users],
    streamSessions: [...store.streamSessions],
    reservations: [...store.reservations],
  };
}

function countActiveReservations(store: StoreFile, sessionId: string, type?: ReservationType) {
  return store.reservations.filter(
    (r) => r.sessionId === sessionId && r.status === "reserved" && (type == null || r.type === type),
  ).length;
}

function syncSessionSlots(store: StoreFile) {
  store.streamSessions = store.streamSessions.map((session) => {
    const listenerCount = countActiveReservations(store, session.sessionId, "listener");
    const speakerCount = countActiveReservations(store, session.sessionId, "speaker");
    return {
      ...session,
      slotsLeft: Math.max(0, session.slotsTotal - listenerCount),
      speakerSlotsLeft: Math.max(0, session.speakerSlotsTotal - speakerCount),
    };
  });
}

function findActiveReservation(
  store: StoreFile,
  sessionId: string,
  userId: string,
  type?: ReservationType,
) {
  return store.reservations.find(
    (r) =>
      r.sessionId === sessionId &&
      r.userId === userId &&
      r.status === "reserved" &&
      (type == null || r.type === type),
  );
}

function ensureEmailAvailable(store: StoreFile, email: string, ignoreUserId?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const found = store.users.find(
    (user) =>
      typeof user.email === "string" &&
      user.email.toLowerCase() === normalizedEmail &&
      user.id !== ignoreUserId,
  );
  if (found) throw new Error("This email address is already in use");
}

function ensurePhoneAvailable(store: StoreFile, phoneNumber: string, ignoreUserId?: string) {
  const found = store.users.find(
    (user) => user.phoneNumber === phoneNumber && user.id !== ignoreUserId,
  );
  if (found) throw new Error("This phone number is already registered");
}

function parseStoreFile(raw: string): StoreFile {
  const parsed = JSON.parse(raw) as Partial<StoreFile>;
  const store = {
    users: Array.isArray(parsed.users)
      ? parsed.users
          .map((entry) => normalizeStoredUser(entry as Partial<StoredUser>))
          .filter((entry): entry is StoredUser => entry != null)
      : [],
    streamSessions: Array.isArray(parsed.streamSessions)
      ? parsed.streamSessions
          .map((entry) => normalizeStreamSession(entry as Partial<StreamSession>))
          .filter((entry): entry is StreamSession => entry != null)
      : [],
    reservations: Array.isArray(parsed.reservations)
      ? parsed.reservations
          .map((entry) => normalizeReservation(entry as Partial<Reservation>))
          .filter((entry): entry is Reservation => entry != null)
      : [],
  };
  syncSessionSlots(store);
  return store;
}

async function getSeedStore(): Promise<StoreFile> {
  const seedPath = path.join(process.cwd(), "data", "runtime-store.json");
  try {
    const raw = await readFile(seedPath, "utf8");
    return parseStoreFile(raw);
  } catch {
    return cloneStore(DEFAULT_STORE);
  }
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

async function readStore(): Promise<StoreFile> {
  await ensureStoreFile();
  const raw = await readFile(STORE_FILE, "utf8");
  try {
    return parseStoreFile(raw);
  } catch {
    return cloneStore(DEFAULT_STORE);
  }
}

async function mutateStore<T>(mutator: (store: StoreFile) => Promise<T> | T): Promise<T> {
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

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

export async function resetStore() {
  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    await db`DELETE FROM reservations`;
    await db`DELETE FROM stream_sessions`;
    await db`DELETE FROM users`;
    return;
  }
  const seed = await getSeedStore();
  await writeFile(STORE_FILE, JSON.stringify(seed, null, 2), "utf8");
}

export async function listUsers() {
  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const rows = await db`SELECT * FROM users ORDER BY created_at DESC`;
    return rows.map((r) => sanitizeUser(rowToStoredUser(r)));
  }
  const store = await readStore();
  return store.users.map(sanitizeUser);
}

export async function getUserById(userId: string) {
  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const rows = await db`SELECT * FROM users WHERE id = ${userId}`;
    if (!rows[0]) return null;
    return sanitizeUser(rowToStoredUser(rows[0]));
  }
  const store = await readStore();
  const user = store.users.find((entry) => entry.id === userId);
  return user ? sanitizeUser(user) : null;
}

export async function getUserByEmail(email: string) {
  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();
    const rows = await db`SELECT * FROM users WHERE LOWER(email) = ${normalizedEmail}`;
    if (!rows[0]) return null;
    return sanitizeUser(rowToStoredUser(rows[0]));
  }
  const store = await readStore();
  const normalizedEmail = email.trim().toLowerCase();
  const user = store.users.find(
    (entry) =>
      typeof entry.email === "string" && entry.email.toLowerCase() === normalizedEmail,
  );
  return user ? sanitizeUser(user) : null;
}

async function neonGetStoredUserById(userId: string): Promise<StoredUser | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM users WHERE id = ${userId}`;
  if (!rows[0]) return null;
  return rowToStoredUser(rows[0]);
}

export async function signupUser(input: SignupInput) {
  if (!input.termsAccepted || !input.privacyAccepted) {
    throw new Error("You must agree to the terms and privacy policy");
  }
  if (!input.name.trim()) throw new Error("Display name is required");
  if (!input.email.trim()) throw new Error("Email address is required");
  if (input.provider === "password" && !input.password) throw new Error("Password is required");
  if (input.role === "vtuber" && !input.phoneNumber?.trim())
    throw new Error("Phone number is required for VTuber registration");

  const now = new Date().toISOString();

  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const normalizedEmail = input.email.trim().toLowerCase();

    // Check email uniqueness
    const existing = await db`SELECT id FROM users WHERE LOWER(email) = ${normalizedEmail}`;
    if (existing.length > 0) throw new Error("This email address is already in use");

    if (input.phoneNumber?.trim()) {
      const existingPhone =
        await db`SELECT id FROM users WHERE phone_number = ${input.phoneNumber.trim()}`;
      if (existingPhone.length > 0) throw new Error("This phone number is already registered");
    }

    const id = makeUserId(input.role);
    const passwordHash = input.password ? hashSecret(input.password) : null;
    const emailVerifiedAt = input.provider === "google_demo" ? now : null;

    await db`
      INSERT INTO users (
        id, name, role, email, auth_provider, created_at, last_login_at,
        channel_name, bio, phone_number, terms_accepted_at, privacy_accepted_at,
        password_hash, email_verified_at
      ) VALUES (
        ${id}, ${input.name.trim()}, ${input.role}, ${normalizedEmail}, ${input.provider},
        ${now}, ${now}, ${input.channelName?.trim() || null}, ${input.bio?.trim() || null},
        ${input.phoneNumber?.trim() || null}, ${now}, ${now}, ${passwordHash}, ${emailVerifiedAt}
      )
    `;

    const rows = await db`SELECT * FROM users WHERE id = ${id}`;
    return sanitizeUser(rowToStoredUser(rows[0]));
  }

  return mutateStore((store) => {
    ensureEmailAvailable(store, input.email);
    if (input.phoneNumber?.trim()) {
      ensurePhoneAvailable(store, input.phoneNumber.trim());
    }

    const nextUser: StoredUser = {
      id: makeUserId(input.role),
      name: input.name.trim(),
      role: input.role,
      email: input.email.trim().toLowerCase(),
      authProvider: input.provider,
      createdAt: now,
      lastLoginAt: now,
      channelName: input.channelName?.trim() || undefined,
      bio: input.bio?.trim() || undefined,
      phoneNumber: input.phoneNumber?.trim() || undefined,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      passwordHash: input.password ? hashSecret(input.password) : undefined,
      emailVerifiedAt: input.provider === "google_demo" ? now : undefined,
      phoneVerifiedAt: undefined,
    };

    store.users.unshift(nextUser);
    return sanitizeUser(nextUser);
  });
}

export async function loginUser(input: LoginInput) {
  if (!input.email?.trim()) throw new Error("Email address is required");

  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const normalizedEmail = input.email.trim().toLowerCase();
    const rows = await db`SELECT * FROM users WHERE LOWER(email) = ${normalizedEmail}`;
    if (!rows[0]) throw new Error("Account not found");
    const user = rowToStoredUser(rows[0]);
    if (user.authProvider !== input.provider)
      throw new Error("Use the original sign-in method for this account");
    if (input.provider === "password" && user.passwordHash !== hashSecret(input.password ?? "")) {
      throw new Error("Incorrect email or password");
    }
    const now = new Date().toISOString();
    await db`UPDATE users SET last_login_at = ${now} WHERE id = ${user.id}`;
    return sanitizeUser({ ...user, lastLoginAt: now });
  }

  const store = await readStore();
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = store.users.find(
    (entry) =>
      typeof entry.email === "string" && entry.email.toLowerCase() === normalizedEmail,
  );
  if (!user) throw new Error("Account not found");
  if (user.authProvider !== input.provider)
    throw new Error("Use the original sign-in method for this account");
  if (
    input.provider === "password" &&
    user.passwordHash !== hashSecret(input.password ?? "")
  ) {
    throw new Error("Incorrect email or password");
  }

  return mutateStore((nextStore) => {
    const target = nextStore.users.find((entry) => entry.id === user.id);
    if (!target) throw new Error("Account not found");
    target.lastLoginAt = new Date().toISOString();
    return sanitizeUser(target);
  });
}

export async function googleAuthUser(input: {
  googleSub: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: SessionUser["role"];
}) {
  const now = new Date().toISOString();

  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const normalizedEmail = input.email.trim().toLowerCase();
    const rows = await db`SELECT * FROM users WHERE LOWER(email) = ${normalizedEmail}`;

    if (rows.length > 0) {
      const existing = rowToStoredUser(rows[0]);
      if (existing.authProvider !== "google") {
        throw new Error(
          "このメールアドレスはすでに別の方法で登録されています。元のログイン方法をお使いください。",
        );
      }
      await db`
        UPDATE users SET last_login_at = ${now}, avatar_url = ${input.avatarUrl ?? existing.avatarUrl ?? null}
        WHERE id = ${existing.id}
      `;
      return sanitizeUser({ ...existing, lastLoginAt: now, avatarUrl: input.avatarUrl ?? existing.avatarUrl });
    }

    const id = makeUserId(input.role);
    await db`
      INSERT INTO users (
        id, name, role, email, auth_provider, created_at, last_login_at,
        avatar_url, email_verified_at, terms_accepted_at, privacy_accepted_at
      ) VALUES (
        ${id}, ${input.name.trim()}, ${input.role}, ${normalizedEmail}, 'google',
        ${now}, ${now}, ${input.avatarUrl ?? null}, ${now}, ${now}, ${now}
      )
    `;
    const newRows = await db`SELECT * FROM users WHERE id = ${id}`;
    return sanitizeUser(rowToStoredUser(newRows[0]));
  }

  return mutateStore((store) => {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = store.users.find(
      (u) => typeof u.email === "string" && u.email.toLowerCase() === normalizedEmail,
    );

    if (existing) {
      if (existing.authProvider !== "google") {
        throw new Error(
          "このメールアドレスはすでに別の方法で登録されています。元のログイン方法をお使いください。",
        );
      }
      existing.lastLoginAt = now;
      if (input.avatarUrl) existing.avatarUrl = input.avatarUrl;
      return sanitizeUser(existing);
    }

    const nextUser: StoredUser = {
      id: makeUserId(input.role),
      name: input.name.trim(),
      role: input.role,
      email: normalizedEmail,
      authProvider: "google",
      createdAt: now,
      lastLoginAt: now,
      avatarUrl: input.avatarUrl,
      emailVerifiedAt: now,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
    };

    store.users.unshift(nextUser);
    return sanitizeUser(nextUser);
  });
}

export async function updateAccountProfile(
  userId: string,
  patch: { name?: string; channelName?: string; bio?: string; phoneNumber?: string; avatarUrl?: string; headerUrl?: string },
) {
  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const current = await neonGetStoredUserById(userId);
    if (!current) return null;

    const nextName = patch.name != null ? patch.name.trim() : current.name;
    const nextChannelName = patch.channelName != null ? patch.channelName.trim() || null : current.channelName ?? null;
    const nextBio = patch.bio != null ? patch.bio.trim() || null : current.bio ?? null;
    const nextAvatarUrl = patch.avatarUrl != null ? patch.avatarUrl.trim() || null : current.avatarUrl ?? null;
    const nextHeaderUrl = patch.headerUrl != null ? patch.headerUrl.trim() || null : current.headerUrl ?? null;

    let nextPhoneNumber = current.phoneNumber ?? null;
    let nextPhoneVerifiedAt = current.phoneVerifiedAt ?? null;
    if (patch.phoneNumber != null) {
      const normalized = patch.phoneNumber.trim() || null;
      if (normalized && normalized !== current.phoneNumber) {
        const existing =
          await db`SELECT id FROM users WHERE phone_number = ${normalized} AND id != ${userId}`;
        if (existing.length > 0) throw new Error("This phone number is already registered");
        nextPhoneVerifiedAt = null; // reset verification when phone changes
      }
      nextPhoneNumber = normalized;
    }

    await db`
      UPDATE users SET
        name = ${nextName},
        channel_name = ${nextChannelName},
        bio = ${nextBio},
        avatar_url = ${nextAvatarUrl},
        header_url = ${nextHeaderUrl},
        phone_number = ${nextPhoneNumber},
        phone_verified_at = ${nextPhoneVerifiedAt}
      WHERE id = ${userId}
    `;
    const rows = await db`SELECT * FROM users WHERE id = ${userId}`;
    if (!rows[0]) return null;
    return sanitizeUser(rowToStoredUser(rows[0]));
  }

  return mutateStore((store) => {
    const target = store.users.find((entry) => entry.id === userId);
    if (!target) return null;

    if (patch.name != null) target.name = patch.name.trim();
    if (patch.channelName != null) target.channelName = patch.channelName.trim() || undefined;
    if (patch.bio != null) target.bio = patch.bio.trim() || undefined;
    if (patch.avatarUrl != null) target.avatarUrl = patch.avatarUrl.trim() || undefined;
    if (patch.headerUrl != null) target.headerUrl = patch.headerUrl.trim() || undefined;
    if (patch.phoneNumber != null) {
      const normalized = patch.phoneNumber.trim() || undefined;
      if (normalized !== target.phoneNumber) {
        if (normalized) ensurePhoneAvailable(store, normalized, target.id);
        target.phoneNumber = normalized;
        target.phoneVerifiedAt = undefined;
        delete target.pendingPhoneCode;
      }
    }

    return sanitizeUser(target);
  });
}

export async function requestEmailVerification(userId: string) {
  const code = makeVerificationCode();

  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const rows = await db`SELECT id FROM users WHERE id = ${userId}`;
    if (!rows[0]) throw new Error("Account not found");
    const now = new Date().toISOString();
    await db`UPDATE users SET pending_email_code = ${code}, verification_requested_at = ${now} WHERE id = ${userId}`;
    return { code };
  }

  return mutateStore((store) => {
    const target = store.users.find((entry) => entry.id === userId);
    if (!target) throw new Error("Account not found");
    target.pendingEmailCode = code;
    target.verificationRequestedAt = new Date().toISOString();
    return { code };
  });
}

export async function confirmEmailVerification(userId: string, code: string) {
  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const rows = await db`SELECT * FROM users WHERE id = ${userId}`;
    if (!rows[0]) throw new Error("Account not found");
    const user = rowToStoredUser(rows[0]);
    if (!user.pendingEmailCode || user.pendingEmailCode !== code.trim())
      throw new Error("Invalid verification code");
    const now = new Date().toISOString();
    await db`UPDATE users SET email_verified_at = ${now}, pending_email_code = NULL WHERE id = ${userId}`;
    return sanitizeUser({ ...user, emailVerifiedAt: now, pendingEmailCode: undefined });
  }

  return mutateStore((store) => {
    const target = store.users.find((entry) => entry.id === userId);
    if (!target) throw new Error("Account not found");
    if (!target.pendingEmailCode || target.pendingEmailCode !== code.trim())
      throw new Error("Invalid verification code");
    target.emailVerifiedAt = new Date().toISOString();
    delete target.pendingEmailCode;
    return sanitizeUser(target);
  });
}

export async function requestPhoneVerification(userId: string) {
  const code = makeVerificationCode();

  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const rows = await db`SELECT * FROM users WHERE id = ${userId}`;
    if (!rows[0]) throw new Error("Account not found");
    const user = rowToStoredUser(rows[0]);
    if (!user.phoneNumber) throw new Error("Phone number is not registered");
    // Check phone uniqueness
    const existing =
      await db`SELECT id FROM users WHERE phone_number = ${user.phoneNumber} AND id != ${userId}`;
    if (existing.length > 0) throw new Error("This phone number is already registered");
    const now = new Date().toISOString();
    await db`UPDATE users SET pending_phone_code = ${code}, verification_requested_at = ${now} WHERE id = ${userId}`;
    return { code };
  }

  return mutateStore((store) => {
    const target = store.users.find((entry) => entry.id === userId);
    if (!target) throw new Error("Account not found");
    if (!target.phoneNumber) throw new Error("Phone number is not registered");
    ensurePhoneAvailable(store, target.phoneNumber, target.id);
    target.pendingPhoneCode = code;
    target.verificationRequestedAt = new Date().toISOString();
    return { code };
  });
}

export async function confirmPhoneVerification(userId: string, code: string) {
  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const rows = await db`SELECT * FROM users WHERE id = ${userId}`;
    if (!rows[0]) throw new Error("Account not found");
    const user = rowToStoredUser(rows[0]);
    if (!user.pendingPhoneCode || user.pendingPhoneCode !== code.trim())
      throw new Error("Invalid verification code");
    const now = new Date().toISOString();
    await db`UPDATE users SET phone_verified_at = ${now}, pending_phone_code = NULL WHERE id = ${userId}`;
    return sanitizeUser({ ...user, phoneVerifiedAt: now, pendingPhoneCode: undefined });
  }

  return mutateStore((store) => {
    const target = store.users.find((entry) => entry.id === userId);
    if (!target) throw new Error("Account not found");
    if (!target.pendingPhoneCode || target.pendingPhoneCode !== code.trim())
      throw new Error("Invalid verification code");
    target.phoneVerifiedAt = new Date().toISOString();
    delete target.pendingPhoneCode;
    return sanitizeUser(target);
  });
}

export async function listStreamSessions(statuses?: StreamSessionStatus[]) {
  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const rows =
      statuses?.length
        ? await db`
            SELECT s.*, u.avatar_url AS host_avatar_url, u.channel_name AS host_channel_name
            FROM stream_sessions s
            LEFT JOIN users u ON u.id = s.host_user_id
            WHERE s.status = ANY(${statuses})
            ORDER BY s.created_at DESC
          `
        : await db`
            SELECT s.*, u.avatar_url AS host_avatar_url, u.channel_name AS host_channel_name
            FROM stream_sessions s
            LEFT JOIN users u ON u.id = s.host_user_id
            ORDER BY s.created_at DESC
          `;
    return rows.map(rowToStreamSession);
  }

  const store = await readStore();
  const filtered = statuses?.length
    ? store.streamSessions.filter((session) => statuses.includes(session.status))
    : store.streamSessions;
  const sorted = filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return attachHostFields(sorted, store.users);
}

export async function getStreamSessionById(sessionId: string) {
  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const rows = await db`
      SELECT s.*, u.avatar_url AS host_avatar_url, u.channel_name AS host_channel_name
      FROM stream_sessions s
      LEFT JOIN users u ON u.id = s.host_user_id
      WHERE s.session_id = ${sessionId}
    `;
    if (!rows[0]) return null;
    return rowToStreamSession(rows[0]);
  }

  const store = await readStore();
  const session = store.streamSessions.find((entry) => entry.sessionId === sessionId) ?? null;
  if (!session) return null;
  return attachHostFields([session], store.users)[0];
}

export async function listReservationsForUser(userId: string) {
  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const rows =
      await db`SELECT * FROM reservations WHERE user_id = ${userId} ORDER BY created_at DESC`;
    return rows.map(rowToReservation);
  }

  const store = await readStore();
  return store.reservations
    .filter((reservation) => reservation.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listReservationsForSession(sessionId: string, actor: SessionUser) {
  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const sessionRows =
      await db`SELECT host_user_id FROM stream_sessions WHERE session_id = ${sessionId}`;
    if (!sessionRows[0]) throw new Error("Session not found");
    if (sessionRows[0].host_user_id !== actor.id)
      throw new Error("Cannot view reservations for another VTuber's session");
    const rows =
      await db`SELECT * FROM reservations WHERE session_id = ${sessionId} ORDER BY created_at DESC`;
    return rows.map(rowToReservation);
  }

  const store = await readStore();
  const session = store.streamSessions.find((entry) => entry.sessionId === sessionId);
  if (!session) throw new Error("Session not found");
  if (session.hostUserId !== actor.id)
    throw new Error("Cannot view reservations for another VTuber's session");

  return store.reservations
    .filter((reservation) => reservation.sessionId === sessionId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createStreamSession(
  hostUser: SessionUser,
  input: CreateStreamSessionInput,
) {
  requireVerifiedVtuber(hostUser);
  if (input.reservationRequired && (input.participationType ?? "First-come") !== "First-come") {
    throw new Error("Reservation-required sessions must use first-come participation");
  }

  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const now = new Date().toISOString();
    const slotsTotal = input.slotsTotal ?? 10;
    const speakerSlotsTotal = input.speakerSlotsTotal ?? 5;
    const sessionId = makeSessionId();

    await db`
      INSERT INTO stream_sessions (
        session_id, host_user_id, title, status, created_at, starts_at, description,
        category, thumbnail, host_name, participation_type, required_plan,
        reservation_required, slots_total, slots_left, speaker_slots_total, speaker_slots_left,
        speaker_required_plan, preferred_video_device_id, preferred_video_label
      ) VALUES (
        ${sessionId}, ${hostUser.id}, ${input.title.trim()}, 'prelive', ${now},
        ${normalizeStartsAt(input.startsAt)}, ${input.description.trim()}, ${input.category.trim()},
        ${input.thumbnail ?? "/image/thumbnail/thumbnail_5.png"},
        ${input.hostName?.trim() || hostUser.name},
        ${input.participationType ?? "First-come"}, ${input.requiredPlan ?? "free"},
        ${input.reservationRequired === true}, ${slotsTotal}, ${slotsTotal},
        ${speakerSlotsTotal}, ${speakerSlotsTotal}, ${input.speakerRequiredPlan ?? "free"},
        ${input.preferredVideoDeviceId ?? null}, ${input.preferredVideoLabel ?? null}
      )
    `;

    const rows = await db`SELECT * FROM stream_sessions WHERE session_id = ${sessionId}`;
    return rowToStreamSession(rows[0]);
  }

  const created = await mutateStore((store) => {
    const now = new Date().toISOString();
    const slotsTotal = input.slotsTotal ?? 10;
    const speakerSlotsTotal = input.speakerSlotsTotal ?? 5;

    const next: StreamSession = {
      sessionId: makeSessionId(),
      hostUserId: hostUser.id,
      title: input.title.trim(),
      status: "prelive",
      createdAt: now,
      startsAt: normalizeStartsAt(input.startsAt),
      description: input.description.trim(),
      category: input.category.trim(),
      thumbnail: input.thumbnail ?? "/image/thumbnail/thumbnail_5.png",
      hostName: input.hostName?.trim() || hostUser.name,
      participationType: input.participationType ?? "First-come",
      requiredPlan: input.requiredPlan ?? "free",
      reservationRequired: input.reservationRequired === true,
      slotsTotal,
      slotsLeft: slotsTotal,
      speakerSlotsTotal,
      speakerSlotsLeft: speakerSlotsTotal,
      speakerRequiredPlan: input.speakerRequiredPlan ?? "free",
      preferredVideoDeviceId: input.preferredVideoDeviceId,
      preferredVideoLabel: input.preferredVideoLabel,
    };

    store.streamSessions.unshift(next);
    syncSessionSlots(store);
    return next;
  });

  return created;
}

export async function updateStreamSession(
  sessionId: string,
  actor: SessionUser,
  patch: UpdateStreamSessionInput,
) {
  requireVerifiedVtuber(actor);

  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const sessionRows =
      await db`SELECT * FROM stream_sessions WHERE session_id = ${sessionId}`;
    if (!sessionRows[0]) return null;
    const current = rowToStreamSession(sessionRows[0]);
    if (current.hostUserId !== actor.id)
      throw new Error("Cannot update another VTuber's session");

    // Count active reservations
    const listenerCountRows =
      await db`SELECT COUNT(*) as cnt FROM reservations WHERE session_id = ${sessionId} AND status = 'reserved' AND type = 'listener'`;
    const speakerCountRows =
      await db`SELECT COUNT(*) as cnt FROM reservations WHERE session_id = ${sessionId} AND status = 'reserved' AND type = 'speaker'`;
    const listenerReservedCount = Number(listenerCountRows[0].cnt);
    const speakerReservedCount = Number(speakerCountRows[0].cnt);

    const nextSlotsTotal = patch.slotsTotal ?? current.slotsTotal;
    const nextSpeakerSlotsTotal = patch.speakerSlotsTotal ?? current.speakerSlotsTotal;
    const nextParticipationType = patch.participationType ?? current.participationType;
    const nextReservationRequired = patch.reservationRequired ?? current.reservationRequired;
    const nextRequiredPlan = patch.requiredPlan ?? current.requiredPlan;
    const nextSpeakerRequiredPlan = patch.speakerRequiredPlan ?? current.speakerRequiredPlan;

    if (nextSlotsTotal < listenerReservedCount)
      throw new Error("slotsTotal cannot be lower than active listener reservations");
    if (nextSpeakerSlotsTotal < speakerReservedCount)
      throw new Error("speakerSlotsTotal cannot be lower than active speaker reservations");
    if (nextReservationRequired && nextParticipationType !== "First-come")
      throw new Error("Reservation-required sessions must use first-come participation");
    if (nextSlotsTotal < 1) throw new Error("slotsTotal must be at least 1");
    if (nextSpeakerSlotsTotal < 1) throw new Error("speakerSlotsTotal must be at least 1");

    const nextStartsAt = patch.startsAt ? normalizeStartsAt(patch.startsAt) : current.startsAt;
    const nextSlotsLeft = Math.max(0, nextSlotsTotal - listenerReservedCount);
    const nextSpeakerSlotsLeft = Math.max(0, nextSpeakerSlotsTotal - speakerReservedCount);

    await db`
      UPDATE stream_sessions SET
        title = ${patch.title?.trim() ?? current.title},
        description = ${patch.description?.trim() ?? current.description},
        category = ${patch.category?.trim() ?? current.category},
        host_name = ${patch.hostName?.trim() ?? current.hostName},
        starts_at = ${nextStartsAt},
        participation_type = ${nextParticipationType},
        required_plan = ${nextRequiredPlan},
        reservation_required = ${nextReservationRequired},
        slots_total = ${nextSlotsTotal},
        slots_left = ${nextSlotsLeft},
        speaker_slots_total = ${nextSpeakerSlotsTotal},
        speaker_slots_left = ${nextSpeakerSlotsLeft},
        speaker_required_plan = ${nextSpeakerRequiredPlan},
        thumbnail = ${patch.thumbnail ?? current.thumbnail}
      WHERE session_id = ${sessionId}
    `;

    const updated = await db`SELECT * FROM stream_sessions WHERE session_id = ${sessionId}`;
    return rowToStreamSession(updated[0]);
  }

  return mutateStore((store) => {
    const index = store.streamSessions.findIndex(
      (session) => session.sessionId === sessionId,
    );
    if (index === -1) return null;

    const current = store.streamSessions[index];
    if (current.hostUserId !== actor.id) throw new Error("Cannot update another VTuber's session");

    const listenerReservedCount = countActiveReservations(store, sessionId, "listener");
    const speakerReservedCount = countActiveReservations(store, sessionId, "speaker");
    const nextSlotsTotal = patch.slotsTotal ?? current.slotsTotal;
    const nextSpeakerSlotsTotal = patch.speakerSlotsTotal ?? current.speakerSlotsTotal;
    const nextParticipationType = patch.participationType ?? current.participationType;
    const nextReservationRequired = patch.reservationRequired ?? current.reservationRequired;
    const nextRequiredPlan = patch.requiredPlan ?? current.requiredPlan;
    const nextSpeakerRequiredPlan = patch.speakerRequiredPlan ?? current.speakerRequiredPlan;

    if (nextSlotsTotal < listenerReservedCount)
      throw new Error("slotsTotal cannot be lower than active listener reservations");
    if (nextSpeakerSlotsTotal < speakerReservedCount)
      throw new Error("speakerSlotsTotal cannot be lower than active speaker reservations");
    if (nextReservationRequired && nextParticipationType !== "First-come")
      throw new Error("Reservation-required sessions must use first-come participation");

    const next: StreamSession = {
      ...current,
      ...patch,
      sessionId: current.sessionId,
      hostUserId: current.hostUserId,
      createdAt: current.createdAt,
      startsAt: patch.startsAt ? normalizeStartsAt(patch.startsAt) : current.startsAt,
      title: patch.title?.trim() ?? current.title,
      description: patch.description?.trim() ?? current.description,
      category: patch.category?.trim() ?? current.category,
      hostName: patch.hostName?.trim() ?? current.hostName,
      participationType: nextParticipationType,
      requiredPlan: nextRequiredPlan,
      reservationRequired: nextReservationRequired,
      slotsTotal: nextSlotsTotal,
      slotsLeft: Math.max(0, nextSlotsTotal - listenerReservedCount),
      speakerSlotsTotal: nextSpeakerSlotsTotal,
      speakerSlotsLeft: Math.max(0, nextSpeakerSlotsTotal - speakerReservedCount),
      speakerRequiredPlan: nextSpeakerRequiredPlan,
    };

    if (next.slotsTotal < 1) throw new Error("slotsTotal must be at least 1");
    if (next.speakerSlotsTotal < 1) throw new Error("speakerSlotsTotal must be at least 1");

    store.streamSessions[index] = next;
    syncSessionSlots(store);
    return next;
  });
}

export async function deleteStreamSession(sessionId: string, actor: SessionUser) {
  requireVerifiedVtuber(actor);

  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const rows = await db`SELECT * FROM stream_sessions WHERE session_id = ${sessionId}`;
    if (!rows[0]) return null;
    const current = rowToStreamSession(rows[0]);
    if (current.hostUserId !== actor.id)
      throw new Error("Cannot delete another VTuber's session");
    if (current.status === "live")
      throw new Error("Cannot delete a session that is currently live");

    const now = new Date().toISOString();
    await db`
      UPDATE reservations SET status = 'cancelled', cancelled_at = ${now}
      WHERE session_id = ${sessionId} AND status = 'reserved'
    `;
    await db`DELETE FROM stream_sessions WHERE session_id = ${sessionId}`;
    return true;
  }

  return mutateStore((store) => {
    const index = store.streamSessions.findIndex(
      (session) => session.sessionId === sessionId,
    );
    if (index === -1) return null;

    const current = store.streamSessions[index];
    if (current.hostUserId !== actor.id) throw new Error("Cannot delete another VTuber's session");
    if (current.status === "live") throw new Error("Cannot delete a session that is currently live");

    store.streamSessions.splice(index, 1);
    for (const reservation of store.reservations) {
      if (reservation.sessionId === sessionId && reservation.status === "reserved") {
        reservation.status = "cancelled";
        reservation.cancelledAt = new Date().toISOString();
      }
    }
    return true;
  });
}

export async function listStreamSessionsByHost(
  hostUserId: string,
  statuses?: StreamSessionStatus[],
): Promise<StreamSession[]> {
  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const rows =
      statuses?.length
        ? await db`
            SELECT s.*, u.avatar_url AS host_avatar_url, u.channel_name AS host_channel_name
            FROM stream_sessions s
            LEFT JOIN users u ON u.id = s.host_user_id
            WHERE s.host_user_id = ${hostUserId}
              AND s.status = ANY(${statuses})
            ORDER BY s.created_at DESC
          `
        : await db`
            SELECT s.*, u.avatar_url AS host_avatar_url, u.channel_name AS host_channel_name
            FROM stream_sessions s
            LEFT JOIN users u ON u.id = s.host_user_id
            WHERE s.host_user_id = ${hostUserId}
            ORDER BY s.created_at DESC
          `;
    return rows.map(rowToStreamSession);
  }

  const store = await readStore();
  const filtered = store.streamSessions
    .filter((session) => {
      if (session.hostUserId !== hostUserId) return false;
      if (statuses?.length && !statuses.includes(session.status)) return false;
      return true;
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return attachHostFields(filtered, store.users);
}

export async function setStreamSessionStatus(
  sessionId: string,
  actor: SessionUser,
  status: StreamSessionStatus,
) {
  requireVerifiedVtuber(actor);

  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const rows = await db`SELECT * FROM stream_sessions WHERE session_id = ${sessionId}`;
    if (!rows[0]) return null;
    const current = rowToStreamSession(rows[0]);
    if (current.hostUserId !== actor.id)
      throw new Error("Cannot change another VTuber's session");
    validateTransition(current.status, status);

    await db`UPDATE stream_sessions SET status = ${status} WHERE session_id = ${sessionId}`;
    await neonSyncSessionSlots(sessionId);

    const updated = await db`SELECT * FROM stream_sessions WHERE session_id = ${sessionId}`;
    return rowToStreamSession(updated[0]);
  }

  return mutateStore((store) => {
    const index = store.streamSessions.findIndex(
      (session) => session.sessionId === sessionId,
    );
    if (index === -1) return null;

    const current = store.streamSessions[index];
    if (current.hostUserId !== actor.id) throw new Error("Cannot change another VTuber's session");

    validateTransition(current.status, status);

    const next = { ...current, status };
    store.streamSessions[index] = next;
    syncSessionSlots(store);
    return next;
  });
}

export async function createReservation(actor: SessionUser, input: CreateReservationInput) {
  if (!input.sessionId?.trim()) throw new Error("sessionId is required");
  const reservationType: ReservationType = input.type === "speaker" ? "speaker" : "listener";
  const actorPlan = await getEffectivePlanForUser(actor.id);

  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();

    const sessionRows =
      await db`SELECT * FROM stream_sessions WHERE session_id = ${input.sessionId}`;
    if (!sessionRows[0]) throw new Error("Session not found");
    const session = rowToStreamSession(sessionRows[0]);

    if (session.status === "ended") throw new Error("This stream has ended");
    if (session.status === "live" && session.reservationRequired)
      throw new Error(
        "Reservations for this session must be made before the stream starts",
      );

    if (reservationType === "speaker") {
      if (!canAccessPlan(actorPlan, session.speakerRequiredPlan))
        throw new Error(`Speaker slots require the ${session.speakerRequiredPlan} plan`);

      const existingRows =
        await db`SELECT reservation_id FROM reservations WHERE session_id = ${session.sessionId} AND user_id = ${actor.id} AND status = 'reserved' AND type = 'speaker'`;
      if (existingRows.length > 0)
        throw new Error("You already have a speaker reservation for this session");

      const countRows =
        await db`SELECT COUNT(*) as cnt FROM reservations WHERE session_id = ${session.sessionId} AND status = 'reserved' AND type = 'speaker'`;
      if (Number(countRows[0].cnt) >= session.speakerSlotsTotal)
        throw new Error("No speaker slots left");
    } else {
      if (session.participationType !== "First-come")
        throw new Error("Reservation API currently supports first-come sessions only");
      if (!canAccessPlan(actorPlan, session.requiredPlan))
        throw new Error(`This session requires the ${session.requiredPlan} plan`);

      const existingRows =
        await db`SELECT reservation_id FROM reservations WHERE session_id = ${session.sessionId} AND user_id = ${actor.id} AND status = 'reserved' AND type = 'listener'`;
      if (existingRows.length > 0) throw new Error("You already reserved this session");

      const countRows =
        await db`SELECT COUNT(*) as cnt FROM reservations WHERE session_id = ${session.sessionId} AND status = 'reserved' AND type = 'listener'`;
      if (Number(countRows[0].cnt) >= session.slotsTotal)
        throw new Error("No reservation slots left");
    }

    const reservationId = makeReservationId();
    const now = new Date().toISOString();
    await db`
      INSERT INTO reservations (reservation_id, session_id, user_id, user_name, created_at, status, type)
      VALUES (${reservationId}, ${session.sessionId}, ${actor.id}, ${actor.name}, ${now}, 'reserved', ${reservationType})
    `;
    await neonSyncSessionSlots(session.sessionId);

    const resRows =
      await db`SELECT * FROM reservations WHERE reservation_id = ${reservationId}`;
    return rowToReservation(resRows[0]);
  }

  return mutateStore((store) => {
    const session = store.streamSessions.find(
      (entry) => entry.sessionId === input.sessionId,
    );
    if (!session) throw new Error("Session not found");
    if (session.status === "ended") throw new Error("This stream has ended");
    if (session.status === "live" && session.reservationRequired)
      throw new Error("Reservations for this session must be made before the stream starts");

    if (reservationType === "speaker") {
      if (!canAccessPlan(actorPlan, session.speakerRequiredPlan))
        throw new Error(`Speaker slots require the ${session.speakerRequiredPlan} plan`);
      if (findActiveReservation(store, session.sessionId, actor.id, "speaker"))
        throw new Error("You already have a speaker reservation for this session");
      const speakerCount = countActiveReservations(store, session.sessionId, "speaker");
      if (speakerCount >= session.speakerSlotsTotal) throw new Error("No speaker slots left");
    } else {
      if (session.participationType !== "First-come")
        throw new Error("Reservation API currently supports first-come sessions only");
      if (!canAccessPlan(actorPlan, session.requiredPlan))
        throw new Error(`This session requires the ${session.requiredPlan} plan`);
      if (findActiveReservation(store, session.sessionId, actor.id, "listener"))
        throw new Error("You already reserved this session");
      const listenerCount = countActiveReservations(store, session.sessionId, "listener");
      if (listenerCount >= session.slotsTotal) throw new Error("No reservation slots left");
    }

    const reservation: Reservation = {
      reservationId: makeReservationId(),
      sessionId: session.sessionId,
      userId: actor.id,
      userName: actor.name,
      createdAt: new Date().toISOString(),
      status: "reserved",
      type: reservationType,
    };

    store.reservations.unshift(reservation);
    syncSessionSlots(store);
    return reservation;
  });
}

export async function hasActiveSpeakerReservation(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const rows =
      await db`SELECT reservation_id FROM reservations WHERE session_id = ${sessionId} AND user_id = ${userId} AND status = 'reserved' AND type = 'speaker'`;
    return rows.length > 0;
  }

  const store = await readStore();
  return !!findActiveReservation(store, sessionId, userId, "speaker");
}

export async function cancelReservation(actor: SessionUser, reservationId: string) {
  if (USE_NEON) {
    await ensureSchema();
    const db = getDb();
    const rows =
      await db`SELECT * FROM reservations WHERE reservation_id = ${reservationId}`;
    if (!rows[0]) return null;
    const reservation = rowToReservation(rows[0]);
    if (reservation.userId !== actor.id)
      throw new Error("Cannot cancel another user's reservation");
    if (reservation.status !== "reserved") return reservation;

    const now = new Date().toISOString();
    await db`
      UPDATE reservations SET status = 'cancelled', cancelled_at = ${now}
      WHERE reservation_id = ${reservationId}
    `;
    await neonSyncSessionSlots(reservation.sessionId);
    return { ...reservation, status: "cancelled" as ReservationStatus, cancelledAt: now };
  }

  return mutateStore((store) => {
    const reservation = store.reservations.find(
      (entry) => entry.reservationId === reservationId,
    );
    if (!reservation) return null;
    if (reservation.userId !== actor.id)
      throw new Error("Cannot cancel another user's reservation");
    if (reservation.status !== "reserved") return reservation;

    reservation.status = "cancelled";
    reservation.cancelledAt = new Date().toISOString();
    syncSessionSlots(store);
    return reservation;
  });
}
