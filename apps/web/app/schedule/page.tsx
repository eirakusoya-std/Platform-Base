"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "../components/home/Footer";
import { TopNav } from "../components/home/TopNav";
import { SCHEDULE_DATES, SCHEDULE_EVENTS, TALENTS } from "../components/schedule/data";
import { ScheduleFilters } from "../components/schedule/ScheduleFilters";
import { ScheduleGrid } from "../components/schedule/ScheduleGrid";
import { SessionCategory } from "../components/schedule/types";
import { buildTimeSlots } from "../components/schedule/utils";

export default function SchedulePage() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(SCHEDULE_DATES[0]);
  const [startHour, setStartHour] = useState(10);
  const [endHour, setEndHour] = useState(16);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<SessionCategory[]>([]);

  const slots = useMemo(() => buildTimeSlots(startHour, endHour), [startHour, endHour]);

  const filteredEvents = useMemo(() => {
    return SCHEDULE_EVENTS.filter((event) => {
      if (event.date !== selectedDate) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(event.category)) return false;
      if (onlyAvailable && event.status !== "available") return false;
      return true;
    });
  }, [selectedDate, selectedCategories, onlyAvailable]);

  const handleToggleCategory = (category: SessionCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category],
    );
  };

  const handleStartHourChange = (value: number) => {
    setStartHour(value);
    if (value >= endHour) setEndHour(Math.min(24, value + 1));
  };

  const handleEndHourChange = (value: number) => {
    setEndHour(value);
    if (value <= startHour) setStartHour(Math.max(0, value - 1));
  };

  const handleReserve = (sessionId: number) => {
    router.push(`/join/${encodeURIComponent(String(sessionId))}`);
  };

  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      <TopNav />

      <main className="mx-auto max-w-[1400px] px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">配信スケジュール</h1>
          <p className="mt-1 text-sm text-gray-600">時間帯とタレントを比較して、予約可能な枠をすばやく選べます。</p>
        </div>

        <div className="space-y-5">
          <ScheduleFilters
            dates={SCHEDULE_DATES}
            selectedDate={selectedDate}
            startHour={startHour}
            endHour={endHour}
            onlyAvailable={onlyAvailable}
            selectedCategories={selectedCategories}
            onDateChange={setSelectedDate}
            onStartHourChange={handleStartHourChange}
            onEndHourChange={handleEndHourChange}
            onOnlyAvailableChange={setOnlyAvailable}
            onToggleCategory={handleToggleCategory}
          />

          <ScheduleGrid talents={TALENTS} slots={slots} events={filteredEvents} onReserve={handleReserve} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
