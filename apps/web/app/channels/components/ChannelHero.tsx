"use client";

import { ChannelMenu } from "./ChannelMenu";

type ChannelHeroProps = {
  channelName: string;
  userId: string;
  bio?: string;
  avatarUrl?: string;
  headerUrl?: string;
  liveCount?: number;
  upcomingCount?: number;
  archiveCount?: number;
  basePath: string;
  active: "overview" | "schedule";
  labels?: {
    upcoming: string;
    archive: string;
    noBio: string;
  };
};

export function ChannelHero({
  channelName,
  userId,
  bio,
  avatarUrl,
  headerUrl,
  liveCount,
  upcomingCount,
  archiveCount,
  basePath,
  active,
  labels,
}: ChannelHeroProps) {
  const displayBio = bio?.trim();

  return (
    <section className="w-full border-b border-white/10 bg-[var(--brand-bg-900)]">
      <div className="relative h-44 w-full overflow-hidden sm:h-56">
        {headerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={headerUrl} alt={`${channelName} header`} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[var(--brand-surface)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-bg-900)]/90 via-transparent to-black/30" />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="flex flex-wrap items-start gap-4 pb-4 pt-4 sm:pb-5 sm:pt-5">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-[var(--brand-surface)] sm:h-28 sm:w-28">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={channelName} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-[linear-gradient(140deg,rgba(111,79,238,0.35),rgba(18,22,40,0.92))] text-3xl font-black text-[var(--brand-primary)]">
                {channelName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{channelName}</h1>
            <p className="mt-1 text-sm text-[var(--brand-text-muted)]">@{userId}</p>
            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-[var(--brand-text)]">
              {displayBio || labels?.noBio || "No bio yet."}
            </p>
          </div>

          {(typeof liveCount === "number" || typeof upcomingCount === "number" || typeof archiveCount === "number") && (
            <div className="grid min-w-[220px] grid-cols-3 gap-2 self-center rounded-xl bg-black/35 p-2 text-center backdrop-blur">
              <div>
                <p className="text-[10px] text-[var(--brand-text-muted)]">LIVE</p>
                <p className="text-lg font-black text-[var(--brand-accent)]">{liveCount ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--brand-text-muted)]">{labels?.upcoming ?? "Upcoming"}</p>
                <p className="text-lg font-black text-[var(--brand-primary)]">{upcomingCount ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--brand-text-muted)]">{labels?.archive ?? "Archive"}</p>
                <p className="text-lg font-black text-[var(--brand-text)]">{archiveCount ?? 0}</p>
              </div>
            </div>
          )}
        </div>

        <ChannelMenu basePath={basePath} active={active} />
      </div>
    </section>
  );
}
