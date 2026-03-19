"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SessionUser, useUserSession } from "../../lib/userSession";
import { WireframeAccountCardAiment } from "../../wireframes/page";



function MiniHudAccountCard({ user }: { user: SessionUser | null }) {
  const displayName = user?.name?.trim() || "XXXX XXXXX";
  const userId = user?.id?.trim() || "aiment_00021";

  return (
    <section className="overflow-hidden rounded-lg">
      <WireframeAccountCardAiment
        headerLabel="PLAN"
        headerTitle="AIMEN"
        headerSubtitle="STANDARD / NORMAL"
        rows={[
          ["User Name", displayName],
          ["User ID", userId],
          ["Last Login", "2026-03-07 20:41"],
        ]}
        showActionButtons={false}
        topGraphicVariant="simple"
        showCodeStacks={false}
        emphasizeUserName
        showFooterTelemetry={false}
        coinInfo={{ coins: "12,480", streak: "27日" }}
        coinDecorationVariant="verticalRight"
        verticalText="BOOT / REMAP"
        minHeightClass="min-h-[468px]"
        bottomBandTopMarginClass="mt-2"
        showBottomBand={false}
        showInlineBottomGlyph
      />
    </section>
  );
}

function AuthDropdown({ onClose }: { onClose: () => void }) {
  const { user, isAuthenticated, login, logout } = useUserSession();
  const [selectedRole, setSelectedRole] = useState<SessionUser["role"]>("listener");
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    window.location.href = `/api/auth/google?role=${selectedRole}`;
  };

  const handleMockLogin = () => {
    login({
      id: `mock-${Date.now().toString(36)}`,
      name: "田中太郎",
      email: "tanaka@example.com",
      role: selectedRole,
      authProvider: "password",
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[430px] max-w-[calc(100vw-1rem)] origin-top-right scale-[0.72] rounded-xl bg-[var(--brand-surface-soft)] p-3 shadow-xl shadow-black/35 backdrop-blur">
      {!isAuthenticated ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--brand-text-muted)]">ログイン方法を選択してください。</p>
          <div className="rounded-lg bg-[var(--brand-surface)] p-2">
            <p className="mb-2 text-xs text-[var(--brand-text-muted)]">ログインロール（仮）</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole("listener")}
                className={`h-9 rounded-md text-xs font-semibold transition ${
                  selectedRole === "listener"
                    ? "bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]"
                    : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"
                }`}
              >
                リスナー
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("vtuber")}
                className={`h-9 rounded-md text-xs font-semibold transition ${
                  selectedRole === "vtuber"
                    ? "bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]"
                    : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"
                }`}
              >
                VTuber
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="h-10 w-full rounded-lg bg-[color-mix(in_srgb,var(--brand-secondary)_18%,var(--brand-surface))] px-4 text-sm font-semibold text-[var(--brand-secondary)] transition hover:brightness-110"
          >
            Googleでログイン
          </button>
          <button
            type="button"
            onClick={handleMockLogin}
            className="h-10 w-full rounded-lg bg-[var(--brand-surface)] px-4 text-sm font-medium text-[var(--brand-text)] transition hover:brightness-110"
          >
            仮ログイン
          </button>
          {error && <p className="text-xs text-[var(--brand-accent)]">{error}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <MiniHudAccountCard user={user} />

          <div className="grid gap-2">
            <Link
              href="/account/settings"
              onClick={onClose}
              className="flex h-11 items-center justify-center rounded-lg bg-[var(--brand-secondary)] px-3 text-sm font-semibold text-[var(--brand-bg-900)] transition hover:brightness-110"
            >
              アカウント設定
            </Link>
            <button
              type="button"
              onClick={() => {
                void logout().then(onClose);
              }}
              className="h-11 rounded-lg bg-[var(--brand-accent)] px-4 text-sm font-semibold text-white transition hover:brightness-110"
            >
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AuthProfileControl() {
  const { user, isAuthenticated, hydrated } = useUserSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group flex items-center gap-2 rounded-lg bg-[var(--brand-bg-900)] px-2.5 py-1.5"
      >
        <span className="relative block h-7 w-7 overflow-hidden rounded-full">
          {isAuthenticated && user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 bg-[color-mix(in_srgb,var(--brand-secondary)_20%,transparent)]" />
          )}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[var(--brand-secondary)] bg-[var(--brand-bg-900)]" />
        </span>
        <span className="max-w-[110px] truncate text-sm text-[var(--brand-text)]">{hydrated ? (isAuthenticated ? user?.name : "田中太郎") : "..."}</span>
      </button>

      {open && <AuthDropdown onClose={() => setOpen(false)} />}
    </div>
  );
}
