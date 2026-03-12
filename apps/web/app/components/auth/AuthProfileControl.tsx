"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserSession } from "../../lib/userSession";
import { WireframeAccountCardAiment } from "../../wireframes/page";

function MiniHudAccountCard({
  name,
  userId,
  role,
}: {
  name: string;
  userId: string;
  role: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg">
      <WireframeAccountCardAiment
        headerLabel="ACCOUNT"
        headerTitle="AIMENT"
        headerSubtitle={role.toUpperCase()}
        rows={[
          ["User Name", name],
          ["User ID", userId],
          ["Status", "ONLINE"],
        ]}
        showActionButtons={false}
        topGraphicVariant="simple"
        showCodeStacks={false}
        emphasizeUserName
        showFooterTelemetry={false}
        coinInfo={{ coins: "ACTIVE", streak: "SECURE" }}
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
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useUserSession();

  if (!isAuthenticated) {
    return (
      <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[430px] max-w-[calc(100vw-1rem)] origin-top-right scale-[0.72] rounded-xl bg-[var(--brand-surface-soft)] p-3 shadow-xl shadow-black/35 backdrop-blur">
        <div className="space-y-3">
          <div className="rounded-lg bg-[var(--brand-surface)] p-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--brand-text-muted)]">Auth Access</p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--brand-secondary)]">SIGN IN / SIGN UP</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--brand-text-muted)]">
              `Platform-Base` の UI を保ったまま、認証処理は現在の `/auth` backend を使います。
            </p>
          </div>
          <div className="grid gap-2">
            <Link
              href="/auth"
              onClick={onClose}
              className="flex h-11 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--brand-secondary)_18%,var(--brand-surface))] px-4 text-sm font-semibold text-[var(--brand-secondary)] transition hover:brightness-110"
            >
              ログイン
            </Link>
            <Link
              href="/auth?mode=signup"
              onClick={onClose}
              className="flex h-11 items-center justify-center rounded-lg bg-[var(--brand-surface)] px-4 text-sm font-medium text-[var(--brand-text)] transition hover:brightness-110"
            >
              サインアップ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[430px] max-w-[calc(100vw-1rem)] origin-top-right scale-[0.72] rounded-xl bg-[var(--brand-surface-soft)] p-3 shadow-xl shadow-black/35 backdrop-blur">
      <div className="space-y-3">
        <MiniHudAccountCard
          name={user?.name?.trim() || "USER"}
          userId={user?.id?.trim() || "aiment_user"}
          role={user?.role || "listener"}
        />

        <div className="grid gap-2">
          <Link
            href="/account"
            onClick={onClose}
            className="flex h-11 items-center justify-center rounded-lg bg-[var(--brand-secondary)] px-3 text-sm font-semibold text-[var(--brand-bg-900)] transition hover:brightness-110"
          >
            アカウント管理
          </Link>
          <button
            type="button"
            onClick={() => {
              void logout().then(() => {
                onClose();
                router.push("/");
              });
            }}
            disabled={loading}
            className="h-11 rounded-lg bg-[var(--brand-accent)] px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}

export function AuthProfileControl() {
  const { user, isAuthenticated, loading } = useUserSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  const displayName = isAuthenticated ? user?.name?.trim() || "User" : "Guest";
  const roleLabel = isAuthenticated ? user?.role || "listener" : "auth";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group flex min-w-[152px] items-center gap-3 rounded-lg border border-[var(--brand-text-muted)]/40 bg-[var(--brand-surface-soft)] px-3 py-2 text-left transition hover:border-[var(--brand-secondary)]/70"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="grid h-10 w-10 place-items-center rounded-full border border-[var(--brand-secondary)]/60 bg-[color-mix(in_srgb,var(--brand-secondary)_16%,transparent)] text-xs font-bold text-[var(--brand-secondary)]">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--brand-text)]">{loading ? "Loading..." : displayName}</p>
          <p className="truncate text-[10px] uppercase tracking-[0.22em] text-[var(--brand-text-muted)]">{roleLabel}</p>
        </div>
        <div className="h-5 w-5 border border-[var(--brand-text-muted)]/60 transition group-hover:border-[var(--brand-secondary)]/80" />
      </button>

      {open ? <AuthDropdown onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
