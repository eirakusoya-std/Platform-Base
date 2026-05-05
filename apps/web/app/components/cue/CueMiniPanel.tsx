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

type DocumentPictureInPictureController = {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
};

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureController;
  }
}

const CUES: Cue[] = [
  {
    id: "wait",
    english: "Wait!",
    japanese: "待って！",
    icon: "✋",
    category: "flow",
  },
  {
    id: "nice",
    english: "Nice!",
    japanese: "ナイス！",
    icon: "👏",
    category: "reaction",
  },
  {
    id: "your-turn",
    english: "Your turn!",
    japanese: "あなたの番！",
    icon: "👉",
    category: "flow",
  },
  {
    id: "come-here",
    english: "Come here!",
    japanese: "こっち来て！",
    icon: "👋",
    category: "movement",
  },
  {
    id: "look-here",
    english: "Look here!",
    japanese: "ここ見て！",
    icon: "👀",
    category: "help",
  },
  {
    id: "one-more-time",
    english: "One more time!",
    japanese: "もう一回！",
    icon: "🔁",
    category: "flow",
  },
];

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
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 18px 34px rgba(0,0,0,0.30)",
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
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: "8px 7px",
    background: "#343941",
    color: "#ededed",
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
    textAlign: "left",
    transition: "transform 140ms ease, background 140ms ease, border-color 140ms ease",
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
    display: "inline",
    color: "#00e5ff",
    fontSize: 13,
    lineHeight: "16px",
    fontWeight: 800,
  },
  japanese: {
    display: "block",
    marginTop: 3,
    paddingLeft: 25,
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
        borderColor: active ? "rgba(0,229,255,0.55)" : "rgba(255,255,255,0.10)",
        background: active ? "#404650" : "#343941",
      }}
      onClick={() => onClick(cue)}
      onPointerDown={() => setActive(true)}
      onPointerUp={() => setActive(false)}
      onPointerCancel={() => setActive(false)}
      onPointerLeave={() => setActive(false)}
    >
      <span style={panelStyles.icon} aria-hidden>
        {cue.icon}
      </span>
      <span style={panelStyles.english}>{cue.english}</span>
      <span style={panelStyles.japanese}>{cue.japanese}</span>
    </button>
  );
}

export function CueMiniPanel({ sessionId, onSendCue }: CueMiniPanelProps) {
  const [lastSent, setLastSent] = useState<CueEvent | null>(null);

  const handleCueClick = useCallback(
    (cue: Cue) => {
      const cueEvent: CueEvent = {
        sessionId,
        cueId: cue.id,
        english: cue.english,
        japanese: cue.japanese,
        icon: cue.icon,
        category: cue.category,
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
      <section style={panelStyles.card} aria-label="Live Cues">
        <header style={panelStyles.header}>
          <h1 style={panelStyles.title}>⚡ Live Cues</h1>
          <p style={panelStyles.session}>{sessionId}</p>
        </header>
        <div style={panelStyles.grid}>
          {CUES.map((cue) => (
            <CueButton key={cue.id} cue={cue} onClick={handleCueClick} />
          ))}
        </div>
        <div style={panelStyles.lastSent} aria-live="polite">
          Last sent:{" "}
          {lastSent ? (
            <span style={panelStyles.lastValue}>
              {lastSent.icon} {lastSent.english}
            </span>
          ) : (
            <span>None yet</span>
          )}
        </div>
      </section>
    </main>
  );
}

function setupPictureInPictureDocument(pipWindow: Window) {
  pipWindow.document.title = "aiment Live Cues";
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
      setError("Cue Mini Panel requires a browser that supports Document Picture-in-Picture, such as Chrome.");
      return;
    }

    try {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.focus();
        return;
      }

      const pipWindow = await documentPictureInPicture.requestWindow({ width: 260, height: 240 });
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
      setError(caught instanceof Error ? caught.message : "Failed to open Cue Mini Panel.");
    }
  };

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <button
        type="button"
        onClick={() => {
          void openCueMiniPanel();
        }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-secondary)] px-3 py-2.5 text-sm font-extrabold text-black shadow-[0_10px_24px_rgba(0,229,255,0.18)] transition hover:scale-[1.01] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-secondary)]/70"
      >
        <span aria-hidden>⚡</span>
        Open Cue Mini Panel
      </button>
      {error ? <p className="rounded-lg bg-[var(--brand-accent)]/15 px-3 py-2 text-xs text-[var(--brand-accent)]">{error}</p> : null}
    </div>
  );
}
