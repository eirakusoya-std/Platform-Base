import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href?: string;
  shortLabel?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "ライブ", href: "/", shortLabel: "Live" },
  { label: "スケジュール", href: "/schedule", shortLabel: "Schedule" },
  { label: "タレント", shortLabel: "Talent" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="sticky top-0 z-40 bg-[var(--brand-surface)]/95 shadow-lg shadow-black/20 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-4 py-3 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--brand-primary)] text-sm font-bold text-[var(--brand-bg-900)]">A</div>
              <span className="text-lg font-semibold tracking-wide text-[var(--brand-text)]">aiment</span>
            </Link>

            <div className="hidden min-w-0 flex-1 items-center justify-center overflow-x-auto md:flex">
              <div className="flex items-center gap-2 rounded-xl bg-[var(--brand-bg-900)] p-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.href ? pathname === item.href : false;
                  if (!item.href) {
                    return (
                      <span key={item.label} className="whitespace-nowrap rounded-lg px-4 py-2 text-sm text-[var(--brand-text-muted)]/80">
                        {item.label}
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[var(--brand-primary)] text-[var(--brand-bg-900)]"
                          : "text-[var(--brand-text-muted)] hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/studio/pre-live"
                className="hidden rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-[var(--brand-bg-900)] transition-all hover:brightness-110 sm:block"
              >
                配信を作成
              </Link>
              <div className="hidden items-center gap-2 rounded-lg bg-[var(--brand-bg-900)] px-2.5 py-1.5 sm:flex">
                <div className="h-7 w-7 overflow-hidden rounded-full">
                  <img
                    src="https://api.dicebear.com/7.x/adventurer/svg?seed=TaroTanaka&backgroundColor=e6f0ff&hair=short02"
                    alt="田中太郎"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="text-sm text-[var(--brand-text)]">田中太郎</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--brand-surface)]/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.25)] backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href ? pathname === item.href : false;
            if (!item.href) {
              return (
                <span
                  key={item.label}
                  className="flex min-w-[72px] flex-1 items-center justify-center rounded-lg px-2 py-2 text-xs text-[var(--brand-text-muted)]/70"
                >
                  {item.shortLabel ?? item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-[72px] flex-1 items-center justify-center rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-[var(--brand-primary)] text-[var(--brand-bg-900)]"
                    : "text-[var(--brand-text-muted)] hover:bg-[var(--brand-bg-900)] hover:text-[var(--brand-text)]"
                }`}
              >
                {item.shortLabel ?? item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
