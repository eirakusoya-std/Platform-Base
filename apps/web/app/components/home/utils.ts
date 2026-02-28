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
      return { label: "先着順", bg: "bg-blue-50 text-blue-700 border border-blue-200", icon: "🎯" };
    case "Lottery":
      return { label: "抽選制", bg: "bg-purple-50 text-purple-700 border border-purple-200", icon: "🎲" };
    case "Members-only":
      return { label: "メンバー限定", bg: "bg-amber-50 text-amber-700 border border-amber-200", icon: "👑" };
    default:
      return { label: "配信", bg: "bg-gray-100 text-gray-600", icon: "📺" };
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
