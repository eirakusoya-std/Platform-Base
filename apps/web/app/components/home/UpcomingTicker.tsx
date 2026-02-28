import { StartingSoonSession } from "./types";

type UpcomingTickerProps = {
    sessions: StartingSoonSession[];
    onParticipate: (sessionId: number) => void;
};

export function UpcomingTicker({ sessions, onParticipate }: UpcomingTickerProps) {
    return (
        <div className="border-b border-gray-100 bg-gray-50/50">
            <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-8 py-2">
                <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="flex h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                    <span className="text-[10px] font-bold tracking-wider text-amber-700">UPCOMING</span>
                </div>

                <div className="flex flex-1 items-center gap-6 overflow-x-auto no-scrollbar">
                    {sessions.map((s) => (
                        <div
                            key={s.id}
                            className="group flex cursor-pointer items-center gap-3 whitespace-nowrap py-1 transition-all hover:opacity-80"
                            onClick={() => onParticipate(s.id)}
                        >
                            <div className="h-6 w-10 overflow-hidden rounded bg-gray-200">
                                <img src={s.thumbnail} alt={s.vtuber} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-900 leading-tight">{s.vtuber}</span>
                                <span className="text-[9px] text-gray-500 leading-tight truncate max-w-[120px]">{s.title}</span>
                            </div>
                            <div className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                                参加受付中
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
