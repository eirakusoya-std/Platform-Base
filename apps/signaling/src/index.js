import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const EVENTS = {
  JOIN_ROOM: "join-room",
  PEER_JOINED: "peer-joined",
  OFFER: "offer",
  ANSWER: "answer",
  ICE_CANDIDATE: "ice-candidate",
  PEER_LEFT: "peer-left",
};

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

io.on("connection", (socket) => {
  // 参加: 2人制限 + role返す
  socket.on(EVENTS.JOIN_ROOM, ({ roomId, peerId }) => {
    socket.data.roomId = roomId;
    socket.data.peerId = peerId;

    const room = io.sockets.adapter.rooms.get(roomId);
    const count = room ? room.size : 0;

    if (count >= 2) {
      socket.emit("room-full", { roomId });
      socket.disconnect(true);
      return;
    }

    socket.join(roomId);

    const role = count === 0 ? "host" : "guest";
    socket.emit("joined-room", { roomId, peerId, role });

    // 2人目が入ったら、既存側に通知（ホストがoffer作れる）
    if (role === "guest") {
      socket.to(roomId).emit(EVENTS.PEER_JOINED, { peerId });
    }
  });

  // 中継
  socket.on(EVENTS.OFFER, (payload) => socket.to(payload.roomId).emit(EVENTS.OFFER, payload));
  socket.on(EVENTS.ANSWER, (payload) => socket.to(payload.roomId).emit(EVENTS.ANSWER, payload));
  socket.on(EVENTS.ICE_CANDIDATE, (payload) => socket.to(payload.roomId).emit(EVENTS.ICE_CANDIDATE, payload));

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    const peerId = socket.data.peerId;
    if (roomId && peerId) socket.to(roomId).emit(EVENTS.PEER_LEFT, { peerId });
  });
});

const PORT = Number(process.env.PORT ?? 3001);
server.listen(PORT, () => console.log(`[signaling] http://172.16.20.211:${PORT}`));
