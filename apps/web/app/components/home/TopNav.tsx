"use client";

import { ComponentType, SVGProps } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { CalendarDaysIcon, HomeIcon, RectangleStackIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import { AuthProfileControl } from "../auth/AuthProfileControl";
import { useI18n } from "../../lib/i18n";
import { useUserSession } from "../../lib/userSession";
import { buttonClassName } from "../ui/Button";

type NavItem = {
  labelJp: string;
  labelEn: string;
  href?: string;
  shortLabelEn?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const BASE_NAV_ITEMS: NavItem[] = [
  { labelJp: "ライブ", labelEn: "Live", href: "/", shortLabelEn: "Live", icon: HomeIcon },
  { labelJp: "スケジュール", labelEn: "Schedule", href: "/schedule", shortLabelEn: "Schedule", icon: CalendarDaysIcon },
];

type TopNavProps = {
  mode?: "default" | "studio";
};

export function TopNav({ mode = "default" }: TopNavProps) {
  const pathname = usePathname();
  const { locale, setLocale, tx } = useI18n();
  const { isVtuber } = useUserSession();
  const isStudioMode = mode === "studio";
  const navItems: NavItem[] = isVtuber
    ? [
        ...BASE_NAV_ITEMS,
        { labelJp: "チャンネル", labelEn: "Channel", href: "/channel", shortLabelEn: "Channel", icon: RectangleStackIcon },
      ]
    : BASE_NAV_ITEMS;

  return (
    <>
      <nav className="sticky top-0 z-40 bg-[var(--brand-surface)]/95 shadow-lg shadow-black/20 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-4 py-3 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="h-8 w-8 overflow-hidden rounded">
                <Image
                  src="/logo/aiment_logo_rounded.svg"
                  alt="aiment logo"
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <span className="text-lg font-semibold tracking-wide text-[var(--brand-text)]">aiment</span>
            </Link>

            {!isStudioMode && (
            <div className="hidden min-w-0 flex-1 items-center justify-center overflow-x-auto md:flex">
              <div className="flex items-center gap-2 rounded-xl bg-[var(--brand-bg-900)] p-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href ? pathname === item.href : false;
                  if (!item.href) {
                    return (
                      <span key={item.labelJp} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm text-[var(--brand-text-muted)]/80">
                        <Icon className="h-4 w-4" aria-hidden />
                        {tx(item.labelJp, item.labelEn)}
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[var(--brand-primary)] text-white"
                          : "text-[var(--brand-text-muted)] hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
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
                {isStudioMode && isVtuber && (
                <Link
                  href="/studio/sessions"
                  className={`hidden sm:inline-flex ${buttonClassName({ variant: "ghost", size: "md" })}`}
                >
                  {tx("枠管理", "My Sessions")}
                </Link>
              )}
              {!isStudioMode && isVtuber && (
                <Link
                  href="/studio/pre-live"
                  className={`hidden shadow-[var(--ui-shadow-1)] sm:inline-flex ${buttonClassName({ variant: "primary", size: "md" })}`}
                >
                  <VideoCameraIcon className="h-5 w-5" aria-hidden />
                  <span>{tx("配信を作成", "Create Stream")}</span>
                </Link>
              )}
              <div>
                <AuthProfileControl />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {!isStudioMode && (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--brand-surface)]/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.25)] backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href ? pathname === item.href : false;
            if (!item.href) {
              return (
                <span
                  key={item.labelJp}
                  className="flex min-w-[72px] flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs text-[var(--brand-text-muted)]/70"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {locale === "jp" ? item.labelJp : item.shortLabelEn ?? item.labelEn}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-[72px] flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-[var(--brand-primary)] text-white"
                    : "text-[var(--brand-text-muted)] hover:bg-[var(--brand-bg-900)] hover:text-[var(--brand-text)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
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
