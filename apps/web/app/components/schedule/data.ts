import { ScheduleEvent, Talent } from "./types";

export const SCHEDULE_DATES = ["2026-03-08", "2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12"];

export const TALENTS: Talent[] = [
  { id: "luna", name: "夜城ルミナ", avatar: "/image/thumbnail/thumbnail_1.png", specialty: "ゲーム" },
  { id: "rizel", name: "焔角リゼル", avatar: "/image/thumbnail/thumbnail_2.png", specialty: "ゲーム" },
  { id: "noelna", name: "白雪ノエルナ", avatar: "/image/thumbnail/thumbnail_3.png", specialty: "雑談" },
  { id: "eruna", name: "陽葵エルナ", avatar: "/image/thumbnail/thumbnail_5.png", specialty: "英語" },
  { id: "polaris", name: "星宮ポラリス & 桜庭メイカ", avatar: "/image/thumbnail/thumbnail_4.png", specialty: "ゲーム" },
];

export const SCHEDULE_EVENTS: ScheduleEvent[] = [
  { id: 1, sessionId: 1, date: "2026-03-08", talentId: "luna", title: "【侵食エンド】サバイバル建国", start: "10:00", durationMin: 60, status: "available", category: "ゲーム" },
  { id: 2, sessionId: 2, date: "2026-03-08", talentId: "rizel", title: "【初見】DARK SOULS本気攻略", start: "10:30", durationMin: 60, status: "lottery", category: "ゲーム" },
  { id: 3, sessionId: 3, date: "2026-03-08", talentId: "noelna", title: "お昼のまったり夜カフェ", start: "11:00", durationMin: 30, status: "booked", category: "雑談" },
  { id: 4, sessionId: 11, date: "2026-03-08", talentId: "polaris", title: "視聴者参加型！ガチレース", start: "11:30", durationMin: 60, status: "available", category: "ゲーム" },
  { id: 5, sessionId: 10, date: "2026-03-08", talentId: "eruna", title: "初心者向け英会話レッスン", start: "12:30", durationMin: 30, status: "available", category: "英語" },
  { id: 6, sessionId: 1, date: "2026-03-08", talentId: "luna", title: "マイクラ文明再建計画", start: "13:00", durationMin: 60, status: "booked", category: "ゲーム" },
  { id: 7, sessionId: 10, date: "2026-03-08", talentId: "eruna", title: "夕方リアル英語トーク", start: "14:00", durationMin: 30, status: "available", category: "英語" },

  { id: 8, sessionId: 1, date: "2026-03-09", talentId: "luna", title: "エンド異変調査隊", start: "10:30", durationMin: 60, status: "available", category: "ゲーム" },
  { id: 9, sessionId: 2, date: "2026-03-09", talentId: "rizel", title: "ダクソ・ボアラッシュ", start: "12:00", durationMin: 60, status: "lottery", category: "ゲーム" },
  { id: 10, sessionId: 3, date: "2026-03-09", talentId: "noelna", title: "夜カフェ雑談フリートーク", start: "14:00", durationMin: 60, status: "available", category: "雑談" },

  { id: 11, sessionId: 3, date: "2026-03-10", talentId: "noelna", title: "コーヒー片手に悩み相談", start: "11:00", durationMin: 60, status: "available", category: "雑談" },
  { id: 12, sessionId: 11, date: "2026-03-10", talentId: "polaris", title: "ガチレース耐久コラボ", start: "13:30", durationMin: 60, status: "booked", category: "ゲーム" },

  { id: 13, sessionId: 10, date: "2026-03-11", talentId: "eruna", title: "今日から使える英語テンプレ", start: "12:30", durationMin: 60, status: "available", category: "英語" },
  { id: 14, sessionId: 2, date: "2026-03-11", talentId: "rizel", title: "ダクソ・リベンジマッチ", start: "14:30", durationMin: 60, status: "booked", category: "ゲーム" },

  { id: 15, sessionId: 3, date: "2026-03-12", talentId: "noelna", title: "週末リラックス雑談", start: "11:30", durationMin: 60, status: "lottery", category: "雑談" },
  { id: 16, sessionId: 1, date: "2026-03-12", talentId: "luna", title: "マイクラ建国・城作り", start: "13:00", durationMin: 30, status: "available", category: "ゲーム" },
];
