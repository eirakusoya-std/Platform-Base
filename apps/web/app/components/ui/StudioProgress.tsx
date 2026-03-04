"use client";

import { useI18n } from "../../lib/i18n";

type StudioStage = "prelive" | "live" | "end";

type StudioProgressProps = {
  current: StudioStage;
  orientation?: "horizontal" | "vertical";
};

const STAGES: { key: StudioStage; jp: string; en: string }[] = [
  { key: "prelive", jp: "Pre-Live", en: "Pre-Live" },
  { key: "live", jp: "配信中", en: "Live" },
  { key: "end", jp: "終了", en: "End" },
];

export function StudioProgress({ current, orientation = "horizontal" }: StudioProgressProps) {
  const { tx } = useI18n();
  const currentIndex = STAGES.findIndex((s) => s.key === current);

  if (orientation === "vertical") {
    return (
      <div className="flex h-full flex-col items-center justify-start gap-1 py-2">
        {STAGES.map((stage, index) => {
          const active = index === currentIndex;
          const done = index < currentIndex;
          return (
            <div key={stage.key} className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${
                  active
                    ? "bg-[var(--brand-primary)] text-white"
                    : done
                      ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]"
                      : "bg-[var(--brand-surface)] text-[var(--brand-text-muted)]"
                }`}
              >
                {index + 1}
              </div>
              <span className={`mt-1 text-[10px] ${active ? "text-[var(--brand-text)]" : "text-[var(--brand-text-muted)]"}`}>{tx(stage.jp, stage.en)}</span>
              {index < STAGES.length - 1 && <div className="my-1 h-6 w-px bg-[var(--brand-surface)]" />}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mb-3 flex items-center gap-2 overflow-x-auto">
      {STAGES.map((stage, index) => {
        const active = index === currentIndex;
        const done = index < currentIndex;
        return (
          <div
            key={stage.key}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              active
                ? "bg-[var(--brand-primary)] text-white"
                : done
                  ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]"
                  : "bg-[var(--brand-surface)] text-[var(--brand-text-muted)]"
            }`}
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/20 text-[10px]">{index + 1}</span>
            <span>{tx(stage.jp, stage.en)}</span>
          </div>
        );
      })}
    </div>
  );
}
