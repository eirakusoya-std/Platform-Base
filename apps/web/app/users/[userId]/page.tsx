"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useI18n } from "../../lib/i18n";
import type { PublicUserProfile } from "../../lib/server/aimentStore";

const LANGUAGE_LEVEL_LABEL: Record<string, { jp: string; en: string }> = {
  beginner:     { jp: "初心者",       en: "Beginner" },
  elementary:   { jp: "初級",         en: "Elementary" },
  intermediate: { jp: "中級",         en: "Intermediate" },
  advanced:     { jp: "上級",         en: "Advanced" },
  native:       { jp: "ネイティブ",   en: "Native" },
};

const STATUS_LABEL: Record<string, { jp: string; en: string }> = {
  prelive: { jp: "待機中", en: "Ready" },
  live:    { jp: "配信中", en: "Live" },
  ended:   { jp: "終了",   en: "Ended" },
};

const ROLE_LABEL: Record<string, { jp: string; en: string }> = {
  speaker:  { jp: "スピーカー", en: "Speaker" },
  listener: { jp: "リスナー",   en: "Listener" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" });
}

export default function UserProfilePage() {
  const { tx } = useI18n();
  const params = useParams<{ userId: string }>();
  const userId = decodeURIComponent(params?.userId ?? "");

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const load = async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`);
      if (!mounted) return;
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      if (!res.ok) { setLoading(false); return; }
      const { profile: data } = (await res.json()) as { profile: PublicUserProfile };
      if (mounted) { setProfile(data); setLoading(false); }
    };
    void load();
    return () => { mounted = false; };
  }, [userId]);

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[var(--brand-bg-900)]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]">
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            {tx("戻る", "Back")}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading ? (
          <div className="py-20 text-center text-sm text-[var(--brand-text-muted)]">{tx("読み込み中...", "Loading...")}</div>
        ) : notFound || !profile ? (
          <div className="py-20 text-center">
            <p className="text-sm text-[var(--brand-text-muted)]">{tx("ユーザーが見つかりませんでした。", "User not found.")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[var(--brand-surface)]">
                {profile.avatarUrl ? (
                  <Image src={profile.avatarUrl} alt={profile.name} width={80} height={80} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-2xl font-extrabold text-[var(--brand-text-muted)]">
                    {profile.name.trim().charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <h1 className="text-xl font-extrabold">{profile.name}</h1>
                <p className="mt-0.5 text-xs text-[var(--brand-text-muted)]">
                  {tx("aiment歴", "Member since")} {formatDate(profile.createdAt)}
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.country && (
                    <span className="rounded-full bg-[var(--brand-surface)] px-2.5 py-1 text-xs text-[var(--brand-text-muted)]">
                      🌏 {profile.country}
                    </span>
                  )}
                  {profile.languageLevel && (
                    <span className="rounded-full bg-[var(--brand-primary)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--brand-primary)]">
                      {tx(
                        LANGUAGE_LEVEL_LABEL[profile.languageLevel]?.jp ?? profile.languageLevel,
                        LANGUAGE_LEVEL_LABEL[profile.languageLevel]?.en ?? profile.languageLevel,
                      )}
                    </span>
                  )}
                </div>

                {(profile.snsTwitter || profile.snsYoutube) && (
                  <div className="mt-2 flex gap-3">
                    {profile.snsTwitter && (
                      <a href={`https://x.com/${profile.snsTwitter.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]">
                        𝕏 @{profile.snsTwitter.replace(/^@/, "")}
                      </a>
                    )}
                    {profile.snsYoutube && (
                      <a href={profile.snsYoutube.startsWith("http") ? profile.snsYoutube : `https://youtube.com/@${profile.snsYoutube}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]">
                        ▶ YouTube
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="rounded-2xl bg-[var(--brand-surface)] p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--brand-text)]">{profile.bio}</p>
              </div>
            )}

            {/* Session history */}
            <section>
              <h2 className="mb-3 text-sm font-bold text-[var(--brand-text-muted)]">
                {tx("参加した配信", "Sessions Participated")} ({profile.sessionHistory.length})
              </h2>

              {profile.sessionHistory.length === 0 ? (
                <p className="text-sm text-[var(--brand-text-muted)]">{tx("まだ参加した配信はありません。", "No sessions yet.")}</p>
              ) : (
                <div className="space-y-2">
                  {profile.sessionHistory.map((s) => (
                    <Link
                      key={`${s.sessionId}-${s.role}`}
                      href={`/join/${encodeURIComponent(s.sessionId)}`}
                      className="flex items-center gap-3 rounded-xl bg-[var(--brand-surface)] p-3 transition-colors hover:bg-[var(--brand-surface)]/80"
                    >
                      {s.thumbnail && (
                        <Image src={s.thumbnail} alt={s.title} width={56} height={40} className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{s.title}</p>
                        <p className="text-xs text-[var(--brand-text-muted)]">{s.hostName} · {formatSessionDate(s.startsAt)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                          s.role === "speaker"
                            ? "bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]"
                            : "bg-white/10 text-[var(--brand-text-muted)]"
                        }`}>
                          {tx(ROLE_LABEL[s.role]?.jp ?? s.role, ROLE_LABEL[s.role]?.en ?? s.role)}
                        </span>
                        <span className="text-[9px] text-[var(--brand-text-muted)]">
                          {tx(STATUS_LABEL[s.status]?.jp ?? s.status, STATUS_LABEL[s.status]?.en ?? s.status)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
