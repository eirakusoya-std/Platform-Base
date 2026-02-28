import { MouseEvent } from "react";
import { ScheduleItem } from "../types";

type ScheduleSectionProps = {
  scheduleByDate: Record<string, ScheduleItem[]>;
  activeDate: string;
  reservedSet: Set<number>;
  onDateChange: (date: string) => void;
  onToggleReserve: (event: MouseEvent, sessionId: number) => void;
  onParticipate: (sessionId: number) => void;
};

export function ScheduleSection({
  scheduleByDate,
  activeDate,
  reservedSet,
  onDateChange,
  onToggleReserve,
  onParticipate,
}: ScheduleSectionProps) {
  return (
    <section className="border-t border-gray-100 pb-16 pt-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5">
            <span className="text-xs">🕒</span>
            <span className="text-xs font-bold tracking-widest text-gray-600">SCHEDULE</span>
          </div>
          <p className="text-sm text-gray-500">今後の配信予定 - 事前予約で参加枠を確保</p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
          {Object.keys(scheduleByDate).map((date) => (
            <button
              key={date}
              onClick={() => onDateChange(date)}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                activeDate === date ? "bg-white text-[#1e3a5f] shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {date}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {(scheduleByDate[activeDate] ?? []).map((item) => {
          const hasReserved = reservedSet.has(item.id) || item.hasReserved;
          return (
            <div
              key={item.id}
              className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all hover:border-gray-300 hover:shadow-sm"
            >
              <div className="min-w-[52px]">
                <span className="tabular-nums text-sm font-bold text-[#1e3a5f]">{item.time}</span>
              </div>

              <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200">
                <img src={item.thumbnail} alt={item.vtuber} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">{item.vtuber}</p>
                <p className="truncate text-xs text-gray-500">{item.title}</p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                {item.isMembersOnly && (
                  <span className="flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">
                    🔒 メンバー限定
                  </span>
                )}
                {item.isLottery && (
                  <span className="flex items-center gap-1 rounded border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] font-medium text-purple-700">
                    🎲 抽選制
                  </span>
                )}
                {hasReserved && (
                  <span className="flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
                    ✅ 予約済み
                  </span>
                )}
              </div>

              {!hasReserved ? (
                <button
                  className="flex-shrink-0 rounded-lg bg-[#1e3a5f] px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-all hover:bg-[#2d5080] group-hover:opacity-100"
                  onClick={(event) => {
                    onToggleReserve(event, item.id);
                    onParticipate(item.id);
                  }}
                >
                  予約する
                </button>
              ) : (
                <button
                  className="flex-shrink-0 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 opacity-0 transition-all hover:bg-gray-200 group-hover:opacity-100"
                  onClick={(event) => onToggleReserve(event, item.id)}
                >
                  予約取消
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
