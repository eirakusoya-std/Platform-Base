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

export function statusLabel(status: BookingStatus, tx: (jp: string, en: string) => string): string {
  if (status === "available") return tx("予約可", "Available");
  if (status === "booked") return tx("予約済", "Reserved");
  return tx("抽選", "Lottery");
}

export function statusStyle(status: BookingStatus): string {
  if (status === "available") return "bg-[var(--brand-primary)] text-[var(--brand-bg-900)]";
  if (status === "booked") return "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]";
  return "bg-[var(--brand-accent)]/20 text-[var(--brand-accent)]";
}

export function statusDot(status: BookingStatus): string {
  if (status === "available") return "bg-[var(--brand-primary)]";
  if (status === "booked") return "bg-[var(--brand-text-muted)]";
  return "bg-[var(--brand-accent)]";
}
