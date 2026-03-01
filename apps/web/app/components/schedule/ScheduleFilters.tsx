import { SessionCategory } from "./types";

type ScheduleFiltersProps = {
  dates: string[];
  selectedDate: string;
  talentQuery: string;
  startHour: number;
  endHour: number;
  onlyAvailable: boolean;
  selectedCategories: SessionCategory[];
  onDateChange: (date: string) => void;
  onTalentQueryChange: (value: string) => void;
  onStartHourChange: (value: number) => void;
  onEndHourChange: (value: number) => void;
  onOnlyAvailableChange: (value: boolean) => void;
  onToggleCategory: (category: SessionCategory) => void;
};

const CATEGORIES: SessionCategory[] = ["雑談", "ゲーム", "歌枠", "英語"];

function formatDateLabel(date: string): string {
  const [year, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)} (${year})`;
}

export function ScheduleFilters({
  dates,
  selectedDate,
  talentQuery,
  startHour,
  endHour,
  onlyAvailable,
  selectedCategories,
  onDateChange,
  onTalentQueryChange,
  onStartHourChange,
  onEndHourChange,
  onOnlyAvailableChange,
  onToggleCategory,
}: ScheduleFiltersProps) {
  return (
    <section className="rounded-2xl bg-[var(--brand-surface)] p-4 shadow-lg shadow-black/25">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {dates.map((date) => (
          <button
            key={date}
            onClick={() => onDateChange(date)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              selectedDate === date
                ? "bg-[var(--brand-primary)] text-[var(--brand-bg-900)]"
                : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
            }`}
          >
            {formatDateLabel(date)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-text-muted)]">🔎</span>
          <input
            value={talentQuery}
            onChange={(e) => onTalentQueryChange(e.target.value)}
            placeholder="名前で検索（例: ルミナ）"
            className="w-full rounded-md bg-[var(--brand-bg-900)] py-2 pl-9 pr-3 text-sm text-[var(--brand-text)] outline-none placeholder:text-[var(--brand-text-muted)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--brand-text)]">
            <span>開始</span>
            <select
              value={startHour}
              onChange={(e) => onStartHourChange(Number(e.target.value))}
              className="rounded-md bg-[var(--brand-bg-900)] px-2 py-1 text-sm text-[var(--brand-text)] outline-none"
            >
              {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                <option key={hour} value={hour}>
                  {String(hour).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--brand-text)]">
            <span>終了</span>
            <select
              value={endHour}
              onChange={(e) => onEndHourChange(Number(e.target.value))}
              className="rounded-md bg-[var(--brand-bg-900)] px-2 py-1 text-sm text-[var(--brand-text)] outline-none"
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map((hour) => (
                <option key={hour} value={hour}>
                  {String(hour).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-md bg-[var(--brand-bg-900)] px-2 py-1.5 text-sm text-[var(--brand-text)]">
            <input type="checkbox" checked={onlyAvailable} onChange={(e) => onOnlyAvailableChange(e.target.checked)} />
            <span>予約可能のみ</span>
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((category) => {
          const selected = selectedCategories.includes(category);
          return (
            <button
              key={category}
              onClick={() => onToggleCategory(category)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                selected
                  ? "bg-[var(--brand-primary)] text-[var(--brand-bg-900)]"
                  : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </section>
  );
}
