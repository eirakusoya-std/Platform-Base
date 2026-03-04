"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "../../lib/i18n";
import { useUserSession } from "../../lib/userSession";

type NavItem = {
  labelJp: string;
  labelEn: string;
  href?: string;
  shortLabelEn?: string;
};

const NAV_ITEMS: NavItem[] = [
  { labelJp: "ライブ", labelEn: "Live", href: "/", shortLabelEn: "Live" },
  { labelJp: "スケジュール", labelEn: "Schedule", href: "/schedule", shortLabelEn: "Schedule" },
  { labelJp: "タレント", labelEn: "Talent", shortLabelEn: "Talent" },
];

type TopNavProps = {
  mode?: "default" | "studio";
};

export function TopNav({ mode = "default" }: TopNavProps) {
  const pathname = usePathname();
  const { locale, setLocale, tx } = useI18n();
  const { user, isVtuber } = useUserSession();
  const isStudioMode = mode === "studio";

  return (
    <>
      <nav className="sticky top-0 z-40 bg-[var(--brand-surface)]/95 shadow-lg shadow-black/20 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-4 py-3 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--brand-primary)] text-sm font-bold text-white">A</div>
              <span className="text-lg font-semibold tracking-wide text-[var(--brand-text)]">aiment</span>
            </Link>

            {!isStudioMode && (
            <div className="hidden min-w-0 flex-1 items-center justify-center overflow-x-auto md:flex">
              <div className="flex items-center gap-2 rounded-xl bg-[var(--brand-bg-900)] p-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.href ? pathname === item.href : false;
                  if (!item.href) {
                    return (
                      <span key={item.labelJp} className="whitespace-nowrap rounded-lg px-4 py-2 text-sm text-[var(--brand-text-muted)]/80">
                        {tx(item.labelJp, item.labelEn)}
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[var(--brand-primary)] text-white"
                          : "text-[var(--brand-text-muted)] hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text)]"
                      }`}
                    >
                      {tx(item.labelJp, item.labelEn)}
                    </Link>
                  );
                })}
              </div>
            </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg bg-[var(--brand-bg-900)] p-1">
                <button
                  onClick={() => setLocale("jp")}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    locale === "jp"
                      ? "bg-[var(--brand-primary)] text-white"
                      : "text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
                  }`}
                >
                  JP
                </button>
                <button
                  onClick={() => setLocale("en")}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    locale === "en"
                      ? "bg-[var(--brand-primary)] text-white"
                      : "text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
                  }`}
                >
                  EN
                </button>
              </div>
              {!isStudioMode && isVtuber && (
                <Link
                  href="/studio/pre-live"
                  className="hidden items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_24px_rgba(124,106,230,0.45)] transition-all hover:brightness-110 sm:inline-flex"
                >
                  <span aria-hidden className="text-base leading-none">+</span>
                  <span>{tx("配信を作成", "Create Stream")}</span>
                </Link>
              )}
              <div className="hidden items-center gap-2 rounded-lg bg-[var(--brand-bg-900)] px-2.5 py-1.5 sm:flex">
                <div className="h-7 w-7 overflow-hidden rounded-full">
                  <img
                    src="https://api.dicebear.com/7.x/adventurer/svg?seed=TaroTanaka&backgroundColor=e6f0ff&hair=short02"
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="text-sm text-[var(--brand-text)]">{user.name}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {!isStudioMode && (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--brand-surface)]/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.25)] backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href ? pathname === item.href : false;
            if (!item.href) {
              return (
                <span
                  key={item.labelJp}
                  className="flex min-w-[72px] flex-1 items-center justify-center rounded-lg px-2 py-2 text-xs text-[var(--brand-text-muted)]/70"
                >
                  {locale === "jp" ? item.labelJp : item.shortLabelEn ?? item.labelEn}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-[72px] flex-1 items-center justify-center rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-[var(--brand-primary)] text-white"
                    : "text-[var(--brand-text-muted)] hover:bg-[var(--brand-bg-900)] hover:text-[var(--brand-text)]"
                }`}
              >
                {locale === "jp" ? item.labelJp : item.shortLabelEn ?? item.labelEn}
              </Link>
            );
          })}
        </div>
      </nav>
      )}
    </>
  );
}
