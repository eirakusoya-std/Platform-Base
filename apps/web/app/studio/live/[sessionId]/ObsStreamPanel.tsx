"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowPathIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { useI18n } from "../../../lib/i18n";

type IngressInfo = {
  ingressId: string;
  streamKey: string;
  rtmpUrl: string;
};

type Props = {
  sessionId: string;
  onConnectionChange: (connected: boolean) => void;
};

const POLL_INTERVAL_MS = 3000;

export function ObsStreamPanel({ sessionId, onConnectionChange }: Props) {
  const { tx } = useI18n();
  const [ingress, setIngress] = useState<IngressInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [obsConnected, setObsConnected] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchIngress = useCallback(async () => {
    try {
      const res = await fetch(`/api/livekit/ingress?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok || !mountedRef.current) return;
      const data = (await res.json()) as { ingress: IngressInfo | null };
      if (mountedRef.current) setIngress(data.ingress);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [sessionId]);

  const createIngress = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/livekit/ingress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok || !mountedRef.current) return;
      const data = (await res.json()) as { ingress: IngressInfo };
      if (mountedRef.current) setIngress(data.ingress);
    } finally {
      if (mountedRef.current) setCreating(false);
    }
  }, [sessionId]);

  const regenerateKey = useCallback(async () => {
    if (!confirmRegen) {
      setConfirmRegen(true);
      return;
    }
    setRegenerating(true);
    setConfirmRegen(false);
    try {
      await fetch(`/api/livekit/ingress?sessionId=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
      const res = await fetch("/api/livekit/ingress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok || !mountedRef.current) return;
      const data = (await res.json()) as { ingress: IngressInfo };
      if (mountedRef.current) {
        setIngress(data.ingress);
        setShowKey(false);
      }
    } finally {
      if (mountedRef.current) setRegenerating(false);
    }
  }, [sessionId, confirmRegen]);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/livekit/ingress/status?sessionId=${encodeURIComponent(sessionId)}`,
      );
      if (!res.ok || !mountedRef.current) return;
      const data = (await res.json()) as { connected: boolean };
      if (mountedRef.current) {
        setObsConnected(data.connected);
        onConnectionChange(data.connected);
      }
    } catch {
      // no-op — transient network error
    }
  }, [sessionId, onConnectionChange]);

  useEffect(() => {
    void fetchIngress();
  }, [fetchIngress]);

  useEffect(() => {
    pollRef.current = setInterval(() => void pollStatus(), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pollStatus]);

  const copyToClipboard = useCallback(
    async (text: string, setCopied: (v: boolean) => void) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Fallback for browsers that deny clipboard API
        const el = document.createElement("textarea");
        el.value = text;
        el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    [],
  );

  if (loading) {
    return (
      <p className="py-4 text-center text-xs text-[var(--brand-text-muted)]">
        {tx("読み込み中...", "Loading...")}
      </p>
    );
  }

  if (!ingress) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-[var(--brand-text-muted)]">
          {tx(
            "OBSで配信するにはストリームキーを発行してください。",
            "Generate a stream key to broadcast from OBS.",
          )}
        </p>
        <button
          onClick={() => void createIngress()}
          disabled={creating}
          className="w-full rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {creating
            ? tx("発行中...", "Generating...")
            : tx("ストリームキーを発行", "Generate Stream Key")}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* OBS接続ステータス */}
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
            obsConnected
              ? "bg-green-500/15 text-green-400"
              : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"
          }`}
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              obsConnected ? "animate-pulse bg-green-400" : "bg-[var(--brand-text-muted)]"
            }`}
          />
          {obsConnected
            ? tx("OBS接続済み — 配信開始ボタンを押せます", "OBS connected — ready to go live")
            : tx(
                "OBS未接続 — 下記の設定をOBSに入力してください",
                "OBS not connected — enter settings in OBS",
              )}
        </div>

        {/* RTMP URL */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-text-muted)]">
            {tx("サーバー（RTMP URL）", "Server (RTMP URL)")}
          </span>
          <div className="flex gap-2">
            <div className="flex-1 overflow-hidden rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 font-mono text-xs text-[var(--brand-text)]">
              <span className="truncate block">{ingress.rtmpUrl}</span>
            </div>
            <button
              onClick={() => void copyToClipboard(ingress.rtmpUrl, setCopiedUrl)}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-xs font-semibold text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
            >
              {copiedUrl ? (
                <CheckIcon className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <ClipboardDocumentIcon className="h-3.5 w-3.5" />
              )}
              {copiedUrl ? tx("コピー済", "Copied") : tx("コピー", "Copy")}
            </button>
          </div>
        </div>

        {/* ストリームキー */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-text-muted)]">
              {tx("ストリームキー", "Stream Key")}
            </span>
            <button
              onClick={() => setShowKey((v) => !v)}
              className="flex items-center gap-1 text-[10px] text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
            >
              {showKey ? (
                <EyeSlashIcon className="h-3.5 w-3.5" />
              ) : (
                <EyeIcon className="h-3.5 w-3.5" />
              )}
              {showKey ? tx("隠す", "Hide") : tx("表示", "Show")}
            </button>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 overflow-hidden rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 font-mono text-xs text-[var(--brand-text)]">
              {showKey ? ingress.streamKey : "•".repeat(12)}
            </div>
            <button
              onClick={() => void copyToClipboard(ingress.streamKey, setCopiedKey)}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-xs font-semibold text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
            >
              {copiedKey ? (
                <CheckIcon className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <ClipboardDocumentIcon className="h-3.5 w-3.5" />
              )}
              {copiedKey ? tx("コピー済", "Copied") : tx("コピー", "Copy")}
            </button>
          </div>
        </div>

        {/* セキュリティ警告 */}
        <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {tx(
              "ストリームキーは他人に絶対に見せないでください。流出した場合はすぐに再発行してください。",
              "Never share your stream key. If leaked, regenerate it immediately.",
            )}
          </span>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2">
          <div className="flex flex-1 gap-1">
            <button
              onClick={() => void regenerateKey()}
              disabled={regenerating}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                confirmRegen
                  ? "bg-[var(--brand-accent)] text-white"
                  : "bg-[var(--brand-surface)] text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
              } disabled:opacity-60`}
            >
              <ArrowPathIcon className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
              {confirmRegen
                ? tx("本当に再発行する", "Confirm regenerate")
                : tx("キーを再発行", "Regenerate key")}
            </button>
            {confirmRegen && (
              <button
                onClick={() => setConfirmRegen(false)}
                className="rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-xs text-[var(--brand-text-muted)]"
              >
                {tx("キャンセル", "Cancel")}
              </button>
            )}
          </div>
          <button
            onClick={() => setShowTutorial(true)}
            className="flex items-center gap-1 rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-xs text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
          >
            <QuestionMarkCircleIcon className="h-4 w-4" />
            {tx("OBS設定", "OBS Setup")}
          </button>
        </div>
      </div>

      {/* OBSチュートリアルモーダル */}
      {showTutorial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowTutorial(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[var(--brand-surface)] p-6 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--brand-text)]">
                {tx("OBS 設定手順", "OBS Setup Guide")}
              </h2>
              <button
                onClick={() => setShowTutorial(false)}
                className="rounded-lg p-1 text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <ol className="space-y-3">
              {(
                [
                  [
                    tx("OBS Studio を開く", "Open OBS Studio"),
                    tx("最新版（28以降）を推奨", "v28+ recommended"),
                  ],
                  [
                    tx("メニューの「設定」をクリック", 'Click "Settings" in the menu'),
                    null,
                  ],
                  [
                    tx("左側の「配信」を選択", 'Select "Stream" on the left'),
                    null,
                  ],
                  [
                    tx('サービスを「カスタム…」に変更', 'Set Service to "Custom..."'),
                    null,
                  ],
                  [
                    tx("サーバー欄にRTMP URLをペースト", "Paste RTMP URL into Server"),
                    tx("上の「コピー」ボタンを使用", "Use the Copy button above"),
                  ],
                  [
                    tx("ストリームキー欄にキーをペースト", "Paste Stream Key"),
                    tx("上の「コピー」ボタンを使用", "Use the Copy button above"),
                  ],
                  [
                    tx("「OK」をクリックして保存", "Click OK to save"),
                    null,
                  ],
                  [
                    tx("OBSの「配信開始」をクリック", 'Click "Start Streaming" in OBS'),
                    null,
                  ],
                  [
                    tx(
                      "このページで「OBS接続済み」が表示されたら「配信開始」を押す",
                      'When "OBS connected" appears, click "Start Stream" on this page',
                    ),
                    tx(
                      "OBSが接続されても自動で配信は始まりません",
                      "Stream does not start automatically",
                    ),
                  ],
                ] as [string, string | null][]
              ).map(([step, note], i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs text-[var(--brand-text)]">{step}</p>
                    {note && (
                      <p className="mt-0.5 text-[10px] text-[var(--brand-text-muted)]">{note}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
