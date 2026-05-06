export type BookingStatus = "available" | "booked" | "lottery";

export type SessionCategory = "雑談" | "ゲーム" | "歌枠" | "英語";

export type Talent = {
  id: string;
  name: string;
  avatar: string;
  specialty: SessionCategory;
};

export type ScheduleEvent = {
  id: string;
  sessionId: string;
  date: string;
  talentId: string;
  title: string;
  start: string; // HH:mm
  durationMin: number;
  status: BookingStatus;
  category: SessionCategory;
};

export type TimeSlot = {
  key: string;
  label: string;
  minutes: number;
};
