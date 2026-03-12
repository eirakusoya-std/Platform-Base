import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { EVENTS } from "@repo/shared";

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const MAX_ROOM_PEERS = Number(process.env.MAX_ROOM_PEERS ?? 2);
const PORT = Number(process.env.PORT ?? 3001);
const PING_TIMEOUT_MS = Number(process.env.PING_TIMEOUT_MS ?? 20000);
const PING_INTERVAL_MS = Number(process.env.PING_INTERVAL_MS ?? 25000);

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

function normalizeRequestedRole(value) {
  if (value === "host" || value === "speaker" || value === "listener") return value;
  return "listener";
}

const rooms = new Map();

function getRoomMembers(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Map();
    rooms.set(roomId, room);
  }
  return room;
}

function listPeers(roomId, exceptPeerId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return [...room.values()]
    .filter((member) => member.peerId !== exceptPeerId)
    .map((member) => ({ peerId: member.peerId, role: member.role }));
}

function findHost(roomId, exceptPeerId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return [...room.values()].find((member) => member.role === "host" && member.peerId !== exceptPeerId) ?? null;
}

function removeMember(roomId, peerId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(peerId);
  if (room.size === 0) {
    rooms.delete(roomId);
  }
}

const app = express();
app.use(cors({ origin: corsOrigin, credentials: true }));
app.get("/health", (_req, res) => res.json({ ok: true, rooms: rooms.size }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: corsOrigin, credentials: true },
  pingTimeout: PING_TIMEOUT_MS,
  pingInterval: PING_INTERVAL_MS,
});

io.on("connection", (socket) => {
  socket.on(EVENTS.JOIN_ROOM, ({ roomId, peerId, requestedRole }) => {
    if (typeof roomId !== "string" || !roomId.trim() || typeof peerId !== "string" || !peerId.trim()) {
      socket.emit(EVENTS.ROOM_FULL, { roomId });
      socket.disconnect(true);
      return;
    }

    const normalizedRoomId = roomId.trim();
    const normalizedPeerId = peerId.trim();
    const room = getRoomMembers(normalizedRoomId);
    const existing = room.get(normalizedPeerId) ?? null;
    const replacingExistingSocket = existing && existing.socketId !== socket.id;

    if (!existing && room.size >= MAX_ROOM_PEERS) {
      socket.emit(EVENTS.ROOM_FULL, { roomId: normalizedRoomId });
      socket.disconnect(true);
      return;
    }

    if (replacingExistingSocket) {
      const previousSocket = io.sockets.sockets.get(existing.socketId);
      previousSocket?.leave(normalizedRoomId);
      previousSocket?.disconnect(true);
    }

    const requested = normalizeRequestedRole(requestedRole);
    const hostExists = Boolean(findHost(normalizedRoomId, normalizedPeerId));
    const role = existing?.role
      ?? (requested === "host" && !hostExists
        ? "host"
        : requested === "speaker"
          ? "speaker"
          : "listener");

    socket.data.roomId = normalizedRoomId;
    socket.data.peerId = normalizedPeerId;
    socket.data.role = role;

    socket.join(normalizedRoomId);
    room.set(normalizedPeerId, {
      peerId: normalizedPeerId,
      role,
      socketId: socket.id,
      joinedAt: new Date().toISOString(),
    });

    const peers = listPeers(normalizedRoomId, normalizedPeerId);

    socket.emit(EVENTS.JOINED_ROOM, {
      roomId: normalizedRoomId,
      peerId: normalizedPeerId,
      role,
      reconnected: Boolean(existing),
      peers,
    });

    if (role === "host" && peers.length > 0) {
      socket.emit(EVENTS.PEER_JOINED, { peerId: peers[0].peerId, reconnected: Boolean(existing) });
    }

    if (role !== "host") {
      const host = findHost(normalizedRoomId, normalizedPeerId);
      if (host) {
        socket.to(normalizedRoomId).emit(EVENTS.PEER_JOINED, {
          peerId: normalizedPeerId,
          role,
          reconnected: Boolean(existing),
        });
      }
    }
  });

  socket.on(EVENTS.REQUEST_RENEGOTIATION, (payload) => {
    if (!payload?.roomId || payload.roomId !== socket.data.roomId) return;
    socket.to(payload.roomId).emit(EVENTS.REQUEST_RENEGOTIATION, {
      roomId: payload.roomId,
      from: socket.data.peerId,
    });
  });

  socket.on(EVENTS.OFFER, (payload) => {
    if (!payload?.roomId || payload.roomId !== socket.data.roomId) return;
    socket.to(payload.roomId).emit(EVENTS.OFFER, payload);
  });

  socket.on(EVENTS.ANSWER, (payload) => {
    if (!payload?.roomId || payload.roomId !== socket.data.roomId) return;
    socket.to(payload.roomId).emit(EVENTS.ANSWER, payload);
  });

  socket.on(EVENTS.ICE_CANDIDATE, (payload) => {
    if (!payload?.roomId || payload.roomId !== socket.data.roomId) return;
    socket.to(payload.roomId).emit(EVENTS.ICE_CANDIDATE, payload);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    const peerId = socket.data.peerId;
    if (!roomId || !peerId) return;

    const room = rooms.get(roomId);
    const member = room?.get(peerId);
    if (member?.socketId !== socket.id) return;

    removeMember(roomId, peerId);
    socket.to(roomId).emit(EVENTS.PEER_LEFT, { peerId });
  });
});

server.listen(PORT, () => {
  console.log(`[signaling] listening on http://localhost:${PORT}`);
});
