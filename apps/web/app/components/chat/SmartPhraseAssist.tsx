"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChatBubbleLeftRightIcon,
  ChevronUpIcon,
  StarIcon,
} from "@heroicons/react/24/solid";

export type SmartPhraseSessionState = "waiting" | "intro" | "game" | "ending";

type PhraseCategory = "greeting" | "reaction" | "game" | "question" | "support" | "ending";

type Phrase = {
  id: string;
  ja: string;
  romaji: string;
  en: string;
  category: PhraseCategory;
};

type PhraseGroup = {
  id: PhraseCategory;
  label: string;
};

type SmartPhraseAssistProps = {
  sessionState: SmartPhraseSessionState;
  onSendPhrase: (phrase: string) => void;
  onInsertPhrase: (phrase: string) => void;
  className?: string;
};

const STORAGE_KEY = "aiment.smartPhraseAssist.v1";
const LONG_PRESS_MS = 520;

const GROUPS: PhraseGroup[] = [
  { id: "greeting", label: "あいさつ" },
  { id: "reaction", label: "リアクション" },
  { id: "game", label: "ゲーム" },
  { id: "question", label: "質問" },
  { id: "support", label: "応援" },
  { id: "ending", label: "しめ" },
];

const PHRASES_BY_STATE: Record<SmartPhraseSessionState, Phrase[]> = {
  waiting: [
    { id: "waiting-hello", ja: "こんにちは！", romaji: "Konnichiwa!", en: "Hello!", category: "greeting" },
    { id: "waiting-first", ja: "初見です！", romaji: "Shoken desu!", en: "First time watching!", category: "greeting" },
    { id: "waiting-ph", ja: "フィリピンから見てます！", romaji: "Firipin kara mitemasu!", en: "Watching from the Philippines!", category: "greeting" },
    { id: "waiting-excited", ja: "楽しみ！", romaji: "Tanoshimi!", en: "I'm excited!", category: "reaction" },
    { id: "waiting-waited", ja: "待ってました！", romaji: "Mattemashita!", en: "I've been waiting!", category: "reaction" },
    { id: "waiting-ready", ja: "準備できました！", romaji: "Junbi dekimashita!", en: "I'm ready!", category: "support" },
  ],
  intro: [
    { id: "intro-evening", ja: "こんばんは！", romaji: "Konbanwa!", en: "Good evening!", category: "greeting" },
    { id: "intro-nice", ja: "よろしくお願いします！", romaji: "Yoroshiku onegaishimasu!", en: "Nice to meet you!", category: "greeting" },
    { id: "intro-happy", ja: "会えてうれしい！", romaji: "Aete ureshii!", en: "I'm happy to see you!", category: "reaction" },
    { id: "intro-voice", ja: "声かわいい！", romaji: "Koe kawaii!", en: "Your voice is cute!", category: "reaction" },
    { id: "intro-cute-today", ja: "今日もかわいい！", romaji: "Kyou mo kawaii!", en: "Cute as always today!", category: "reaction" },
    { id: "intro-what-today", ja: "今日は何をしますか？", romaji: "Kyou wa nani o shimasu ka?", en: "What will you do today?", category: "question" },
  ],
  game: [
    { id: "game-nice", ja: "ナイス！", romaji: "Naisu!", en: "Nice!", category: "game" },
    { id: "game-good", ja: "うまい！", romaji: "Umai!", en: "You're good!", category: "game" },
    { id: "game-close", ja: "惜しい！", romaji: "Oshii!", en: "That was close!", category: "game" },
    { id: "game-strong", ja: "強い！", romaji: "Tsuyoi!", en: "So strong!", category: "reaction" },
    { id: "game-again", ja: "もう一回！", romaji: "Mou ikkai!", en: "One more time!", category: "reaction" },
    { id: "game-fight", ja: "がんばって！", romaji: "Ganbatte!", en: "You can do it!", category: "support" },
    { id: "game-ok", ja: "大丈夫！", romaji: "Daijoubu!", en: "It's okay!", category: "support" },
    { id: "game-what-game", ja: "これは何のゲームですか？", romaji: "Kore wa nan no geemu desu ka?", en: "What game is this?", category: "question" },
  ],
  ending: [
    { id: "ending-thanks", ja: "ありがとう！", romaji: "Arigatou!", en: "Thank you!", category: "ending" },
    { id: "ending-good-work", ja: "おつかれさま！", romaji: "Otsukaresama!", en: "Good work!", category: "ending" },
    { id: "ending-fun", ja: "楽しかった！", romaji: "Tanoshikatta!", en: "That was fun!", category: "reaction" },
    { id: "ending-again", ja: "また見に来ます！", romaji: "Mata mi ni kimasu!", en: "I'll come watch again!", category: "support" },
    { id: "ending-see-you", ja: "またね！", romaji: "Mata ne!", en: "See you!", category: "greeting" },
    { id: "ending-night", ja: "おやすみ！", romaji: "Oyasumi!", en: "Good night!", category: "greeting" },
  ],
};

type StoredSmartPhrases = {
  pinnedIds?: string[];
  usageCounts?: Record<string, number>;
};

function readStoredSmartPhrases(): StoredSmartPhrases {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredSmartPhrases;
    return {
      pinnedIds: Array.isArray(parsed.pinnedIds) ? parsed.pinnedIds : [],
      usageCounts: parsed.usageCounts && typeof parsed.usageCounts === "object" ? parsed.usageCounts : {},
    };
  } catch {
    return {};
  }
}

export function SmartPhraseAssist({ sessionState, onSendPhrase, onInsertPhrase, className = "" }: SmartPhraseAssistProps) {
  const [expanded, setExpanded] = useState(false);
  const [sentPhraseId, setSentPhraseId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const longPressTimerRef = useRef<number | null>(null);
  const longPressHandledRef = useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = readStoredSmartPhrases();
      setPinnedIds(stored.pinnedIds ?? []);
      setUsageCounts(stored.usageCounts ?? {});
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ pinnedIds, usageCounts }));
  }, [pinnedIds, usageCounts]);

  useEffect(() => {
    if (!sentPhraseId) return;
    const timeout = window.setTimeout(() => setSentPhraseId(null), 850);
    return () => window.clearTimeout(timeout);
  }, [sentPhraseId]);

  const phrases = useMemo(() => {
    return [...PHRASES_BY_STATE[sessionState]].sort((a, b) => {
      const pinnedScore = Number(pinnedIds.includes(b.id)) - Number(pinnedIds.includes(a.id));
      if (pinnedScore !== 0) return pinnedScore;
      return (usageCounts[b.id] ?? 0) - (usageCounts[a.id] ?? 0);
    });
  }, [pinnedIds, sessionState, usageCounts]);

  const activeGroups = useMemo(() => {
    const groupIds = new Set(phrases.map((phrase) => phrase.category));
    return GROUPS.filter((group) => groupIds.has(group.id));
  }, [phrases]);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleSend = (phrase: Phrase) => {
    setSentPhraseId(phrase.id);
    setUsageCounts((prev) => ({ ...prev, [phrase.id]: (prev[phrase.id] ?? 0) + 1 }));
    onSendPhrase(phrase.ja);
  };

  const handleInsert = (phrase: Phrase) => {
    onInsertPhrase(phrase.ja);
  };

  const togglePinned = (phraseId: string) => {
    setPinnedIds((prev) => (prev.includes(phraseId) ? prev.filter((id) => id !== phraseId) : [phraseId, ...prev]));
  };

  return (
    <div className={`relative ${className}`.trim()}>
      {expanded ? (
        <div className="mb-2 max-h-[280px] overflow-y-auto rounded-2xl border border-white/10 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--brand-bg-800)_90%,#ffffff_10%),color-mix(in_srgb,var(--brand-primary)_18%,var(--brand-bg-900)_82%))] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-[var(--brand-text)]">日本語フレーズ</p>
              <p className="text-[11px] text-[var(--brand-text-muted)]">Tap to send, hold to edit</p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Smart Phrase Assistを閉じる"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[var(--brand-text)] transition hover:bg-white/15"
            >
              <ChevronUpIcon className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="space-y-3">
            {activeGroups.map((group) => {
              const groupPhrases = phrases.filter((phrase) => phrase.category === group.id);
              return (
                <section key={group.id}>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--brand-secondary)]">{group.label}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {groupPhrases.map((phrase) => {
                      const pinned = pinnedIds.includes(phrase.id);
                      const sent = sentPhraseId === phrase.id;
                      return (
                        <div
                          key={phrase.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (longPressHandledRef.current) {
                              longPressHandledRef.current = false;
                              return;
                            }
                            handleSend(phrase);
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            handleSend(phrase);
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            handleInsert(phrase);
                          }}
                          onPointerDown={() => {
                            longPressHandledRef.current = false;
                            clearLongPressTimer();
                            longPressTimerRef.current = window.setTimeout(() => {
                              longPressHandledRef.current = true;
                              handleInsert(phrase);
                            }, LONG_PRESS_MS);
                          }}
                          onPointerUp={clearLongPressTimer}
                          onPointerCancel={clearLongPressTimer}
                          onPointerLeave={clearLongPressTimer}
                          className="group relative min-h-[74px] cursor-pointer rounded-xl border border-white/10 bg-white/[0.075] px-3 py-2 text-left shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition duration-150 hover:scale-[1.018] hover:border-[var(--brand-secondary)]/45 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-secondary)]/70"
                        >
                          <span className="absolute right-2 top-2 flex items-center gap-1">
                            {sent ? (
                              <span className="rounded-full bg-[var(--brand-secondary)] px-2 py-0.5 text-[10px] font-bold text-black shadow-lg shadow-[var(--brand-secondary)]/20">
                                Sent
                              </span>
                            ) : null}
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label={pinned ? "ピン留めを解除" : "ピン留め"}
                              onClick={(event) => {
                                event.stopPropagation();
                                togglePinned(phrase.id);
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== "Enter" && event.key !== " ") return;
                                event.preventDefault();
                                event.stopPropagation();
                                togglePinned(phrase.id);
                              }}
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition ${
                                pinned ? "bg-[var(--brand-secondary)] text-black" : "bg-black/20 text-white/55 hover:text-white"
                              }`}
                            >
                              <StarIcon className="h-3.5 w-3.5" aria-hidden />
                            </span>
                          </span>
                          <span className="block pr-16 text-base font-bold leading-snug text-[var(--brand-text)]">{phrase.ja}</span>
                          <span className="mt-1 block text-xs leading-snug text-[var(--brand-secondary)]">{phrase.romaji}</span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-[var(--brand-text-muted)]">{phrase.en}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--brand-primary)_28%,var(--brand-bg-900)_72%),color-mix(in_srgb,var(--brand-secondary)_16%,var(--brand-bg-900)_84%))] px-3 py-2 text-sm font-bold text-[var(--brand-text)] shadow-[0_12px_28px_rgba(0,0,0,0.22)] transition hover:scale-[1.01] hover:border-white/20"
        aria-expanded={expanded}
      >
        <span className="inline-flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="h-4 w-4 text-[var(--brand-secondary)]" aria-hidden />
          日本語でコメント
        </span>
        <span className={`text-[11px] text-[var(--brand-text-muted)] transition ${expanded ? "rotate-180" : ""}`}>↑</span>
      </button>
    </div>
  );
}
