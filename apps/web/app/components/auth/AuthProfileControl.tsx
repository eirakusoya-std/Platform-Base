"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserSession } from "../../lib/userSession";

export function AuthProfileControl() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useUserSession();

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/auth" className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2 text-sm font-semibold text-[var(--brand-text)]">
          ログイン
        </Link>
        <Link href="/auth?mode=signup" className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white">
          サインアップ
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-[var(--brand-bg-900)] px-2.5 py-1.5">
      <div className="leading-tight">
        <span className="block text-sm text-[var(--brand-text)]">{user?.name}</span>
        <span className="block text-[10px] uppercase tracking-wide text-[var(--brand-text-muted)]">{user?.role}</span>
      </div>
      <Link href="/account" className="rounded-md bg-[var(--brand-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--brand-text)]">
        管理
      </Link>
      <button
        type="button"
        onClick={() => {
          void logout().then(() => {
            router.push("/");
          });
        }}
        disabled={loading}
        className="rounded-md bg-[var(--brand-bg-900)] px-2.5 py-1.5 text-xs font-semibold text-[var(--brand-text-muted)]"
      >
        ログアウト
      </button>
    </div>
  );
}
