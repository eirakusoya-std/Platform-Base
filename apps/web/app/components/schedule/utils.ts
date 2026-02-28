import { BookingStatus, ScheduleEvent, TimeSlot } from "./types";

export function buildTimeSlots(startHour: number, endHour: number, stepMinutes = 30): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let minutes = startHour * 60; minutes < endHour * 60; minutes += stepMinutes) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    slots.push({ key: `${hh}:${mm}`, label: `${hh}:${mm}`, minutes });
  }
  return slots;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function eventStartsAtSlot(event: ScheduleEvent, slotMinutes: number): boolean {
  return toMinutes(event.start) === slotMinutes;
}

export function eventSpansSlots(event: ScheduleEvent, slotMinutes: number): boolean {
  const start = toMinutes(event.start);
  const end = start + event.durationMin;
  return slotMinutes >= start && slotMinutes < end;
}

export function statusLabel(status: BookingStatus): string {
  if (status === "available") return "予約可";
  if (status === "booked") return "予約済";
  return "抽選";
}

export function statusStyle(status: BookingStatus): string {
  if (status === "available") return "bg-[#1e3a5f] text-white";
  if (status === "booked") return "bg-gray-100 text-gray-500";
  return "bg-purple-100 text-purple-700";
}

export function statusDot(status: BookingStatus): string {
  if (status === "available") return "bg-[#1e3a5f]";
  if (status === "booked") return "bg-gray-400";
  return "bg-purple-500";
}
