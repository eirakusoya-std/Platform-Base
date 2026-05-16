"use client";

import { useEffect, useRef, useState } from "react";
import { FunnelIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useI18n } from "../../lib/i18n";
import { categoryLabel } from "../../lib/labels";

type VTuberResult = {
  id: string;
  name: string;
  channelName?: string;
  avatarUrl?: string;
};

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
  const router = useRouter();

  const [vtubers, setVtubers] = useState<VTuberResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    if (!q) {
      setVtubers([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { users: VTuberResult[] };
        setVtubers(data.users);
        setOpen(data.users.length > 0);
        setActiveIndex(-1);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function navigateTo(userId: string) {
    setOpen(false);
    onSearchChange("");
    router.push(`/channels/${userId}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, vtubers.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const target = vtubers[activeIndex];
      if (target) navigateTo(target.id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="sticky top-[72px] z-30 bg-[var(--brand-bg-900)]/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-8 py-3">
        <div ref={containerRef} className="relative max-w-sm flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-text-muted)]" aria-hidden />
          <input
            type="text"
            placeholder={tx("VTuber名・配信タイトルで検索", "Search VTuber or stream title")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (vtubers.length > 0) setOpen(true); }}
            className="w-full rounded-lg bg-[var(--brand-surface)] py-2 pl-9 pr-8 text-sm text-[var(--brand-text)] placeholder-[var(--brand-text-muted)] transition-all focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => { onSearchChange(""); setOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
              aria-label={tx("検索をクリア", "Clear search")}
            >
              <XMarkIcon className="h-4 w-4" aria-hidden />
            </button>
          )}

          {/* VTuber search dropdown */}
          {open && (
            <div className="absolute left-0 top-full mt-1 w-full overflow-hidden rounded-xl bg-[var(--brand-surface)] shadow-lg shadow-black/30 ring-1 ring-white/5">
              {searching && (
                <p className="px-4 py-2.5 text-xs text-[var(--brand-text-muted)]">
                  {tx("検索中...", "Searching...")}
                </p>
              )}
              {!searching && vtubers.length === 0 && (
                <p className="px-4 py-2.5 text-xs text-[var(--brand-text-muted)]">
                  {tx("見つかりませんでした", "No results")}
                </p>
              )}
              {vtubers.map((v, i) => (
                <button
                  key={v.id}
                  onMouseDown={() => navigateTo(v.id)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === activeIndex
                      ? "bg-[var(--brand-primary)]/20 text-[var(--brand-text)]"
                      : "text-[var(--brand-text)] hover:bg-[var(--brand-bg-900)]"
                  }`}
                >
                  {v.avatarUrl ? (
                    <img
                      src={v.avatarUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/20 text-xs font-bold text-[var(--brand-primary)]">
                      {(v.channelName ?? v.name).slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{v.channelName ?? v.name}</p>
                    {v.channelName && v.channelName !== v.name && (
                      <p className="truncate text-[10px] text-[var(--brand-text-muted)]">{v.name}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="h-6 w-px bg-[var(--brand-surface)]" />
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-surface)] px-2.5 py-1 text-xs text-[var(--brand-text-muted)]">
            <FunnelIcon className="h-3.5 w-3.5" aria-hidden />
            {tx("フィルタ", "Filters")}
          </span>
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
              {categoryLabel(tag, tx)}
            </button>
          ))}
        </div>
        {activeTags.length > 0 && (
          <button
            onClick={onClearTags}
            className="flex items-center gap-1 text-xs text-[var(--brand-text-muted)] transition-colors hover:text-[var(--brand-text)]"
          >
            <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
            {tx("クリア", "Clear")}
          </button>
        )}
      </div>
    </div>
  );
}
