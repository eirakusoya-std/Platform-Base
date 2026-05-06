import { ParticipationType, TypeInfo } from "./types";

type Translate = (jp: string, en: string) => string;

export function formatCountdown(seconds: number, tx: Translate): string {
  if (seconds <= 0) return tx("まもなく開始", "Starting soon");
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatCountdownLabel(seconds: number, tx: Translate): string {
  if (seconds <= 0) return tx("まもなく開始", "Starting soon");
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return tx(`${h}時間${m}分後`, `Starts in ${h}h ${m}m`);
  return tx(`${m}分後に開始`, `Starts in ${m}m`);
}

export function getTypeInfo(type: ParticipationType | "First-come" | "Lottery", tx: Translate): TypeInfo {
  switch (type) {
    case "First-come":
      return { label: tx("先着順", "First-come"), bg: "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]", icon: "FC" };
    case "Lottery":
      return { label: tx("抽選制", "Lottery"), bg: "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]", icon: "LT" };
    case "Members-only":
      return { label: tx("メンバー限定", "Members only"), bg: "bg-[var(--brand-accent)]/20 text-[var(--brand-accent)]", icon: "MB" };
    default:
      return { label: tx("配信", "Stream"), bg: "bg-[var(--brand-surface)] text-[var(--brand-text-muted)]", icon: "LV" };
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
