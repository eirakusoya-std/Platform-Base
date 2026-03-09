 "use client";

import { useMemo, useState } from "react";

type HudPalette = {
  id: "classic" | "secondary" | "primary" | "warn";
  name: string;
  surface: string;
  accent: string;
  accentSoft: string;
  line: string;
  lineSoft: string;
  text: string;
  textMuted: string;
};

const decoNumbers = ["AUTO.01", "LATE.0", "SSC.M", "EXT.P1", "MAP.01", "RC.T10N"];

const classicPalette: HudPalette = {
  id: "classic",
  name: "Classic Yellow",
  surface: "#000000",
  accent: "#e7dd57",
  accentSoft: "rgba(231, 221, 87, 0.12)",
  line: "rgba(255,255,255,0.9)",
  lineSoft: "rgba(255,255,255,0.52)",
  text: "#ededed",
  textMuted: "rgba(237,237,237,0.62)",
};

const brandPalette: HudPalette = {
  id: "secondary",
  name: "Aiment Secondary",
  surface: "var(--brand-bg-900)",
  accent: "var(--brand-secondary)",
  accentSoft: "color-mix(in srgb, var(--brand-secondary) 22%, transparent)",
  line: "var(--brand-text)",
  lineSoft: "var(--brand-text-muted)",
  text: "var(--brand-text)",
  textMuted: "var(--brand-text-muted)",
};

const primaryPalette: HudPalette = {
  id: "primary",
  name: "Aiment Primary",
  surface: "var(--brand-bg-900)",
  accent: "var(--brand-primary)",
  accentSoft: "color-mix(in srgb, var(--brand-primary) 22%, transparent)",
  line: "var(--brand-text)",
  lineSoft: "var(--brand-text-muted)",
  text: "var(--brand-text)",
  textMuted: "var(--brand-text-muted)",
};

const warnPalette: HudPalette = {
  id: "warn",
  name: "Aiment Warn",
  surface: "var(--brand-bg-900)",
  accent: "var(--brand-accent)",
  accentSoft: "color-mix(in srgb, var(--brand-accent) 22%, transparent)",
  line: "var(--brand-text)",
  lineSoft: "var(--brand-text-muted)",
  text: "var(--brand-text)",
  textMuted: "var(--brand-text-muted)",
};

function HudCorner({ className, palette }: { className: string; palette: HudPalette }) {
  return <div className={`absolute h-5 w-5 ${className}`} style={{ borderColor: palette.accent }} aria-hidden />;
}

function TinyReadout({ palette }: { palette: HudPalette }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] tracking-[0.28em]" style={{ color: palette.textMuted }}>
      {decoNumbers.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}

function FrameNoise() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-20"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to bottom, rgba(255,255,255,0.09) 0 1px, transparent 1px 3px)",
      }}
      aria-hidden
    />
  );
}

function VerticalCipher({ className, palette }: { className: string; palette: HudPalette }) {
  return (
    <p
      className={`absolute text-[10px] uppercase tracking-[0.16em] ${className}`}
      style={{ writingMode: "vertical-rl", textOrientation: "mixed", color: palette.lineSoft }}
      aria-hidden
    >
      BOOT.SEQUENCE.INITIALIZED / REMAP.PING.SENSOR.FEEDBACK
    </p>
  );
}

function CodeStack({
  className,
  palette,
  lines,
}: {
  className: string;
  palette: HudPalette;
  lines: string[];
}) {
  return (
    <p className={`absolute text-[10px] uppercase leading-[1.25] tracking-[0.2em] ${className}`} style={{ color: palette.textMuted }} aria-hidden>
      {lines.join("\n")}
    </p>
  );
}

function ThickGhostSquare({ className, palette }: { className: string; palette: HudPalette }) {
  return (
    <div className={`absolute h-16 w-16 ${className}`} aria-hidden>
      <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 0 9px color-mix(in srgb, ${palette.accent} 38%, transparent)` }} />
      <div className="absolute inset-[20px] rounded-full" style={{ backgroundColor: palette.accent }} />
    </div>
  );
}

function ThickGhostCircle({ className, palette }: { className: string; palette: HudPalette }) {
  return (
    <div className={`absolute h-16 w-16 rounded-full ${className}`} style={{ boxShadow: `inset 0 0 0 8px color-mix(in srgb, ${palette.accent} 30%, transparent)` }} aria-hidden />
  );
}

function SlashedDial({ className, palette }: { className: string; palette: HudPalette }) {
  return (
    <div className={`absolute ${className}`} aria-hidden>
      <div className="relative h-16 w-16 rounded-full border-2" style={{ borderColor: palette.line }}>
        <div className="absolute left-1/2 top-1/2 h-[2px] w-12 -translate-x-1/2 -translate-y-1/2 -rotate-45" style={{ backgroundColor: palette.line }} />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ backgroundColor: palette.lineSoft }} />
      </div>
      <div className="absolute -left-6 top-3 flex flex-col items-center gap-1">
        <span className="block h-2.5 w-2.5 rounded-full border" style={{ borderColor: palette.line }} />
        <span className="block h-2.5 w-2.5 rounded-full border" style={{ borderColor: palette.line }} />
        <span className="block h-5 w-px" style={{ backgroundColor: palette.line }} />
      </div>
      <div className="absolute -left-4 -top-2 h-3 w-3 border-l-2 border-t-2" style={{ borderColor: palette.line }} />
      <div className="absolute -left-4 -bottom-2 h-3 w-3 border-b-2 border-l-2" style={{ borderColor: palette.line }} />
    </div>
  );
}

function NestedSquares({ className, palette }: { className: string; palette: HudPalette }) {
  return (
    <div className={`absolute ${className}`} aria-hidden>
      <div className="relative h-16 w-16 border" style={{ borderColor: palette.accent, backgroundColor: palette.accentSoft }}>
        <div className="absolute inset-2 border" style={{ borderColor: palette.accent }} />
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.accent }} />
        </div>
      </div>
      <div className="absolute -bottom-3 -left-3 h-7 w-7 border" style={{ borderColor: palette.line }}>
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: palette.line }} />
        </div>
      </div>
    </div>
  );
}

function MiniSquareSet({ className, palette }: { className: string; palette: HudPalette }) {
  return (
    <div className={`absolute ${className}`} aria-hidden>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-2.5 w-2.5 border" style={{ borderColor: palette.line }} />
        <div className="h-2.5 w-2.5 border" style={{ borderColor: palette.line }} />
        <div className="h-2.5 w-2.5 border" style={{ borderColor: palette.line }} />
        <div className="h-2.5 w-2.5 border" style={{ borderColor: palette.line }} />
      </div>
    </div>
  );
}

function SideRail({ className, palette }: { className: string; palette: HudPalette }) {
  return (
    <div className={`absolute ${className}`} aria-hidden>
      <div className="h-16 w-px" style={{ backgroundColor: palette.line }} />
      <div className="mt-1 h-6 w-px" style={{ backgroundColor: palette.accent }} />
      <div className="mt-2 h-px w-4" style={{ backgroundColor: palette.accent }} />
    </div>
  );
}

function DividerGlyph({ palette }: { palette: HudPalette }) {
  return (
    <div className="flex items-center gap-4" aria-hidden>
      <div className="h-px w-16" style={{ backgroundColor: palette.line }} />
      <div className="flex items-center gap-1.5">
        <span className="block h-6 w-px" style={{ backgroundColor: palette.line }} />
        <span className="block h-6 w-px" style={{ backgroundColor: palette.accent }} />
        <span className="block h-6 w-px" style={{ backgroundColor: palette.line }} />
      </div>
      <div className="h-px w-20" style={{ backgroundColor: palette.accent }} />
    </div>
  );
}

function TopGraphicBand({ palette }: { palette: HudPalette }) {
  return (
    <div className="relative mb-8 h-32" aria-hidden>
      <SlashedDial className="left-2 top-3" palette={palette} />
      <ThickGhostSquare className="left-[116px] top-0" palette={palette} />
      <ThickGhostCircle className="left-52 top-12" palette={palette} />
      <MiniSquareSet className="right-10 top-1" palette={palette} />
      <SideRail className="right-2 top-5" palette={palette} />
      <div className="absolute right-12 top-16 h-8 w-8 border" style={{ borderColor: palette.line }}>
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: palette.line }} />
        </div>
      </div>
    </div>
  );
}

function BottomGraphicBand({ palette }: { palette: HudPalette }) {
  return (
    <div className="relative mt-10 h-24" aria-hidden>
      <div className="absolute left-0 top-5 h-px w-32" style={{ backgroundColor: palette.line }} />
      <div className="absolute left-36 top-[13px] flex items-center gap-2">
        <span className="block h-6 w-px" style={{ backgroundColor: palette.line }} />
        <span className="block h-6 w-px" style={{ backgroundColor: palette.line }} />
        <span className="block h-6 w-px" style={{ backgroundColor: palette.accent }} />
      </div>
      <div className="absolute right-16 top-0 h-14 w-14 rounded-full border-2" style={{ borderColor: palette.accent }} />
      <div className="absolute right-16 top-0 h-14 w-14 rounded-full" style={{ boxShadow: `inset 0 0 0 7px color-mix(in srgb, ${palette.accent} 24%, transparent)` }} />
      <div className="absolute right-0 top-3 h-11 w-11 border" style={{ borderColor: palette.line }} />
      <div className="absolute right-8 top-10 h-8 w-8 border" style={{ borderColor: palette.accent }}>
        <div className="absolute inset-2 border" style={{ borderColor: palette.accent }} />
      </div>
    </div>
  );
}

function LoginWireCard({ palette }: { palette: HudPalette }) {
  return (
    <section
      className="relative min-h-[680px] overflow-hidden rounded-xl border p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
      style={{ borderColor: palette.lineSoft, backgroundColor: palette.surface, color: palette.text }}
    >
      <FrameNoise />
      <HudCorner className="left-3 top-3 border-l-2 border-t-2" palette={palette} />
      <HudCorner className="right-3 top-3 border-r-2 border-t-2" palette={palette} />
      <HudCorner className="bottom-3 left-3 border-b-2 border-l-2" palette={palette} />
      <HudCorner className="bottom-3 right-3 border-b-2 border-r-2" palette={palette} />
      <VerticalCipher className="right-5 top-60 hidden md:block" palette={palette} />

      <div className="relative z-10 px-2 md:px-6">
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.38em]" style={{ color: palette.textMuted }}>
            Digital
          </p>
          <h2 className="text-5xl font-semibold tracking-[0.05em]" style={{ color: palette.accent }}>
            U02
          </h2>
        </header>

        <TopGraphicBand palette={palette} />
        <CodeStack className="left-44 top-[176px] whitespace-pre" palette={palette} lines={["AUTO.01", "SSC_M", "@2"]} />
        <CodeStack className="right-10 top-[208px] whitespace-pre text-right" palette={palette} lines={["LATE.0", "L2", "02.03"]} />

        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="text-[10px] uppercase tracking-[0.26em]" style={{ color: palette.textMuted }}>
              User ID / Email
            </span>
            <div className="h-11 border" style={{ borderColor: palette.lineSoft }} />
          </label>

          <label className="block space-y-2">
            <span className="text-[10px] uppercase tracking-[0.26em]" style={{ color: palette.textMuted }}>
              Password
            </span>
            <div className="h-11 border" style={{ borderColor: palette.lineSoft }} />
          </label>

          <div className="pt-2">
            <div
              className="inline-flex h-11 min-w-[170px] items-center justify-center border px-5 text-sm tracking-[0.22em]"
              style={{ borderColor: palette.accent, color: palette.accent }}
            >
              LOGIN
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em]" style={{ color: palette.textMuted }}>
            <span>Remember</span>
            <span>Forgot?</span>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <TinyReadout palette={palette} />
          <DividerGlyph palette={palette} />
          <div className="flex items-center justify-between text-[10px] tracking-[0.24em]" style={{ color: palette.textMuted }}>
            <span>MAP.ONLINE / DE.FAULT</span>
            <span>L2 02.63</span>
          </div>
        </div>

        <CodeStack className="left-12 top-[510px] whitespace-pre" palette={palette} lines={["EXIT.P1", "P2", "P3", "P4.0"]} />
        <BottomGraphicBand palette={palette} />
      </div>
    </section>
  );
}

function AccountWireCard({ palette }: { palette: HudPalette }) {
  return (
    <section
      className="relative min-h-[680px] overflow-hidden rounded-xl border p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
      style={{ borderColor: palette.lineSoft, backgroundColor: palette.surface, color: palette.text }}
    >
      <FrameNoise />
      <HudCorner className="left-3 top-3 border-l-2 border-t-2" palette={palette} />
      <HudCorner className="right-3 top-3 border-r-2 border-t-2" palette={palette} />
      <HudCorner className="bottom-3 left-3 border-b-2 border-l-2" palette={palette} />
      <HudCorner className="bottom-3 right-3 border-b-2 border-r-2" palette={palette} />
      <VerticalCipher className="left-5 top-64 hidden md:block" palette={palette} />

      <div className="relative z-10 px-2 md:px-6">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.38em]" style={{ color: palette.textMuted }}>
              Account Protocol
            </p>
            <h2 className="text-4xl font-semibold tracking-[0.05em]" style={{ color: palette.accent }}>
              STATUS
            </h2>
            <p className="mt-2 text-[10px] uppercase tracking-[0.2em]" style={{ color: palette.textMuted }}>
              MOTION.CU.R3 / DE.FAULT
            </p>
          </div>
          <div className="mt-1 h-11 w-11 rounded-full border-2" style={{ borderColor: palette.accent }} />
        </header>

        <TopGraphicBand palette={palette} />
        <CodeStack className="left-44 top-[176px] whitespace-pre" palette={palette} lines={["MAP.ONLINE", "DE.", "FAULT"]} />
        <CodeStack className="right-10 top-[208px] whitespace-pre text-right" palette={palette} lines={["S.0X", "P", "004"]} />

        <div className="space-y-4">
          {[
            ["User Name", "XXXX XXXXX"],
            ["Plan", "PROTOCOL 02"],
            ["Last Login", "2026-03-07 20:41"],
            ["Security", "MFA ENABLED"],
          ].map(([key, value]) => (
            <div key={key} className="grid grid-cols-[120px_1fr] gap-3 border-b pb-3" style={{ borderColor: palette.lineSoft }}>
              <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: palette.textMuted }}>
                {key}
              </span>
              <span className="text-sm tracking-[0.08em]" style={{ color: key === "Security" ? palette.accent : palette.text }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button className="h-10 border px-4 text-xs tracking-[0.2em]" style={{ borderColor: palette.accent, color: palette.accent }}>
            EDIT PROFILE
          </button>
          <button className="h-10 border px-4 text-xs tracking-[0.2em]" style={{ borderColor: palette.lineSoft, color: palette.text }}>
            SETTINGS
          </button>
          <button className="h-10 border px-4 text-xs tracking-[0.2em]" style={{ borderColor: palette.lineSoft, color: palette.text }}>
            LOGOUT
          </button>
        </div>

        <div className="mt-8 space-y-4">
          <TinyReadout palette={palette} />
          <DividerGlyph palette={palette} />
          <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>
            Restore / ZXTX / Static
          </div>
        </div>

        <BottomGraphicBand palette={palette} />
      </div>
    </section>
  );
}

function CardPair({ palette }: { palette: HudPalette }) {
  return (
    <section className="space-y-3">
      <p className="text-xs uppercase tracking-[0.26em]" style={{ color: "var(--brand-text-muted)" }}>
        {palette.name}
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.26em]" style={{ color: "var(--brand-text-muted)" }}>
            A. Login Card
          </p>
          <LoginWireCard palette={palette} />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.26em]" style={{ color: "var(--brand-text-muted)" }}>
            B. Account Card
          </p>
          <AccountWireCard palette={palette} />
        </div>
      </div>
    </section>
  );
}

export default function WireframesPage() {
  const [activePaletteId, setActivePaletteId] = useState<HudPalette["id"]>("classic");
  const palettes = useMemo(() => [classicPalette, brandPalette, primaryPalette, warnPalette], []);
  const activePalette = palettes.find((palette) => palette.id === activePaletteId) ?? classicPalette;

  return (
    <main className="min-h-screen bg-[#070707] px-5 py-8 text-white md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.45em] text-neutral-400">Wireframe Study</p>
          <h1 className="text-2xl font-semibold tracking-[0.06em] text-[#e7dd57] md:text-3xl">LOGIN / ACCOUNT CARD</h1>
          <p className="max-w-3xl text-sm leading-6 tracking-[0.02em] text-neutral-300">
            カラーパターンを切り替えて確認できます。`warn` は現在 `--brand-accent` を使用しています。
          </p>
        </header>

        <section className="flex flex-wrap gap-2">
          {palettes.map((palette) => (
            <button
              key={palette.id}
              onClick={() => setActivePaletteId(palette.id)}
              className="h-9 border px-3 text-xs uppercase tracking-[0.18em] transition-colors"
              style={{
                borderColor: activePaletteId === palette.id ? palette.accent : "var(--brand-text-muted)",
                color: activePaletteId === palette.id ? palette.accent : "var(--brand-text-muted)",
              }}
            >
              {palette.id}
            </button>
          ))}
        </section>

        <CardPair palette={activePalette} />
      </div>
    </main>
  );
}
