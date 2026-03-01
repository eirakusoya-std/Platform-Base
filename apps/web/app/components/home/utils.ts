import { ParticipationType, TypeInfo } from "./types";

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "まもなく開始";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatCountdownLabel(seconds: number): string {
  if (seconds <= 0) return "まもなく開始";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}時間${m}分後`;
  return `${m}分後に開始`;
}

export function getTypeInfo(type: ParticipationType | "First-come" | "Lottery"): TypeInfo {
  switch (type) {
    case "First-come":
      return { label: "先着順", bg: "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]", icon: "🎯" };
    case "Lottery":
      return { label: "抽選制", bg: "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]", icon: "🎲" };
    case "Members-only":
      return { label: "メンバー限定", bg: "bg-[var(--brand-accent)]/20 text-[var(--brand-accent)]", icon: "👑" };
    default:
      return { label: "配信", bg: "bg-[var(--brand-surface)] text-[var(--brand-text-muted)]", icon: "📺" };
  }
}

export function matchesFilter(
  item: { vtuber: string; title: string; tags: string[] },
  searchQuery: string,
  activeTags: string[],
): boolean {
  if (searchQuery && !item.vtuber.includes(searchQuery) && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
    return false;
  }
  if (activeTags.length > 0 && !activeTags.some((tag) => item.tags.includes(tag))) {
    return false;
  }
  return true;
}
