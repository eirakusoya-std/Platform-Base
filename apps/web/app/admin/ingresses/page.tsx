"use client";

// SOLID: S（LiveKit Ingress管理の一時的なAdminページ）
import { useCallback, useEffect, useState } from "react";

type Ingress = {
  ingressId: string;
  name: string;
  roomName: string;
  streamKey: string;
  rtmpUrl: string;
  state: string;
};

export default function AdminIngressPage() {
  const [ingresses, setIngresses] = useState<Ingress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ingresses");
      const data = (await res.json()) as { ingresses?: Ingress[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setIngresses(data.ingresses ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ingresses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = async (ingressId: string) => {
    if (!confirm(`Delete ingress ${ingressId}?`)) return;
    setDeleting(ingressId);
    try {
      const res = await fetch("/api/admin/ingresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingressId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Delete ALL ${ingresses.length} ingresses? This cannot be undone.`)) return;
    for (const ing of ingresses) {
      await handleDelete(ing.ingressId);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--brand-bg-900)] p-8 text-[var(--brand-text)]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">LiveKit Ingress Manager</h1>
            <p className="mt-1 text-sm text-[var(--brand-text-muted)]">Temporary admin page</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void load()}
              className="rounded-lg bg-[var(--brand-surface-soft)] px-4 py-2 text-sm"
            >
              Refresh
            </button>
            {ingresses.length > 0 && (
              <button
                onClick={() => void handleDeleteAll()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete All ({ingresses.length})
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/15 p-3 text-sm text-red-400">{error}</div>
        )}

        {loading ? (
          <p className="text-[var(--brand-text-muted)]">Loading...</p>
        ) : ingresses.length === 0 ? (
          <div className="rounded-2xl bg-[var(--brand-surface)] p-8 text-center text-[var(--brand-text-muted)]">
            No ingresses found.
          </div>
        ) : (
          <div className="space-y-3">
            {ingresses.map((ing) => (
              <div key={ing.ingressId} className="rounded-2xl bg-[var(--brand-surface)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold">{ing.name || "(no name)"}</p>
                    <p className="text-xs text-[var(--brand-text-muted)]">ID: {ing.ingressId}</p>
                    <p className="text-xs text-[var(--brand-text-muted)]">Room: {ing.roomName || "—"}</p>
                    <p className="text-xs text-[var(--brand-text-muted)]">State: {ing.state}</p>
                  </div>
                  <button
                    onClick={() => void handleDelete(ing.ingressId)}
                    disabled={deleting === ing.ingressId}
                    className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting === ing.ingressId ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
