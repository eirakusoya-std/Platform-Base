"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightOnRectangleIcon, Cog6ToothIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import { useUserSession } from "../../lib/userSession";
import { Button, buttonClassName } from "../ui/Button";
import { Card } from "../ui/Card";

function AuthDropdown({ onClose }: { onClose: () => void }) {
  const { isAuthenticated, isVtuber, logout } = useUserSession();
  const router = useRouter();

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const handleEmailLogin = () => {
    onClose();
    router.push("/auth");
  };

  return (
    <Card
      className="absolute right-0 top-full mt-2 z-50 w-[300px] max-w-[calc(100vw-1rem)] p-3 shadow-[var(--ui-shadow-2)]"
      tone="default"
    >
      {!isAuthenticated ? (
        <div className="space-y-2">
          <p className="px-1 text-xs text-[var(--brand-text-muted)]">ログインして配信や予約を続ける</p>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="h-11 w-full rounded-xl bg-[var(--brand-secondary)] px-4 text-sm font-extrabold text-black transition-all hover:brightness-110"
          >
            Googleで続行
          </button>
          <button
            type="button"
            onClick={handleEmailLogin}
            className="h-11 w-full rounded-xl bg-[var(--brand-bg-900)] px-4 text-sm font-semibold text-[var(--brand-text)] transition-all hover:brightness-110"
          >
            メールで続行
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {isVtuber && (
            <Link href="/channel" onClick={onClose} className={buttonClassName({ variant: "soft", size: "md", fullWidth: true, className: "justify-start" })}>
              <VideoCameraIcon className="h-4 w-4" aria-hidden />
              チャンネル管理
            </Link>
          )}
          <Link href="/account" onClick={onClose} className={buttonClassName({ variant: "ghost", size: "md", fullWidth: true, className: "justify-start" })}>
            <Cog6ToothIcon className="h-4 w-4" aria-hidden />
            アカウント設定
          </Link>
          <Button
            type="button"
            onClick={() => {
              void logout().then(onClose);
            }}
            variant="danger"
            size="md"
            fullWidth
            className="justify-start"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden />
            ログアウト
          </Button>
        </div>
      )}
    </Card>
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
      {!isAuthenticated ? (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="h-10 rounded-xl bg-[var(--brand-secondary)] px-4 text-sm font-bold text-black transition-all hover:brightness-110"
        >
          {hydrated ? "ログイン" : "..."}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="ui-btn ui-btn-md ui-btn-ghost group h-10 px-2.5"
        >
          <span className="relative block h-7 w-7 overflow-hidden rounded-full bg-[var(--brand-bg-800)]">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-[10px] font-bold text-[var(--brand-primary)]">
                {(user?.name || "A").slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>
          <span className="max-w-[110px] truncate text-sm text-[var(--brand-text)]">{hydrated ? user?.name : "..."}</span>
        </button>
      )}

      {open && <AuthDropdown onClose={() => setOpen(false)} />}
    </div>
  );
}
