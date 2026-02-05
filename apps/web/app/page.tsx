"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function generateRoomId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function HomePage() {
  const router = useRouter();

  const [roomIdInput, setRoomIdInput] = useState("");

  // ✅ SSRではまだnull。クライアントで生成する
  const [suggestedRoomId, setSuggestedRoomId] = useState<string | null>(null);

  useEffect(() => {
    setSuggestedRoomId(generateRoomId());
  }, []);

  function createRoom() {
    if (!suggestedRoomId) return;
    router.push(`/room/${suggestedRoomId}`);
  }

  function joinRoom() {
    const id = roomIdInput.trim();
    if (!id) return;
    router.push(`/room/${encodeURIComponent(id)}`);
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>WebRTCtest</h1>
        <p style={styles.desc}>部屋を作ってリンクを共有すると、2人で通話できます。</p>

        <div style={{ marginTop: 18 }}>
          <div style={styles.label}>Create a room</div>
          <div style={styles.row}>
            <code style={styles.code}>
              {suggestedRoomId ?? "--------"}
            </code>
            <button
              style={{
                ...styles.primaryBtn,
                opacity: suggestedRoomId ? 1 : 0.5,
                cursor: suggestedRoomId ? "pointer" : "not-allowed",
              }}
              onClick={createRoom}
              disabled={!suggestedRoomId}
            >
              Create
            </button>
          </div>
          <div style={styles.hint}>
            Create を押すと /room/&lt;roomId&gt; に移動します。
          </div>
        </div>

        {/* 以下 Join UI はそのままでOK */}
        {/* ... */}
      </div>
    </div>
  );
}


const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0b0b",
    color: "#eee",
    padding: 16,
    fontFamily: "system-ui",
  },
  card: {
    width: "min(720px, 100%)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  },
  title: { fontSize: 28, margin: 0 },
  desc: { marginTop: 8, opacity: 0.85, lineHeight: 1.5 },
  label: { fontSize: 12, opacity: 0.75, marginBottom: 8 },
  row: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  code: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    fontSize: 14,
  },
  input: {
    flex: 1,
    minWidth: 240,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    color: "#eee",
    outline: "none",
  },
  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(90,214,125,0.7)",
    background: "rgba(90,214,125,0.15)",
    color: "#d7ffe1",
    cursor: "pointer",
    fontWeight: 700,
  },
  secondaryBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.06)",
    color: "#eee",
    cursor: "pointer",
    fontWeight: 700,
  },
  hint: { marginTop: 8, fontSize: 12, opacity: 0.75 },
  hr: { margin: "18px 0", borderColor: "rgba(255,255,255,0.12)" },
};
