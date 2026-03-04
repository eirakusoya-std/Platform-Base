"use client";

import { useI18n } from "../../lib/i18n";

type SearchFilterBarProps = {
 tags: string[];
 searchQuery: string;
 activeTags: string[];
 onSearchChange: (value: string) => void;
 onToggleTag: (tag: string) => void;
 onClearTags: () => void;
};

export function SearchFilterBar({
 tags,
 searchQuery,
 activeTags,
 onSearchChange,
 onToggleTag,
 onClearTags,
}: SearchFilterBarProps) {
  const { tx } = useI18n();

  return (
    <div className="sticky top-[72px] z-30 bg-[var(--brand-bg-900)]/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-8 py-3">
        <div className="relative max-w-sm flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-text-muted)]">🔍</span>
          <input
            type="text"
            placeholder={tx("VTuber名・配信タイトルで検索", "Search VTuber or stream title")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg bg-[var(--brand-surface)] py-2 pl-9 pr-8 text-sm text-[var(--brand-text)] placeholder-[var(--brand-text-muted)] transition-all focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
            >
              ✕
            </button>
          )}
        </div>
        <div className="h-6 w-px bg-[var(--brand-surface)]" />
        <div className="flex items-center gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                activeTags.includes(tag)
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "bg-[var(--brand-surface)] text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        {activeTags.length > 0 && (
          <button
            onClick={onClearTags}
            className="flex items-center gap-1 text-xs text-[var(--brand-text-muted)] transition-colors hover:text-[var(--brand-text)]"
          >
            {tx("クリア", "Clear")}
          </button>
        )}
      </div>
    </div>
  );
}
