export function SlotBar({ left, total, size = "md" }: { left: number; total: number; size?: "sm" | "md" }) {
  const pct = (left / total) * 100;
  const urgency = pct <= 25 ? "urgent" : pct <= 50 ? "warning" : "normal";
  const barColor = urgency === "urgent" ? "bg-red-500" : urgency === "warning" ? "bg-amber-500" : "bg-emerald-500";
  const textColor = urgency === "urgent" ? "text-red-600" : urgency === "warning" ? "text-amber-600" : "text-emerald-600";
  const h = size === "sm" ? "h-1" : "h-1.5";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-medium text-gray-500">参加枠の残り</span>
        <span className={`text-xs font-bold ${textColor} ${urgency === "urgent" ? "animate-pulse" : ""}`}>
          {left} / {total}
        </span>
      </div>
      <div className={`${h} overflow-hidden rounded-full bg-gray-200`}>
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
