"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { TopNav } from "../../../../components/home/TopNav";
import { useI18n } from "../../../../lib/i18n";
import { useUserSession } from "../../../../lib/userSession";
import { getStreamSession, updateStreamSession, type StreamSession } from "../../../../lib/streamSessions";

const CATEGORY_OPTIONS = ["雑談", "ゲーム", "歌枠", "英語"] as const;

export default function SessionEditPage() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = decodeURIComponent(params.sessionId ?? "");
  const { tx } = useI18n();
  const { isVtuber, hydrated } = useUserSession();

  const [session, setSession] = useState<StreamSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("雑談");
  const [slotsTotal, setSlotsTotal] = useState(50);
  const [speakerSlotsTotal, setSpeakerSlotsTotal] = useState(5);
  const [speakerRequiredPlan, setSpeakerRequiredPlan] = useState<"free" | "supporter" | "premium">("free");
  const [requiredPlan, setRequiredPlan] = useState<"free" | "supporter" | "premium">("free");
  const [reservationRequired, setReservationRequired] = useState(false);

  async function load() {
    setLoading(true);
    const data = await getStreamSession(sessionId);
    if (!data) {
      setError(tx("枠が見つかりませんでした。", "Session not found."));
      setLoading(false);
      return;
    }
    if (data.status === "live") {
      setError(tx("配信中の枠は編集できません。", "Cannot edit a live session."));
      setLoading(false);
      return;
    }
    setSession(data);
    setTitle(data.title);
    setDescription(data.description ?? "");
    setCategory(data.category ?? "雑談");
    setSlotsTotal(data.slotsTotal);
    setSpeakerSlotsTotal(data.speakerSlotsTotal);
    setSpeakerRequiredPlan((data.speakerRequiredPlan as "free" | "supporter" | "premium") ?? "free");
    setRequiredPlan((data.requiredPlan as "free" | "supporter" | "premium") ?? "free");
    setReservationRequired(data.reservationRequired ?? false);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hydrated) return;
    if (!isVtuber) {
      router.replace("/");
      return;
    }
    void load();
  }, [hydrated, isVtuber, sessionId]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    setError(null);
    setSuccess(false);

    if (title.trim().length < 2) {
      setError(tx("タイトルを入力してください。", "Please enter a title."));
      return;
    }

    setSaving(true);
    const updated = await updateStreamSession(sessionId, {
      title: title.trim(),
      description: description.trim(),
      category,
      slotsTotal,
      speakerSlotsTotal,
      speakerRequiredPlan,
      requiredPlan,
      reservationRequired,
    });
    setSaving(false);

    if (!updated) {
      setError(tx("保存に失敗しました。", "Failed to save."));
      return;
    }

    setSession(updated);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  if (!hydrated || !isVtuber) return null;

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav mode="studio" />

      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/studio/sessions" className="text-sm text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]">
            ← {tx("枠一覧", "My Sessions")}
          </Link>
        </div>

        <h1 className="mb-6 text-2xl font-bold">{tx("配信枠を編集", "Edit Session")}</h1>

        {loading ? (
          <div className="py-20 text-center text-sm text-[var(--brand-text-muted)]">{tx("読み込み中...", "Loading...")}</div>
        ) : error && !session ? (
          <div className="rounded-xl bg-[var(--brand-accent)]/15 px-4 py-4 text-sm text-[var(--brand-accent)]">{error}</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-[var(--brand-accent)]/15 px-4 py-3 text-sm text-[var(--brand-accent)]">{error}</div>
            )}
            {success && (
              <div className="rounded-xl bg-green-500/15 px-4 py-3 text-sm text-green-400">{tx("保存しました。", "Saved.")}</div>
            )}

            <label className="grid gap-1.5 text-sm">
              <span className="text-[var(--brand-text-muted)]">{tx("タイトル", "Title")}</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl bg-[var(--brand-surface)] px-4 py-2.5 text-[var(--brand-text)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="text-[var(--brand-text-muted)]">{tx("カテゴリ", "Category")}</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl bg-[var(--brand-surface)] px-4 py-2.5 text-[var(--brand-text)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="text-[var(--brand-text-muted)]">{tx("概要", "Description")}</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="rounded-xl bg-[var(--brand-surface)] px-4 py-2.5 text-[var(--brand-text)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-1.5 text-sm">
                <span className="text-[var(--brand-text-muted)]">{tx("リスナー枠数", "Listener Slots")}</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={slotsTotal}
                  onChange={(e) => setSlotsTotal(Math.max(1, Number(e.target.value)))}
                  className="rounded-xl bg-[var(--brand-surface)] px-4 py-2.5 text-[var(--brand-text)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="text-[var(--brand-text-muted)]">{tx("必要プラン", "Required Plan")}</span>
                <select
                  value={requiredPlan}
                  onChange={(e) => setRequiredPlan(e.target.value as "free" | "supporter" | "premium")}
                  className="rounded-xl bg-[var(--brand-surface)] px-4 py-2.5 text-[var(--brand-text)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  <option value="free">{tx("なし", "None (free)")}</option>
                  <option value="supporter">Supporter</option>
                  <option value="premium">Premium</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-1.5 text-sm">
                <span className="text-[var(--brand-text-muted)]">{tx("スピーカー枠数", "Speaker Slots")}</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={speakerSlotsTotal}
                  onChange={(e) => setSpeakerSlotsTotal(Math.max(1, Number(e.target.value)))}
                  className="rounded-xl bg-[var(--brand-surface)] px-4 py-2.5 text-[var(--brand-text)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="text-[var(--brand-text-muted)]">{tx("スピーカー必要プラン", "Speaker Plan")}</span>
                <select
                  value={speakerRequiredPlan}
                  onChange={(e) => setSpeakerRequiredPlan(e.target.value as "free" | "supporter" | "premium")}
                  className="rounded-xl bg-[var(--brand-surface)] px-4 py-2.5 text-[var(--brand-text)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  <option value="free">{tx("なし", "None (free)")}</option>
                  <option value="supporter">Supporter</option>
                  <option value="premium">Premium</option>
                </select>
              </label>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-[var(--brand-surface)] px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={reservationRequired}
                onChange={(e) => setReservationRequired(e.target.checked)}
                className="h-4 w-4 accent-[var(--brand-primary)]"
              />
              <span>{tx("事前予約必須", "Require prior reservation")}</span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <Link
                href="/studio/sessions"
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
              >
                {tx("キャンセル", "Cancel")}
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[var(--brand-primary)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_6px_20px_rgba(124,106,230,0.4)] transition-all hover:brightness-110 disabled:opacity-50"
              >
                {saving ? tx("保存中...", "Saving...") : tx("保存する", "Save")}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
