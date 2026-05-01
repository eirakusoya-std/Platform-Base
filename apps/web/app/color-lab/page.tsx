"use client";

import { CSSProperties, useMemo, useState } from "react";
import Image from "next/image";

type Mode = "dark" | "light";
type ThemeKey = "primary" | "secondary" | "accent" | "background" | "surface" | "text";
type ThemeState = Record<ThemeKey, string>;

type ContrastResult = {
  label: string;
  ratio: number;
  aaText: boolean;
  aaaText: boolean;
  aaUi: boolean;
};

type SecondarySwitchProps = {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
};

const DARK_THEME_FALLBACK: ThemeState = {
  primary: "#7c6ae6",
  secondary: "#00e5ff",
  accent: "#ff3b5c",
  background: "#222222",
  surface: "#1f2130",
  text: "#ededed",
};

const LIGHT_THEME: ThemeState = {
  primary: "#4f46e5",
  secondary: "#0891b2",
  accent: "#e11d48",
  background: "#f4f7fb",
  surface: "#ffffff",
  text: "#18202b",
};

const COLOR_FIELDS: Array<{ key: ThemeKey; label: string }> = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
];

function normalizeHex(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) return value;
  const withHash = value.startsWith("#") ? value : `#${value}`;
  if (/^#[0-9a-f]{3}$/.test(withHash)) {
    const [r, g, b] = withHash.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#[0-9a-f]{6}$/.test(withHash)) return withHash;
  return raw;
}

function isValidHex(hex: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(hex);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function mix(hex1: string, hex2: string, weight: number): string {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  const w = Math.max(0, Math.min(1, weight));
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${toHex(a.r + (b.r - a.r) * w)}${toHex(a.g + (b.g - a.g) * w)}${toHex(a.b + (b.b - a.b) * w)}`;
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const normalize = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [rn, gn, bn] = [normalize(r), normalize(g), normalize(b)];
  return 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;
}

function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

function readRootThemeVar(name: string): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim().toLowerCase();
  return isValidHex(raw) ? raw : null;
}

function getDarkThemeDefaults(): ThemeState {
  const bg = readRootThemeVar("--bg");
  const surface = readRootThemeVar("--surface");
  const primary = readRootThemeVar("--primary");
  const secondary = readRootThemeVar("--secondary");
  const accent = readRootThemeVar("--accent");
  const text = readRootThemeVar("--text");

  return {
    background: bg ?? DARK_THEME_FALLBACK.background,
    surface: surface ?? DARK_THEME_FALLBACK.surface,
    primary: primary ?? DARK_THEME_FALLBACK.primary,
    secondary: secondary ?? DARK_THEME_FALLBACK.secondary,
    accent: accent ?? DARK_THEME_FALLBACK.accent,
    text: text ?? DARK_THEME_FALLBACK.text,
  };
}

function SecondarySwitch({ checked, label, onChange }: SecondarySwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
        checked
          ? "bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]"
          : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"
      }`}
    >
      <span>{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-[var(--brand-secondary)]" : "bg-[var(--brand-surface)]"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-[var(--brand-bg-900)] transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export default function ColorLabPage() {
  const [mode, setMode] = useState<Mode>("dark");
  const [themes, setThemes] = useState<Record<Mode, ThemeState>>(() => ({
    dark: getDarkThemeDefaults(),
    light: LIGHT_THEME,
  }));
  const [copied, setCopied] = useState(false);

  const [ready, setReady] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [recordOn, setRecordOn] = useState(true);
  const [chatOn, setChatOn] = useState(true);
  const [status, setStatus] = useState<"connected" | "connecting" | "failed">("connected");

  const activeTheme = themes[mode];
  const allValid = useMemo(() => Object.values(activeTheme).every(isValidHex), [activeTheme]);

  const derived = useMemo(() => {
    if (!allValid) {
      return {
        mutedText: mode === "dark" ? "#9aa0af" : "#6b7280",
      };
    }
    return {
      mutedText: mix(activeTheme.text, activeTheme.background, mode === "dark" ? 0.45 : 0.35),
    };
  }, [activeTheme, allValid, mode]);

  const cssExport = useMemo(() => {
    if (!allValid) return "/* Enter valid HEX colors to export CSS variables */";
    return `/* ${mode.toUpperCase()} MODE */\n:root {\n  --bg: ${activeTheme.background};\n  --surface: ${activeTheme.surface};\n  --primary: ${activeTheme.primary};\n  --secondary: ${activeTheme.secondary};\n  --accent: ${activeTheme.accent};\n  --text: ${activeTheme.text};\n  --text-sub: ${derived.mutedText};\n\n  --background: var(--bg);\n  --foreground: var(--text);\n  --brand-bg-900: var(--bg);\n  --brand-bg-800: var(--bg);\n  --brand-surface: var(--surface);\n  --brand-surface-soft: var(--surface);\n  --brand-primary: var(--primary);\n  --brand-secondary: var(--secondary);\n  --brand-accent: var(--accent);\n  --brand-text: var(--text);\n  --brand-text-muted: var(--text-sub);\n}`;
  }, [activeTheme, allValid, derived.mutedText, mode]);

  const contrastChecks = useMemo<ContrastResult[]>(() => {
    if (!allValid) return [];
    const pairs: Array<{ label: string; fg: string; bg: string }> = [
      { label: "Text on Background", fg: activeTheme.text, bg: activeTheme.background },
      { label: "Text on Surface", fg: activeTheme.text, bg: activeTheme.surface },
      { label: "Primary on Surface", fg: activeTheme.primary, bg: activeTheme.surface },
      { label: "Accent on Surface", fg: activeTheme.accent, bg: activeTheme.surface },
      { label: "Primary on Background", fg: activeTheme.primary, bg: activeTheme.background },
      { label: "Surface on Background", fg: activeTheme.surface, bg: activeTheme.background },
    ];

    return pairs.map((pair) => {
      const ratio = contrastRatio(pair.fg, pair.bg);
      return {
        label: pair.label,
        ratio,
        aaText: ratio >= 4.5,
        aaaText: ratio >= 7,
        aaUi: ratio >= 3,
      };
    });
  }, [activeTheme, allValid]);

  const previewVars = useMemo<CSSProperties>(() => {
    const fallbackTheme = mode === "dark" ? DARK_THEME_FALLBACK : LIGHT_THEME;
    return {
      "--bg": allValid ? activeTheme.background : fallbackTheme.background,
      "--surface": allValid ? activeTheme.surface : fallbackTheme.surface,
      "--primary": allValid ? activeTheme.primary : fallbackTheme.primary,
      "--secondary": allValid ? activeTheme.secondary : fallbackTheme.secondary,
      "--accent": allValid ? activeTheme.accent : fallbackTheme.accent,
      "--text": allValid ? activeTheme.text : fallbackTheme.text,
      "--text-sub": derived.mutedText,
      "--background": "var(--bg)",
      "--foreground": "var(--text)",
      "--brand-bg-900": "var(--bg)",
      "--brand-bg-800": "var(--bg)",
      "--brand-surface": "var(--surface)",
      "--brand-surface-soft": "var(--surface)",
      "--brand-primary": "var(--primary)",
      "--brand-secondary": "var(--secondary)",
      "--brand-accent": "var(--accent)",
      "--brand-text": "var(--text)",
      "--brand-text-muted": "var(--text-sub)",
    } as CSSProperties;
  }, [activeTheme, allValid, derived.mutedText, mode]);

  const onColorTextChange = (key: ThemeKey, next: string) => {
    const normalized = normalizeHex(next);
    setThemes((prev) => ({
      ...prev,
      [mode]: { ...prev[mode], [key]: normalized },
    }));
    setCopied(false);
  };

  const onColorPickerChange = (key: ThemeKey, next: string) => {
    setThemes((prev) => ({
      ...prev,
      [mode]: { ...prev[mode], [key]: next.toLowerCase() },
    }));
    setCopied(false);
  };

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(cssExport);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">UI Color Lab (MVP)</h1>
        <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
          実ページの見た目に近いUIで、色・コントラスト・CSS変数を同時に検証できます。
        </p>
        <div className="mt-4 inline-flex rounded-xl bg-[var(--brand-surface)] p-1">
          <button
            type="button"
            onClick={() => setMode("dark")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              mode === "dark" ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "text-[var(--brand-text-muted)]"
            }`}
          >
            Dark Mode
          </button>
          <button
            type="button"
            onClick={() => setMode("light")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              mode === "light" ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "text-[var(--brand-text-muted)]"
            }`}
          >
            Light Mode
          </button>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[360px,1fr]">
        <div className="rounded-2xl bg-[var(--brand-surface)] p-5">
          <h2 className="text-lg font-semibold">1) Color Inputs</h2>
          <p className="mt-1 text-xs text-[var(--brand-text-muted)]">HEX入力は #RRGGBB 形式です。</p>
          <div className="mt-4 space-y-4">
            {COLOR_FIELDS.map((field) => {
              const valid = isValidHex(activeTheme[field.key]);
              return (
                <label key={field.key} className="block">
                  <span className="mb-1 block text-sm font-medium">{field.label}</span>
                  <div className="flex items-center gap-2">
                    <input
                      aria-label={`${field.label} color picker`}
                      type="color"
                      value={valid ? activeTheme[field.key] : "#000000"}
                      onChange={(event) => onColorPickerChange(field.key, event.target.value)}
                      className="h-10 w-12 cursor-pointer rounded border border-white/15 bg-transparent p-1"
                    />
                    <input
                      aria-label={`${field.label} hex value`}
                      type="text"
                      value={activeTheme[field.key]}
                      onChange={(event) => onColorTextChange(field.key, event.target.value)}
                      className={`h-10 flex-1 rounded-md border px-3 text-sm outline-none transition ${
                        valid
                          ? "border-white/20 bg-white/5 focus:border-[var(--brand-primary)]"
                          : "border-red-500/60 bg-red-500/10 focus:border-red-400"
                      }`}
                    />
                  </div>
                </label>
              );
            })}
          </div>
          {!allValid && (
            <p className="mt-4 rounded-md bg-red-500/10 p-2 text-xs text-red-200">
              無効な色があります。6桁HEXに直すとコントラスト計算とエクスポートが有効になります。
            </p>
          )}
        </div>

        <div className="space-y-8">
          <section className="overflow-hidden rounded-2xl" style={previewVars}>
            <div className="bg-[var(--brand-bg-900)] p-4 text-[var(--brand-text)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center">
                  <Image src="/logo/aiment_logotype.svg" alt="aiment" width={120} height={40} className="h-8 w-auto object-contain" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[var(--brand-surface)] px-3 py-1 text-xs font-medium text-[var(--brand-text-muted)]">Room: color-lab</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      status === "connected"
                        ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]"
                        : status === "connecting"
                          ? "bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]"
                          : "bg-[var(--brand-accent)]/20 text-[var(--brand-accent)]"
                    }`}
                  >
                    {status === "connected" ? "接続済み" : status === "connecting" ? "接続中" : "接続失敗"}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                <section className="space-y-4">
                  <div className="overflow-hidden rounded-2xl bg-black">
                    <div className="relative" style={{ aspectRatio: "16/9" }}>
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-surface)] to-black" />
                      <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold">LIVE</div>
                      <div className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[11px]">視聴者 126</div>
                      <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs">配信者メイン</div>
                    </div>
                  </div>

                  <section className="rounded-2xl bg-[var(--brand-bg-800)] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setMicOn((v) => !v)}
                        className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          micOn ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "text-[var(--brand-text-muted)]"
                        }`}
                      >
                        {micOn ? "MIC ON" : "MIC OFF"}
                      </button>
                      <button
                        onClick={() => setCamOn((v) => !v)}
                        className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          camOn ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "text-[var(--brand-text-muted)]"
                        }`}
                      >
                        {camOn ? "CAM ON" : "CAM OFF"}
                      </button>
                      <button
                        onClick={() => setSpeakerOn((v) => !v)}
                        className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          speakerOn ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "text-[var(--brand-text-muted)]"
                        }`}
                      >
                        {speakerOn ? "SPK ON" : "SPK OFF"}
                      </button>
                      <button className="ml-auto rounded-lg bg-[var(--brand-accent)]/15 px-3 py-2 text-xs font-medium text-[var(--brand-accent)] transition-colors hover:bg-[var(--brand-accent)]/25">
                        退出
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-full bg-[var(--brand-secondary)]/20 px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-secondary)]">
                        通知ON
                      </span>
                      <button
                        type="button"
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors hover:brightness-110"
                        style={{ background: "var(--brand-secondary)" }}
                      >
                        空きが出たら参加
                      </button>
                    </div>
                  </section>
                </section>

                <aside className="rounded-2xl bg-[var(--brand-bg-800)] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold tracking-wide text-[var(--brand-text-muted)]">デバイス確認</h2>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        ready ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "bg-[var(--brand-accent)]/20 text-[var(--brand-accent)]"
                      }`}
                    >
                      {ready ? "準備OK" : "準備中"}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl bg-[var(--brand-bg-900)] p-4">
                    <p className="mb-2 text-xs font-medium text-[var(--brand-text-muted)]">マイク入力レベル</p>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--brand-bg-900)]">
                      <div className="h-full rounded-full bg-[var(--brand-primary)] transition-all" style={{ width: micOn ? "72%" : "0%" }} />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SecondarySwitch checked={recordOn} label="録画" onChange={setRecordOn} />
                    <SecondarySwitch checked={chatOn} label="チャット" onChange={setChatOn} />
                  </div>

                  <div className="mt-6 flex gap-2">
                    <button className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-[var(--brand-text-muted)] transition-colors hover:text-[var(--brand-primary)]">
                      戻る
                    </button>
                    <button className="flex-1 rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-primary)]">
                      この設定で参加
                    </button>
                  </div>
                </aside>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-[var(--brand-surface)] p-5">
              <h2 className="text-lg font-semibold">3) Contrast Check</h2>
              <p className="mt-1 text-xs text-[var(--brand-text-muted)]">AA(Text): 4.5+, AAA(Text): 7+, AA(UI): 3+</p>

              <div className="mt-4 space-y-3">
                {contrastChecks.map((row) => (
                  <div key={row.label} className="rounded-lg bg-white/5 p-3 text-sm">
                    <p className="font-medium">{row.label}</p>
                    <p className="mt-1 text-xs text-[var(--brand-text-muted)]">Ratio: {row.ratio.toFixed(2)}:1</p>
                    <p className="mt-1 text-xs">
                      AA(Text): {row.aaText ? "PASS" : "FAIL"} / AAA(Text): {row.aaaText ? "PASS" : "FAIL"} / AA(UI):{" "}
                      {row.aaUi ? "PASS" : "FAIL"}
                    </p>
                  </div>
                ))}
                {contrastChecks.length === 0 && (
                  <p className="text-sm text-[var(--brand-text-muted)]">有効なHEX入力で結果が表示されます。</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--brand-surface)] p-5">
              <h2 className="text-lg font-semibold">4) CSS Variable Export</h2>
              <p className="mt-1 text-xs text-[var(--brand-text-muted)]">そのまま globals.css へ貼り付け可能な形式です。</p>

              <textarea
                readOnly
                value={cssExport}
                className="mt-4 h-64 w-full rounded-lg bg-black/30 p-3 font-mono text-xs leading-5 text-white"
              />

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={copyCss}
                  disabled={!allValid}
                  className="rounded-md px-3 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: allValid ? activeTheme.secondary : "#94a3b8" }}
                >
                  Copy CSS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setThemes((prev) => ({
                      ...prev,
                      [mode]: mode === "dark" ? getDarkThemeDefaults() : LIGHT_THEME,
                    }));
                    setCopied(false);
                  }}
                  className="rounded-md bg-white/5 px-3 py-2 text-sm font-medium"
                >
                  Reset
                </button>
                {copied && <span className="self-center text-xs text-emerald-300">Copied</span>}
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-[var(--brand-surface)] p-4">
            <p className="mb-2 text-xs text-[var(--brand-text-muted)]">Preview state controls</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setReady((v) => !v)}
                className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-xs text-[var(--brand-text-muted)]"
              >
                Ready: {ready ? "ON" : "OFF"}
              </button>
              <button
                onClick={() => setStatus("connected")}
                className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-xs text-[var(--brand-text-muted)]"
              >
                接続済み
              </button>
              <button
                onClick={() => setStatus("connecting")}
                className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-xs text-[var(--brand-text-muted)]"
              >
                接続中
              </button>
              <button
                onClick={() => setStatus("failed")}
                className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-xs text-[var(--brand-text-muted)]"
              >
                接続失敗
              </button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
