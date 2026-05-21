"use client";

import { useState } from "react";
import type { Reservation } from "../../lib/apiTypes";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminReservationsPage() {
  const [sessionId, setSessionId] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function search() {
    const id = sessionId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    setSearched(false);
    try {
      const res = await fetch(`/api/admin/reservations?sessionId=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { reservations?: Reservation[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setReservations(data.reservations ?? []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const speakers = reservations.filter((r) => r.type === "speaker" && r.status === "reserved");
  const listeners = reservations.filter((r) => r.type === "listener" && r.status === "reserved");
  const cancelled = reservations.filter((r) => r.status === "cancelled");

  return (
    <div className="min-h-screen bg-[#0d0d12] p-8 text-white">
      <h1 className="mb-6 text-xl font-bold">Admin — 予約者一覧</h1>

      <div className="mb-6 flex gap-2">
        <input
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void search(); }}
          placeholder="Session ID"
          className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm outline-none placeholder:text-white/30 focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={loading || !sessionId.trim()}
          className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "検索中..." : "検索"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {searched && (
        <div className="space-y-4">
          <p className="text-xs text-white/50">
            スピーカー: {speakers.length} / リスナー: {listeners.length} / キャンセル: {cancelled.length}
          </p>

          {speakers.length > 0 && (
            <Section title="スピーカー">
              {speakers.map((r) => <Row key={r.reservationId} r={r} />)}
            </Section>
          )}
          {listeners.length > 0 && (
            <Section title="リスナー">
              {listeners.map((r) => <Row key={r.reservationId} r={r} />)}
            </Section>
          )}
          {cancelled.length > 0 && (
            <Section title="キャンセル済み">
              {cancelled.map((r) => <Row key={r.reservationId} r={r} />)}
            </Section>
          )}
          {reservations.length === 0 && (
            <p className="rounded-xl bg-white/5 px-4 py-8 text-center text-sm text-white/40">
              予約者はまだいません。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ r }: { r: Reservation }) {
  const isPaid = Boolean(r.paymentIntentId);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-300">
        {r.userName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{r.userName}</p>
        <p className="font-mono text-[10px] text-white/30">{r.userId}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-white/40">{formatDate(r.createdAt)}</p>
        {r.type === "speaker" && (
          <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${isPaid ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"}`}>
            {isPaid ? "支払済" : "未払い"}
          </span>
        )}
      </div>
    </div>
  );
}
