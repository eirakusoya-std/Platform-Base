"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { BilingualChatMessage, ChatLanguage, ChatSenderRole } from "../../lib/chatMessages";
import { logTranslationUsage, translateText, type TranslationDirection } from "../../lib/translateText";

type BasePanelProps = {
  sessionId: string;
  messages: BilingualChatMessage[];
  onSendMessage?: (message: BilingualChatMessage) => void;
  className?: string;
};

type DocumentPictureInPictureController = {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
};

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureController;
  }
}

const MAX_TRANSLATION_CHARS = 300;
const TRANSLATION_PIP_EXPANDED_SIZE = { width: 320, height: 300 };

function CharacterCount({ value }: { value: string }) {
  const over = value.length > MAX_TRANSLATION_CHARS;
  return (
    <p className={`text-right text-[10px] font-semibold ${over ? "text-[var(--brand-accent)]" : "text-[var(--brand-text-muted)]"}`}>
      {value.length}/{MAX_TRANSLATION_CHARS}
    </p>
  );
}

function CompactTranslationTool({
  sessionId,
  userRole,
  sourceLang,
  targetLang,
  direction,
  title,
  inputPlaceholder,
  outputLabel,
  translateLabel,
  translatingLabel,
  className = "",
}: {
  sessionId: string;
  userRole: ChatSenderRole;
  sourceLang: ChatLanguage;
  targetLang: ChatLanguage;
  direction: TranslationDirection;
  title: string;
  inputPlaceholder: string;
  outputLabel: string;
  translateLabel: string;
  translatingLabel: string;
  className?: string;
}) {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    setError(null);
    setLoading(true);
    try {
      const next = await translateText({ text: sourceText, sourceLang, targetLang });
      setTranslatedText(next);
      logTranslationUsage({
        sessionId,
        userRole,
        direction,
        sourceTextLength: sourceText.trim().length,
        translatedTextLength: next.length,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "翻訳に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-2xl bg-[var(--brand-surface)] p-3 ${className}`.trim()}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold text-[var(--brand-text)]">{title}</h2>
        <CharacterCount value={sourceText} />
      </div>
      <div className="space-y-2">
        <div className="overflow-hidden rounded-xl bg-[var(--brand-bg-900)]">
          <textarea
            value={sourceText}
            maxLength={MAX_TRANSLATION_CHARS}
            onChange={(event) => setSourceText(event.target.value)}
            rows={2}
            placeholder={inputPlaceholder}
            className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-relaxed text-[var(--brand-text)] outline-none placeholder:text-[var(--brand-text-muted)]"
          />
          <div className="border-t border-white/10 px-3 py-2">
            <p className="mb-1 text-[10px] font-bold text-[var(--brand-text-muted)]">{outputLabel}</p>
            <p className={`min-h-[30px] text-sm leading-relaxed ${translatedText ? "text-[var(--brand-text)]" : "text-[var(--brand-text-muted)]"}`}>
              {translatedText || "-"}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={!sourceText.trim() || loading}
          onClick={() => void handleTranslate()}
          className="w-full rounded-xl bg-[var(--brand-secondary)] px-3 py-2 text-xs font-extrabold text-black disabled:opacity-50"
        >
          {loading ? translatingLabel : translateLabel}
        </button>
        {error ? <p className="rounded-xl bg-[var(--brand-accent)]/15 px-3 py-2 text-xs font-semibold text-[var(--brand-accent)]">{error}</p> : null}
      </div>
    </div>
  );
}

function TranslationAssistPiPContent({
  sessionId,
}: {
  sessionId: string;
}) {
  return (
    <main className="min-h-screen bg-[var(--brand-bg-900)] p-3 text-[var(--brand-text)]">
      <CompactTranslationTool
        sessionId={sessionId}
        userRole="vtuber"
        sourceLang="ja"
        targetLang="en"
        direction="ja-en"
        title="翻訳アシスト"
        inputPlaceholder="日本語を入力"
        outputLabel="English"
        translateLabel="英語に翻訳"
        translatingLabel="翻訳中..."
      />
    </main>
  );
}

function setupPictureInPictureDocument(pipWindow: Window) {
  pipWindow.document.title = "aiment 翻訳アシスト";
  pipWindow.document.body.innerHTML = "";
  pipWindow.document.body.style.margin = "0";
  pipWindow.document.body.style.overflow = "hidden";
  pipWindow.document.body.style.background = "#1a1d25";

  Array.from(document.head.querySelectorAll("style, link[rel='stylesheet']")).forEach((node) => {
    pipWindow.document.head.appendChild(node.cloneNode(true));
  });
}

function PictureInPictureButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl bg-[var(--brand-secondary)] px-3 py-2.5 text-sm font-extrabold text-black"
    >
      {children}
    </button>
  );
}

export function VTuberTranslationAssistPanel({ sessionId, messages, className = "" }: BasePanelProps) {
  void messages;
  const [error, setError] = useState<string | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const pipRootRef = useRef<Root | null>(null);

  const closeCurrentPipWindow = useCallback(() => {
    pipRootRef.current?.unmount();
    pipRootRef.current = null;
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
    }
    pipWindowRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      closeCurrentPipWindow();
    };
  }, [closeCurrentPipWindow]);

  const openPanel = async () => {
    setError(null);
    if (typeof window === "undefined") return;

    const documentPictureInPicture = window.documentPictureInPicture;
    if (!documentPictureInPicture) {
      setError("翻訳アシストは Document Picture-in-Picture 対応ブラウザが必要です。Chromeでお試しください。");
      return;
    }

    try {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.focus();
        return;
      }

      closeCurrentPipWindow();

      const pipWindow = await documentPictureInPicture.requestWindow(TRANSLATION_PIP_EXPANDED_SIZE);
      pipWindowRef.current = pipWindow;
      setupPictureInPictureDocument(pipWindow);

      const rootElement = pipWindow.document.createElement("div");
      pipWindow.document.body.appendChild(rootElement);
      const root = createRoot(rootElement);
      pipRootRef.current = root;
      root.render(
        <TranslationAssistPiPContent
          sessionId={sessionId}
        />,
      );

      pipWindow.addEventListener("pagehide", () => {
        pipRootRef.current?.unmount();
        pipRootRef.current = null;
        pipWindowRef.current = null;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "翻訳アシストを開けませんでした。");
    }
  };

  return (
    <section className={className}>
      <PictureInPictureButton onClick={() => void openPanel()}>翻訳アシストを開く</PictureInPictureButton>
      {error ? <p className="mt-2 rounded-lg bg-[var(--brand-accent)]/15 px-3 py-2 text-xs text-[var(--brand-accent)]">{error}</p> : null}
    </section>
  );
}

export function SpeakerTranslationAssistPanel({ sessionId, messages, className = "" }: BasePanelProps) {
  void messages;
  const [open, setOpen] = useState(false);

  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full rounded-xl bg-[var(--brand-secondary)] px-3 py-2.5 text-sm font-extrabold text-black"
      >
        {open ? "Close Translation Assist" : "Translation Assist"}
      </button>
      {open ? (
        <CompactTranslationTool
          sessionId={sessionId}
          userRole="speaker"
          sourceLang="en"
          targetLang="ja"
          direction="en-ja"
          title="Translation Assist"
          inputPlaceholder="Type English"
          outputLabel="Japanese"
          translateLabel="Translate to Japanese"
          translatingLabel="Translating..."
          className="mt-2"
        />
      ) : null}
    </section>
  );
}
