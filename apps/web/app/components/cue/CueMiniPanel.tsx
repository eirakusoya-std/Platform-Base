"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createRoot, type Root } from "react-dom/client";

export type CueCategory = "movement" | "flow" | "reaction" | "help";

export type Cue = {
  id: string;
  english: string;
  japanese: string;
  icon: string;
  category: CueCategory;
};

export type CueEvent = {
  sessionId: string;
  cueId: string;
  english: string;
  japanese: string;
  icon: string;
  category: CueCategory;
  createdAt: string;
};

type CueMiniPanelProps = {
  sessionId: string;
  onSendCue?: (cueEvent: CueEvent) => void;
  className?: string;
};

type CueButtonProps = {
  cue: Cue;
  onClick: (cue: Cue) => void;
};

const CUE_STORAGE_KEY = "aiment.cue-mini-panel.cues.v1";

type DocumentPictureInPictureController = {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
};

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureController;
  }
}

const DEFAULT_CUES: Cue[] = [
  {
    id: "wait",
    english: "Wait!",
    japanese: "待って！",
    icon: "",
    category: "flow",
  },
  {
    id: "nice",
    english: "Nice!",
    japanese: "ナイス！",
    icon: "",
    category: "reaction",
  },
  {
    id: "your-turn",
    english: "Your turn!",
    japanese: "あなたの番！",
    icon: "",
    category: "flow",
  },
  {
    id: "come-here",
    english: "Come here!",
    japanese: "こっち来て！",
    icon: "",
    category: "movement",
  },
  {
    id: "look-here",
    english: "Look here!",
    japanese: "ここ見て！",
    icon: "",
    category: "help",
  },
  {
    id: "one-more-time",
    english: "One more time!",
    japanese: "もう一回！",
    icon: "",
    category: "flow",
  },
];

function normalizeCue(raw: Partial<Cue>, index: number): Cue {
  return {
    id: raw.id || `custom-${index}-${Date.now()}`,
    english: raw.english ?? "New cue",
    japanese: raw.japanese ?? "新しいキュー",
    icon: "",
    category: "flow",
  };
}

function loadStoredCues(): Cue[] {
  if (typeof window === "undefined") return DEFAULT_CUES;
  try {
    const raw = window.localStorage.getItem(CUE_STORAGE_KEY);
    if (!raw) return DEFAULT_CUES;
    const parsed = JSON.parse(raw) as Partial<Cue>[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CUES;
    return parsed.map(normalizeCue);
  } catch {
    return DEFAULT_CUES;
  }
}

function saveStoredCues(cues: Cue[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUE_STORAGE_KEY, JSON.stringify(cues));
}

const panelStyles: Record<string, CSSProperties> = {
  shell: {
    boxSizing: "border-box",
    minHeight: "100vh",
    margin: 0,
    padding: 10,
    background: "#1a1d25",
    color: "#ededed",
    fontFamily:
      '"Afacad Flux", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif',
  },
  card: {
    boxSizing: "border-box",
    minHeight: 220,
    borderRadius: 18,
    padding: 12,
    background: "#1a1d25",
    border: "none",
    boxShadow: "none",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  title: {
    margin: 0,
    fontSize: 16,
    lineHeight: "20px",
    fontWeight: 800,
  },
  session: {
    margin: 0,
    maxWidth: 88,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "rgba(237,237,237,0.58)",
    fontSize: 10,
    lineHeight: "14px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  button: {
    minHeight: 56,
    border: "none",
    borderRadius: 14,
    padding: "8px 7px",
    background: "#343941",
    color: "#ededed",
    cursor: "pointer",
    boxShadow: "none",
    textAlign: "left",
    transition: "transform 140ms ease, background 140ms ease",
  },
  icon: {
    display: "inline-flex",
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 5,
    fontSize: 15,
  },
  english: {
    display: "block",
    color: "#00e5ff",
    fontSize: 13,
    lineHeight: "16px",
    fontWeight: 800,
  },
  japanese: {
    display: "block",
    marginTop: 3,
    color: "rgba(237,237,237,0.64)",
    fontSize: 11,
    lineHeight: "14px",
    fontWeight: 800,
  },
  lastSent: {
    marginTop: 10,
    minHeight: 28,
    borderRadius: 12,
    padding: "7px 9px",
    background: "#343941",
    color: "rgba(237,237,237,0.7)",
    fontSize: 11,
    lineHeight: "14px",
  },
  lastValue: {
    color: "#00e5ff",
    fontWeight: 800,
  },
  toolbar: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  smallButton: {
    border: "none",
    borderRadius: 999,
    padding: "5px 8px",
    background: "#343941",
    color: "#ededed",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 800,
  },
  editor: {
    display: "grid",
    gap: 8,
    maxHeight: 220,
    overflowY: "auto",
    paddingRight: 2,
  },
  editRow: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 5,
    borderRadius: 12,
    padding: 8,
    background: "#343941",
    border: "none",
  },
  input: {
    boxSizing: "border-box",
    width: "100%",
    border: "none",
    borderRadius: 8,
    padding: "7px 8px",
    background: "#1a1d25",
    color: "#ededed",
    fontSize: 12,
    outline: "none",
  },
  rowActions: {
    display: "flex",
    gap: 6,
  },
  plusButton: {
    display: "grid",
    placeItems: "center",
    width: "100%",
    height: 38,
    marginTop: 8,
    border: "none",
    borderRadius: 12,
    background: "#343941",
    color: "#00e5ff",
    cursor: "pointer",
    fontSize: 22,
    lineHeight: "22px",
    fontWeight: 800,
  },
};

export function sendCue(cueEvent: CueEvent) {
  console.log("[aiment cue event]", cueEvent);
}

export function CueButton({ cue, onClick }: CueButtonProps) {
  const [active, setActive] = useState(false);

  return (
    <button
      type="button"
      style={{
        ...panelStyles.button,
        transform: active ? "scale(0.98)" : undefined,
        background: active ? "#404650" : "#343941",
      }}
      onClick={() => onClick(cue)}
      onPointerDown={() => setActive(true)}
      onPointerUp={() => setActive(false)}
      onPointerCancel={() => setActive(false)}
      onPointerLeave={() => setActive(false)}
    >
      <span style={panelStyles.english}>{cue.english}</span>
      <span style={panelStyles.japanese}>{cue.japanese}</span>
    </button>
  );
}

export function CueMiniPanel({ sessionId, onSendCue }: CueMiniPanelProps) {
  const [cues, setCues] = useState<Cue[]>(loadStoredCues);
  const [editing, setEditing] = useState(false);
  const [lastSent, setLastSent] = useState<CueEvent | null>(null);

  const commitCues = useCallback((nextCues: Cue[]) => {
    setCues(nextCues);
    saveStoredCues(nextCues);
  }, []);

  const updateCue = useCallback(
    (cueId: string, patch: Partial<Cue>) => {
      commitCues(cues.map((cue, index) => (cue.id === cueId ? normalizeCue({ ...cue, ...patch }, index) : cue)));
    },
    [commitCues, cues],
  );

  const addCue = useCallback(() => {
    commitCues([
      ...cues,
      {
        id: `custom-${Date.now()}`,
        english: "Your line!",
        japanese: "一言を入力",
        icon: "",
        category: "flow",
      },
    ]);
    setEditing(true);
  }, [commitCues, cues]);

  const deleteCue = useCallback(
    (cueId: string) => {
      const nextCues = cues.filter((cue) => cue.id !== cueId);
      commitCues(nextCues.length > 0 ? nextCues : DEFAULT_CUES);
    },
    [commitCues, cues],
  );

  const resetCues = useCallback(() => {
    commitCues(DEFAULT_CUES);
  }, [commitCues]);

  const handleCueClick = useCallback(
    (cue: Cue) => {
      const cueEvent: CueEvent = {
        sessionId,
        cueId: cue.id,
        english: cue.english,
        japanese: cue.japanese,
        icon: "",
        category: "flow",
        createdAt: new Date().toISOString(),
      };
      if (onSendCue) onSendCue(cueEvent);
      else sendCue(cueEvent);
      setLastSent(cueEvent);
    },
    [onSendCue, sessionId],
  );

  return (
    <main style={panelStyles.shell}>
      <section style={panelStyles.card} aria-label="パネル操作">
        <header style={panelStyles.header}>
          <h1 style={panelStyles.title}>パネル操作</h1>
          <p style={panelStyles.session}>{sessionId}</p>
        </header>
        <div style={{ ...panelStyles.toolbar, marginBottom: 10 }}>
          <button type="button" style={panelStyles.smallButton} onClick={() => setEditing((value) => !value)}>
            {editing ? "完了" : "編集"}
          </button>
          <button type="button" style={panelStyles.smallButton} onClick={resetCues}>
            初期化
          </button>
        </div>
        {editing ? (
          <div style={panelStyles.editor}>
            {cues.map((cue) => (
              <div key={cue.id} style={panelStyles.editRow}>
                <input
                  style={panelStyles.input}
                  value={cue.english}
                  aria-label="英語"
                  onChange={(event) => updateCue(cue.id, { english: event.target.value })}
                />
                <input
                  style={panelStyles.input}
                  value={cue.japanese}
                  aria-label="日本語"
                  onChange={(event) => updateCue(cue.id, { japanese: event.target.value })}
                />
                <div style={panelStyles.rowActions}>
                  <button type="button" style={panelStyles.smallButton} onClick={() => deleteCue(cue.id)}>
                    削除
                  </button>
                </div>
              </div>
            ))}
            <button type="button" style={panelStyles.plusButton} onClick={addCue} aria-label="キューを追加">
              +
            </button>
          </div>
        ) : (
          <div style={panelStyles.grid}>
            {cues.map((cue) => (
              <CueButton key={cue.id} cue={cue} onClick={handleCueClick} />
            ))}
          </div>
        )}
        <div style={panelStyles.lastSent} aria-live="polite">
          最後に送信:{" "}
          {lastSent ? (
            <span style={panelStyles.lastValue}>
              {lastSent.english}
            </span>
          ) : (
            <span>未送信</span>
          )}
        </div>
      </section>
    </main>
  );
}

function setupPictureInPictureDocument(pipWindow: Window) {
  pipWindow.document.title = "aiment キュー操作";
  pipWindow.document.body.innerHTML = "";
  pipWindow.document.body.style.margin = "0";
  pipWindow.document.body.style.overflow = "hidden";
  pipWindow.document.body.style.background = "#1a1d25";

  Array.from(document.head.querySelectorAll("style, link[rel='stylesheet']")).forEach((node) => {
    pipWindow.document.head.appendChild(node.cloneNode(true));
  });
}

export function OpenCueMiniPanelButton({ sessionId, onSendCue, className = "" }: CueMiniPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const pipRootRef = useRef<Root | null>(null);

  useEffect(() => {
    return () => {
      pipRootRef.current?.unmount();
      pipRootRef.current = null;
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
      pipWindowRef.current = null;
    };
  }, []);

  const openCueMiniPanel = async () => {
    setError(null);
    if (typeof window === "undefined") return;

    const documentPictureInPicture = window.documentPictureInPicture;
    if (!documentPictureInPicture) {
      setError("キューパネルは Document Picture-in-Picture 対応ブラウザが必要です。Chromeでお試しください。");
      return;
    }

    try {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.focus();
        return;
      }

      const pipWindow = await documentPictureInPicture.requestWindow({ width: 280, height: 320 });
      pipWindowRef.current = pipWindow;
      setupPictureInPictureDocument(pipWindow);

      const rootElement = pipWindow.document.createElement("div");
      pipWindow.document.body.appendChild(rootElement);
      const root = createRoot(rootElement);
      pipRootRef.current = root;
      root.render(<CueMiniPanel sessionId={sessionId} onSendCue={onSendCue} />);

      pipWindow.addEventListener("pagehide", () => {
        pipRootRef.current?.unmount();
        pipRootRef.current = null;
        pipWindowRef.current = null;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "キューパネルを開けませんでした。");
    }
  };

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <button
        type="button"
        onClick={() => {
          void openCueMiniPanel();
        }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-secondary)] px-3 py-2.5 text-sm font-extrabold text-black transition hover:scale-[1.01] hover:brightness-95 focus-visible:outline-none"
      >
        英語アシスト
      </button>
      {error ? <p className="rounded-lg bg-[var(--brand-accent)]/15 px-3 py-2 text-xs text-[var(--brand-accent)]">{error}</p> : null}
    </div>
  );
}
