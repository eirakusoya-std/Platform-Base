import express from "express";
import cors from "cors";
import { API_ROUTES } from "@repo/shared";

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (allowedOrigins.length === 0) return true;
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

function corsOrigin(origin, callback) {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error("CORS blocked"));
}

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

function error(res, status, code, message) {
  return res.status(status).json({ code, message });
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  const seed = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${seed}`;
}

/** @type {Map<string, { userId: string, name: string, role: "user"|"vtuber"|"admin" }>} */
const authTokens = new Map();

/** @type {Array<any>} */
const sessions = [];
/** @type {Array<any>} */
const reservations = [];

function getAuthToken(req) {
  const raw = req.header("authorization");
  if (!raw) return null;
  if (!raw.toLowerCase().startsWith("bearer ")) return null;
  return raw.slice(7).trim();
}

function requireString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post(API_ROUTES.AUTH_LOGIN, (req, res) => {
  const { userId, name, role } = req.body ?? {};
  if (!requireString(userId) || !requireString(name)) {
    return error(res, 400, "INVALID_INPUT", "userId and name are required.");
  }
  const safeRole = role === "admin" || role === "vtuber" ? role : "user";
  const token = makeId("auth");
  const user = { userId: userId.trim(), name: name.trim(), role: safeRole };
  authTokens.set(token, user);
  return res.json({ token, user });
});

app.post(API_ROUTES.AUTH_LOGOUT, (req, res) => {
  const token = getAuthToken(req);
  if (!token || !authTokens.has(token)) return error(res, 401, "UNAUTHORIZED", "Login is required.");
  authTokens.delete(token);
  return res.status(204).send();
});

app.get(API_ROUTES.AUTH_ME, (req, res) => {
  const token = getAuthToken(req);
  if (!token) return error(res, 401, "UNAUTHORIZED", "Login is required.");
  const user = authTokens.get(token);
  if (!user) return error(res, 401, "UNAUTHORIZED", "Invalid token.");
  return res.json({ user });
});

app.get(API_ROUTES.SESSIONS, (req, res) => {
  const statusFilter = String(req.query.status ?? "").trim();
  if (!statusFilter || statusFilter === "all") {
    return res.json({ sessions: sessions.slice() });
  }

  if (statusFilter === "active") {
    return res.json({ sessions: sessions.filter((s) => s.status === "prelive" || s.status === "live") });
  }

  const statuses = statusFilter
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return res.json({ sessions: sessions.filter((s) => statuses.includes(s.status)) });
});

app.get("/sessions/:sessionId", (req, res) => {
  const session = sessions.find((s) => s.sessionId === req.params.sessionId);
  if (!session) return error(res, 404, "SESSION_NOT_FOUND", "Session not found.");
  return res.json({ session });
});

app.post(API_ROUTES.SESSIONS, (req, res) => {
  const {
    hostUserId,
    hostName,
    title,
    description,
    category,
    thumbnail,
    startsAt,
    participationType,
    slotsTotal,
    preferredVideoDeviceId,
    preferredVideoLabel,
  } = req.body ?? {};

  if (!requireString(hostUserId) || !requireString(title) || !requireString(description) || !requireString(category)) {
    return error(res, 400, "INVALID_INPUT", "hostUserId, title, description and category are required.");
  }

  const safeSlotsTotal = Number.isInteger(slotsTotal) && slotsTotal > 0 ? slotsTotal : 10;
  const safeStartsAt =
    requireString(startsAt) && !Number.isNaN(new Date(startsAt).getTime())
      ? new Date(startsAt).toISOString()
      : new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const session = {
    sessionId: makeId("session"),
    hostUserId: hostUserId.trim(),
    hostName: requireString(hostName) ? hostName.trim() : "あなたのチャンネル",
    title: title.trim(),
    description: description.trim(),
    category: category.trim(),
    thumbnail: requireString(thumbnail) ? thumbnail.trim() : "/image/thumbnail/thumbnail_5.png",
    status: "prelive",
    createdAt: nowIso(),
    startsAt: safeStartsAt,
    participationType: participationType === "Lottery" ? "Lottery" : "First-come",
    slotsTotal: safeSlotsTotal,
    slotsLeft: safeSlotsTotal,
    preferredVideoDeviceId: requireString(preferredVideoDeviceId) ? preferredVideoDeviceId.trim() : undefined,
    preferredVideoLabel: requireString(preferredVideoLabel) ? preferredVideoLabel.trim() : undefined,
  };

  sessions.unshift(session);
  return res.status(201).json({ session });
});

app.patch("/sessions/:sessionId", (req, res) => {
  const session = sessions.find((s) => s.sessionId === req.params.sessionId);
  if (!session) return error(res, 404, "SESSION_NOT_FOUND", "Session not found.");

  const patch = req.body ?? {};
  const allowed = [
    "title",
    "description",
    "category",
    "thumbnail",
    "startsAt",
    "participationType",
    "slotsTotal",
    "slotsLeft",
    "status",
    "preferredVideoDeviceId",
    "preferredVideoLabel",
    "hostName",
  ];

  for (const key of allowed) {
    if (patch[key] !== undefined) session[key] = patch[key];
  }

  if (session.slotsLeft > session.slotsTotal) session.slotsLeft = session.slotsTotal;
  if (session.slotsLeft < 0) session.slotsLeft = 0;

  return res.json({ session });
});

app.patch("/sessions/:sessionId/start", (req, res) => {
  const session = sessions.find((s) => s.sessionId === req.params.sessionId);
  if (!session) return error(res, 404, "SESSION_NOT_FOUND", "Session not found.");
  session.status = "live";
  return res.json({ session });
});

app.patch("/sessions/:sessionId/end", (req, res) => {
  const session = sessions.find((s) => s.sessionId === req.params.sessionId);
  if (!session) return error(res, 404, "SESSION_NOT_FOUND", "Session not found.");
  session.status = "ended";
  return res.json({ session });
});

app.get("/sessions/:sessionId/reservations", (req, res) => {
  const list = reservations.filter((r) => r.sessionId === req.params.sessionId);
  return res.json({ reservations: list });
});

app.post("/sessions/:sessionId/reservations", (req, res) => {
  const { userId, name } = req.body ?? {};
  if (!requireString(userId)) return error(res, 400, "INVALID_INPUT", "userId is required.");

  const session = sessions.find((s) => s.sessionId === req.params.sessionId);
  if (!session) return error(res, 404, "SESSION_NOT_FOUND", "Session not found.");
  if (session.status === "ended") return error(res, 409, "SESSION_ENDED", "Session has already ended.");
  if (session.slotsLeft <= 0) return error(res, 409, "SESSION_FULL", "Session is full.");

  const already = reservations.find((r) => r.sessionId === session.sessionId && r.userId === userId.trim());
  if (already) return error(res, 409, "ALREADY_RESERVED", "User already reserved this session.");

  const reservation = {
    reservationId: makeId("resv"),
    sessionId: session.sessionId,
    userId: userId.trim(),
    name: requireString(name) ? name.trim() : undefined,
    createdAt: nowIso(),
  };

  reservations.push(reservation);
  session.slotsLeft -= 1;
  return res.status(201).json({ reservation, session });
});

app.delete("/reservations/:reservationId", (req, res) => {
  const index = reservations.findIndex((r) => r.reservationId === req.params.reservationId);
  if (index === -1) return error(res, 404, "RESERVATION_NOT_FOUND", "Reservation not found.");

  const [deleted] = reservations.splice(index, 1);
  const session = sessions.find((s) => s.sessionId === deleted.sessionId);
  if (session) {
    session.slotsLeft = Math.min(session.slotsTotal, session.slotsLeft + 1);
  }

  return res.status(204).send();
});

const PORT = Number(process.env.PORT ?? 3002);
app.listen(PORT, () => {
  console.log(`[api] http://localhost:${PORT}`);
});
