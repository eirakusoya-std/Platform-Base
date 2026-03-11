import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AuthProvider,
  CreateReservationInput,
  CreateStreamSessionInput,
  Reservation,
  ReservationStatus,
  LoginInput,
  SessionUser,
  SignupInput,
  StreamSession,
  StreamSessionStatus,
  UpdateStreamSessionInput,
} from "../apiTypes";

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

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "runtime-store.json");

const DEFAULT_STORE: StoreFile = {
  users: [],
  streamSessions: [],
  reservations: [],
};

let writeQueue: Promise<unknown> = Promise.resolve();

function cloneStore(store: StoreFile): StoreFile {
  return {
    users: [...store.users],
    streamSessions: [...store.streamSessions],
    reservations: [...store.reservations],
  };
}

function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sanitizeUser(user: StoredUser): SessionUser {
  const { passwordHash: _passwordHash, pendingEmailCode: _pendingEmailCode, pendingPhoneCode: _pendingPhoneCode, verificationRequestedAt: _verificationRequestedAt, ...safeUser } = user;
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

  return {
    reservationId: entry.reservationId,
    sessionId: entry.sessionId,
    userId: entry.userId,
    userName: entry.userName,
    createdAt: entry.createdAt,
    status,
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
  const slotsTotal = typeof entry.slotsTotal === "number" && entry.slotsTotal > 0 ? entry.slotsTotal : 10;
  const slotsLeft = typeof entry.slotsLeft === "number" && entry.slotsLeft >= 0 ? Math.min(entry.slotsLeft, slotsTotal) : slotsTotal;

  return {
    sessionId: entry.sessionId,
    hostUserId: entry.hostUserId,
    title: entry.title,
    status,
    createdAt: entry.createdAt,
    startsAt: entry.startsAt,
    description: entry.description,
    category: entry.category,
    thumbnail: entry.thumbnail,
    hostName: entry.hostName,
    participationType,
    reservationRequired: entry.reservationRequired === true,
    slotsTotal,
    slotsLeft,
    preferredVideoDeviceId: typeof entry.preferredVideoDeviceId === "string" ? entry.preferredVideoDeviceId : undefined,
    preferredVideoLabel: typeof entry.preferredVideoLabel === "string" ? entry.preferredVideoLabel : undefined,
  };
}

function normalizeStoredUser(entry: Partial<StoredUser>): StoredUser | null {
  if (typeof entry.id !== "string" || typeof entry.name !== "string") return null;
  const role = entry.role === "vtuber" ? "vtuber" : entry.role === "listener" ? "listener" : null;
  if (!role) return null;

  const legacyDefaults = LEGACY_USER_DEFAULTS[entry.id] ?? {};
  const createdAt = typeof entry.createdAt === "string" ? entry.createdAt : (legacyDefaults.createdAt ?? new Date().toISOString());
  const emailRaw = typeof entry.email === "string" && entry.email.trim() ? entry.email : legacyDefaults.email;
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : `${entry.id}@aiment.local`;

  return {
    id: entry.id,
    name: entry.name,
    role,
    email,
    authProvider: (entry.authProvider === "google_demo" || entry.authProvider === "password" ? entry.authProvider : legacyDefaults.authProvider) ?? "password",
    createdAt,
    lastLoginAt: typeof entry.lastLoginAt === "string" ? entry.lastLoginAt : undefined,
    channelName: typeof entry.channelName === "string" ? entry.channelName : legacyDefaults.channelName,
    bio: typeof entry.bio === "string" ? entry.bio : undefined,
    avatarUrl: typeof entry.avatarUrl === "string" ? entry.avatarUrl : undefined,
    phoneNumber: typeof entry.phoneNumber === "string" ? entry.phoneNumber : legacyDefaults.phoneNumber,
    emailVerifiedAt: typeof entry.emailVerifiedAt === "string" ? entry.emailVerifiedAt : legacyDefaults.emailVerifiedAt,
    phoneVerifiedAt: typeof entry.phoneVerifiedAt === "string" ? entry.phoneVerifiedAt : legacyDefaults.phoneVerifiedAt,
    termsAcceptedAt: typeof entry.termsAcceptedAt === "string" ? entry.termsAcceptedAt : legacyDefaults.termsAcceptedAt,
    privacyAcceptedAt: typeof entry.privacyAcceptedAt === "string" ? entry.privacyAcceptedAt : legacyDefaults.privacyAcceptedAt,
    passwordHash: typeof entry.passwordHash === "string" ? entry.passwordHash : undefined,
    pendingEmailCode: typeof entry.pendingEmailCode === "string" ? entry.pendingEmailCode : undefined,
    pendingPhoneCode: typeof entry.pendingPhoneCode === "string" ? entry.pendingPhoneCode : undefined,
    verificationRequestedAt: typeof entry.verificationRequestedAt === "string" ? entry.verificationRequestedAt : undefined,
  };
}

function countActiveReservations(store: StoreFile, sessionId: string) {
  return store.reservations.filter((reservation) => reservation.sessionId === sessionId && reservation.status === "reserved").length;
}

function syncSessionSlots(store: StoreFile) {
  store.streamSessions = store.streamSessions.map((session) => {
    const reservedCount = countActiveReservations(store, session.sessionId);
    return {
      ...session,
      slotsLeft: Math.max(0, session.slotsTotal - reservedCount),
    };
  });
}

async function ensureStoreFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    await writeFile(STORE_FILE, JSON.stringify(DEFAULT_STORE, null, 2), "utf8");
  }
}

async function readStore(): Promise<StoreFile> {
  await ensureStoreFile();
  const raw = await readFile(STORE_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    const store = {
      users: Array.isArray(parsed.users) ? parsed.users.map((entry) => normalizeStoredUser(entry as Partial<StoredUser>)).filter((entry): entry is StoredUser => entry != null) : [],
      streamSessions: Array.isArray(parsed.streamSessions)
        ? parsed.streamSessions.map((entry) => normalizeStreamSession(entry as Partial<StreamSession>)).filter((entry): entry is StreamSession => entry != null)
        : [],
      reservations: Array.isArray(parsed.reservations)
        ? parsed.reservations.map((entry) => normalizeReservation(entry as Partial<Reservation>)).filter((entry): entry is Reservation => entry != null)
        : [],
    };
    syncSessionSlots(store);
    return store;
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

function requireListener(actor: SessionUser) {
  if (actor.role !== "listener") throw new Error("Only listener accounts can reserve sessions");
}

function makeVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function ensureEmailAvailable(store: StoreFile, email: string, ignoreUserId?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const found = store.users.find((user) => typeof user.email === "string" && user.email.toLowerCase() === normalizedEmail && user.id !== ignoreUserId);
  if (found) throw new Error("This email address is already in use");
}

function ensurePhoneAvailable(store: StoreFile, phoneNumber: string, ignoreUserId?: string) {
  const found = store.users.find((user) => user.phoneNumber === phoneNumber && user.id !== ignoreUserId);
  if (found) throw new Error("This phone number is already registered");
}

function findActiveReservation(store: StoreFile, sessionId: string, userId: string) {
  return store.reservations.find((reservation) => reservation.sessionId === sessionId && reservation.userId === userId && reservation.status === "reserved");
}

export async function listUsers() {
  const store = await readStore();
  return store.users.map(sanitizeUser);
}

export async function getUserById(userId: string) {
  const store = await readStore();
  const user = store.users.find((entry) => entry.id === userId);
  return user ? sanitizeUser(user) : null;
}

export async function getUserByEmail(email: string) {
  const store = await readStore();
  const normalizedEmail = email.trim().toLowerCase();
  const user = store.users.find((entry) => typeof entry.email === "string" && entry.email.toLowerCase() === normalizedEmail);
  return user ? sanitizeUser(user) : null;
}

async function getStoredUserById(userId: string) {
  const store = await readStore();
  return store.users.find((entry) => entry.id === userId) ?? null;
}

export async function signupUser(input: SignupInput) {
  if (!input.termsAccepted || !input.privacyAccepted) {
    throw new Error("You must agree to the terms and privacy policy");
  }
  if (!input.name.trim()) throw new Error("Display name is required");
  if (!input.email.trim()) throw new Error("Email address is required");
  if (input.provider === "password" && !input.password) throw new Error("Password is required");
  if (input.role === "vtuber" && !input.phoneNumber?.trim()) throw new Error("Phone number is required for VTuber registration");

  const now = new Date().toISOString();

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
  const store = await readStore();
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = store.users.find((entry) => typeof entry.email === "string" && entry.email.toLowerCase() === normalizedEmail);
  if (!user) throw new Error("Account not found");
  if (user.authProvider !== input.provider) throw new Error("Use the original sign-in method for this account");
  if (input.provider === "password" && user.passwordHash !== hashSecret(input.password ?? "")) {
    throw new Error("Incorrect email or password");
  }

  return mutateStore((nextStore) => {
    const target = nextStore.users.find((entry) => entry.id === user.id);
    if (!target) throw new Error("Account not found");
    target.lastLoginAt = new Date().toISOString();
    return sanitizeUser(target);
  });
}

export async function updateAccountProfile(userId: string, patch: { name?: string; channelName?: string; bio?: string }) {
  return mutateStore((store) => {
    const target = store.users.find((entry) => entry.id === userId);
    if (!target) return null;

    if (patch.name != null) target.name = patch.name.trim();
    if (patch.channelName != null) target.channelName = patch.channelName.trim() || undefined;
    if (patch.bio != null) target.bio = patch.bio.trim() || undefined;

    return sanitizeUser(target);
  });
}

export async function requestEmailVerification(userId: string) {
  const code = makeVerificationCode();
  return mutateStore((store) => {
    const target = store.users.find((entry) => entry.id === userId);
    if (!target) throw new Error("Account not found");
    target.pendingEmailCode = code;
    target.verificationRequestedAt = new Date().toISOString();
    return { code };
  });
}

export async function confirmEmailVerification(userId: string, code: string) {
  return mutateStore((store) => {
    const target = store.users.find((entry) => entry.id === userId);
    if (!target) throw new Error("Account not found");
    if (!target.pendingEmailCode || target.pendingEmailCode !== code.trim()) throw new Error("Invalid verification code");
    target.emailVerifiedAt = new Date().toISOString();
    delete target.pendingEmailCode;
    return sanitizeUser(target);
  });
}

export async function requestPhoneVerification(userId: string) {
  const code = makeVerificationCode();
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
  return mutateStore((store) => {
    const target = store.users.find((entry) => entry.id === userId);
    if (!target) throw new Error("Account not found");
    if (!target.pendingPhoneCode || target.pendingPhoneCode !== code.trim()) throw new Error("Invalid verification code");
    target.phoneVerifiedAt = new Date().toISOString();
    delete target.pendingPhoneCode;
    return sanitizeUser(target);
  });
}

export async function listStreamSessions(statuses?: StreamSessionStatus[]) {
  const store = await readStore();
  const filtered = statuses?.length
    ? store.streamSessions.filter((session) => statuses.includes(session.status))
    : store.streamSessions;
  return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getStreamSessionById(sessionId: string) {
  const store = await readStore();
  return store.streamSessions.find((session) => session.sessionId === sessionId) ?? null;
}

export async function listReservationsForUser(userId: string) {
  const store = await readStore();
  return store.reservations
    .filter((reservation) => reservation.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listReservationsForSession(sessionId: string, actor: SessionUser) {
  const store = await readStore();
  const session = store.streamSessions.find((entry) => entry.sessionId === sessionId);
  if (!session) throw new Error("Session not found");
  if (session.hostUserId !== actor.id) throw new Error("Cannot view reservations for another VTuber's session");

  return store.reservations
    .filter((reservation) => reservation.sessionId === sessionId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createStreamSession(hostUser: SessionUser, input: CreateStreamSessionInput) {
  requireVerifiedVtuber(hostUser);
  if (input.reservationRequired && (input.participationType ?? "First-come") !== "First-come") {
    throw new Error("Reservation-required sessions must use first-come participation");
  }

  const created = await mutateStore((store) => {
    const now = new Date().toISOString();
    const slotsTotal = input.slotsTotal ?? 10;

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
      reservationRequired: input.reservationRequired === true,
      slotsTotal,
      slotsLeft: slotsTotal,
      preferredVideoDeviceId: input.preferredVideoDeviceId,
      preferredVideoLabel: input.preferredVideoLabel,
    };

    store.streamSessions.unshift(next);
    syncSessionSlots(store);
    return next;
  });

  return created;
}

export async function updateStreamSession(sessionId: string, actor: SessionUser, patch: UpdateStreamSessionInput) {
  requireVerifiedVtuber(actor);

  return mutateStore((store) => {
    const index = store.streamSessions.findIndex((session) => session.sessionId === sessionId);
    if (index === -1) return null;

    const current = store.streamSessions[index];
    if (current.hostUserId !== actor.id) throw new Error("Cannot update another VTuber's session");

    const reservedCount = countActiveReservations(store, sessionId);
    const nextSlotsTotal = patch.slotsTotal ?? current.slotsTotal;
    const nextParticipationType = patch.participationType ?? current.participationType;
    const nextReservationRequired = patch.reservationRequired ?? current.reservationRequired;
    if (nextSlotsTotal < reservedCount) {
      throw new Error("slotsTotal cannot be lower than active reservations");
    }
    if (nextReservationRequired && nextParticipationType !== "First-come") {
      throw new Error("Reservation-required sessions must use first-come participation");
    }

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
      reservationRequired: nextReservationRequired,
      slotsTotal: nextSlotsTotal,
      slotsLeft: Math.max(0, nextSlotsTotal - reservedCount),
    };

    if (next.slotsTotal < 1) throw new Error("slotsTotal must be at least 1");
    if (next.slotsLeft < 0 || next.slotsLeft > next.slotsTotal) throw new Error("slotsLeft is out of range");

    store.streamSessions[index] = next;
    syncSessionSlots(store);
    return next;
  });
}

export async function setStreamSessionStatus(sessionId: string, actor: SessionUser, status: StreamSessionStatus) {
  requireVerifiedVtuber(actor);

  return mutateStore((store) => {
    const index = store.streamSessions.findIndex((session) => session.sessionId === sessionId);
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
  requireListener(actor);

  if (!input.sessionId?.trim()) throw new Error("sessionId is required");

  return mutateStore((store) => {
    const session = store.streamSessions.find((entry) => entry.sessionId === input.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.status !== "prelive") throw new Error("Reservations are only available before the stream starts");
    if (session.participationType !== "First-come") throw new Error("Reservation API currently supports first-come sessions only");
    if (findActiveReservation(store, session.sessionId, actor.id)) throw new Error("You already reserved this session");

    const reservedCount = countActiveReservations(store, session.sessionId);
    if (reservedCount >= session.slotsTotal) throw new Error("No reservation slots left");

    const reservation: Reservation = {
      reservationId: makeReservationId(),
      sessionId: session.sessionId,
      userId: actor.id,
      userName: actor.name,
      createdAt: new Date().toISOString(),
      status: "reserved",
    };

    store.reservations.unshift(reservation);
    syncSessionSlots(store);
    return reservation;
  });
}

export async function cancelReservation(actor: SessionUser, reservationId: string) {
  requireListener(actor);

  return mutateStore((store) => {
    const reservation = store.reservations.find((entry) => entry.reservationId === reservationId);
    if (!reservation) return null;
    if (reservation.userId !== actor.id) throw new Error("Cannot cancel another user's reservation");
    if (reservation.status !== "reserved") return reservation;

    reservation.status = "cancelled";
    reservation.cancelledAt = new Date().toISOString();
    syncSessionSlots(store);
    return reservation;
  });
}
