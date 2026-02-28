import { SessionCategory } from "./types";

type ScheduleFiltersProps = {
  dates: string[];
  selectedDate: string;
  startHour: number;
  endHour: number;
  onlyAvailable: boolean;
  selectedCategories: SessionCategory[];
  onDateChange: (date: string) => void;
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
  startHour,
  endHour,
  onlyAvailable,
  selectedCategories,
  onDateChange,
  onStartHourChange,
  onEndHourChange,
  onOnlyAvailableChange,
  onToggleCategory,
}: ScheduleFiltersProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {dates.map((date) => (
          <button
            key={date}
            onClick={() => onDateChange(date)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${selectedDate === date ? "bg-[#1e3a5f] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            {formatDateLabel(date)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>開始</span>
          <select
            value={startHour}
            onChange={(e) => onStartHourChange(Number(e.target.value))}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
          >
            {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
              <option key={hour} value={hour}>
                {String(hour).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>終了</span>
          <select
            value={endHour}
            onChange={(e) => onEndHourChange(Number(e.target.value))}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
          >
            {Array.from({ length: 24 }, (_, i) => i + 1).map((hour) => (
              <option key={hour} value={hour}>
                {String(hour).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-700">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => onOnlyAvailableChange(e.target.checked)} />
          <span>予約可能のみ</span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((category) => {
          const selected = selectedCategories.includes(category);
          return (
            <button
              key={category}
              onClick={() => onToggleCategory(category)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${selected ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"}`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </section>
  );
}
