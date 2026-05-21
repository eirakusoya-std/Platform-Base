"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDisplay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const ITEM_HEIGHT = 36; // px per scroll item

type Props = {
  value: string; // "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  minDate?: Date;
};

export function DateTimePicker({ value, onChange, minDate }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  const parsed = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());

  const selectedYear = parsed.getFullYear();
  const selectedMonth = parsed.getMonth();
  const selectedDay = parsed.getDate();
  const selectedHour = parsed.getHours();
  const selectedMinute = parsed.getMinutes();

  // Scroll to selected hour/minute when popover opens
  useEffect(() => {
    if (!open) return;
    // nearest valid minute option
    const nearestMinuteIdx = MINUTE_OPTIONS.reduce((best, m, i) =>
      Math.abs(m - selectedMinute) < Math.abs(MINUTE_OPTIONS[best] - selectedMinute) ? i : best, 0);

    requestAnimationFrame(() => {
      hourRef.current?.scrollTo({ top: selectedHour * ITEM_HEIGHT, behavior: "instant" });
      minuteRef.current?.scrollTo({ top: nearestMinuteIdx * ITEM_HEIGHT, behavior: "instant" });
    });
  }, [open, selectedHour, selectedMinute]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function buildIso(y: number, mo: number, d: number, h: number, mi: number) {
    return `${y}-${pad(mo + 1)}-${pad(d)}T${pad(h)}:${pad(mi)}`;
  }

  function selectDay(day: number) {
    onChange(buildIso(viewYear, viewMonth, day, selectedHour, selectedMinute));
  }

  function setHour(h: number) {
    onChange(buildIso(selectedYear, selectedMonth, selectedDay, h, selectedMinute));
  }

  function setMinute(m: number) {
    onChange(buildIso(selectedYear, selectedMonth, selectedDay, selectedHour, m));
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const today = new Date();
  const isSelectedMonth = viewYear === selectedYear && viewMonth === selectedMonth;

  function isDayDisabled(day: number) {
    if (!minDate) return false;
    return new Date(viewYear, viewMonth, day, 23, 59) < minDate;
  }

  // Nearest valid minute for display preview
  const previewMinute = MINUTE_OPTIONS.includes(selectedMinute)
    ? selectedMinute
    : MINUTE_OPTIONS.reduce((best, m) =>
        Math.abs(m - selectedMinute) < Math.abs(best - selectedMinute) ? m : best, 0);

  const previewText = `${selectedMonth + 1}/${selectedDay} ${pad(selectedHour)}:${pad(previewMinute)}`;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl bg-[var(--brand-bg-900)] px-3 py-2.5 text-sm text-[var(--brand-text)] transition-colors hover:bg-[var(--brand-surface)] focus:outline-none"
      >
        <CalendarDaysIcon className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" aria-hidden />
        <span className="flex-1 text-left font-medium">
          {value ? formatDisplay(parsed) : "日時を選択"}
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[300px] rounded-2xl border border-white/8 bg-[var(--brand-surface)] p-3 shadow-2xl shadow-black/50">
          {/* Month navigation */}
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={prevMonth} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--brand-text-muted)] hover:bg-[var(--brand-bg-900)] hover:text-[var(--brand-text)]">
              <ChevronLeftIcon className="h-4 w-4" aria-hidden />
            </button>
            <span className="text-sm font-bold text-[var(--brand-text)]">
              {viewYear}年 {MONTHS[viewMonth]}
            </span>
            <button type="button" onClick={nextMonth} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--brand-text-muted)] hover:bg-[var(--brand-bg-900)] hover:text-[var(--brand-text)]">
              <ChevronRightIcon className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {WEEKDAYS.map((d, i) => (
              <span key={d} className={`py-0.5 text-[10px] font-semibold ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-[var(--brand-text-muted)]"}`}>
                {d}
              </span>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
              const isSelected = isSelectedMonth && selectedDay === day;
              const disabled = isDayDisabled(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => { if (!disabled) selectDay(day); }}
                  disabled={disabled}
                  className={`mx-auto my-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-[var(--brand-primary)] font-bold text-white"
                      : isToday
                        ? "ring-1 ring-[var(--brand-primary)] text-[var(--brand-primary)]"
                        : disabled
                          ? "cursor-not-allowed text-[var(--brand-text-muted)]/25"
                          : "text-[var(--brand-text)] hover:bg-[var(--brand-bg-900)]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time picker */}
          <div className="mt-3 border-t border-white/8 pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-text-muted)]">時刻</p>
            <div className="flex items-center gap-2">
              {/* Hour scroll — scrollbar hidden via overflow trick */}
              <div className="flex-1 overflow-hidden rounded-xl bg-[var(--brand-bg-900)]">
                <div
                  ref={hourRef}
                  style={{ height: ITEM_HEIGHT * 4, overflowY: "scroll", scrollbarWidth: "none", msOverflowStyle: "none" }}
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore — WebKit proprietary
                  css={{ "&::-webkit-scrollbar": { display: "none" } }}
                >
                  <style>{`#hour-scroll::-webkit-scrollbar{display:none}`}</style>
                  {HOUR_OPTIONS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHour(h)}
                      style={{ height: ITEM_HEIGHT }}
                      className={`block w-full text-center text-sm font-medium transition-colors ${
                        selectedHour === h
                          ? "bg-[var(--brand-primary)] text-white"
                          : "text-[var(--brand-text-muted)] hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text)]"
                      }`}
                    >
                      {pad(h)}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-lg font-bold text-[var(--brand-text-muted)]">:</span>
              {/* Minute scroll */}
              <div className="flex-1 overflow-hidden rounded-xl bg-[var(--brand-bg-900)]">
                <div
                  ref={minuteRef}
                  style={{ height: ITEM_HEIGHT * 4, overflowY: "scroll", scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {MINUTE_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinute(m)}
                      style={{ height: ITEM_HEIGHT }}
                      className={`block w-full text-center text-sm font-medium transition-colors ${
                        previewMinute === m
                          ? "bg-[var(--brand-primary)] text-white"
                          : "text-[var(--brand-text-muted)] hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text)]"
                      }`}
                    >
                      {pad(m)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview + confirm */}
          <div className="mt-3 flex items-center gap-2 border-t border-white/8 pt-3">
            <span className="flex-1 rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-center text-sm font-bold tabular-nums text-[var(--brand-text)]">
              {previewText}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-bold text-white transition-colors hover:brightness-110"
            >
              決定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
