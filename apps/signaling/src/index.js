import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { EVENTS } from "@repo/shared";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

io.on("connection", (socket) => {
  socket.on(EVENTS.JOIN_ROOM, ({ roomId, peerId }) => {
    socket.data.roomId = roomId;
    socket.data.peerId = peerId;
    socket.join(roomId);
    socket.to(roomId).emit(EVENTS.PEER_JOINED, { peerId });
  });

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
server.listen(PORT, () => console.log(`[signaling] http://localhost:${PORT}`));
