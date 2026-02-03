"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("test");

  return (
    <main style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1>WebRTC P2P Test</h1>
      <input value={roomId} onChange={(e) => setRoomId(e.target.value)} />
      <button style={{ marginLeft: 8 }} onClick={() => router.push(`/room/${encodeURIComponent(roomId)}`)}>
        Join
      </button>
    </main>
  );
}
