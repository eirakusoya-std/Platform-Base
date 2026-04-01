"use client";

import Link from "next/link";

type ChannelMenuProps = {
  basePath: string;
  active: "overview" | "schedule";
};

export function ChannelMenu({ basePath, active }: ChannelMenuProps) {
  return (
    <nav className="mt-5 inline-flex items-center gap-1 rounded-xl bg-[var(--brand-bg-900)] p-1">
      <Link
        href={basePath}
        className={`rounded-lg px-4 py-2 text-sm font-semibold ${
          active === "overview"
            ? "bg-[var(--brand-primary)] text-white"
            : "text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
        }`}
      >
        概要
      </Link>
      <Link
        href={`${basePath}/schedule`}
        className={`rounded-lg px-4 py-2 text-sm font-semibold ${
          active === "schedule"
            ? "bg-[var(--brand-primary)] text-white"
            : "text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
        }`}
      >
        スケジュール
      </Link>
    </nav>
  );
}

