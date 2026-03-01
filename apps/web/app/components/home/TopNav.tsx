import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
 label: string;
 href?: string;
};

const NAV_ITEMS: NavItem[] = [
 { label: "ライブ", href: "/" },
 { label: "スケジュール", href: "/schedule" },
 { label: "タレント" },
];

export function TopNav() {
 const pathname = usePathname();

 return (
 <nav className=" bg-[var(--brand-bg-900)]">
 <div className="mx-auto max-w-[1400px] px-8 py-5 lg:px-12">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <Link href="/" className="flex items-center gap-2">
 <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--brand-primary)] text-xs font-bold text-[var(--brand-bg-900)]">A</div>
 <span className="text-lg font-medium tracking-wide text-[var(--brand-text)]">aiment</span>
 </Link>
 <div className="flex items-center gap-1 text-sm">
 {NAV_ITEMS.map((item, index) => {
 const isActive = item.href ? pathname === item.href : false;
 return (
 <div key={item.href ?? item.label} className="flex items-center">
 {item.href ? (
 <Link
 href={item.href}
 className={`px-5 py-2 transition-colors ${isActive ? "font-medium text-[var(--brand-primary)]" : "text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"}`}
 >
 {item.label}
 </Link>
 ) : (
 <span className="px-5 py-2 text-[var(--brand-text-muted)]">{item.label}</span>
 )}
 {index < NAV_ITEMS.length - 1 && <span className="text-[var(--brand-text-muted)]">|</span>}
 </div>
 );
 })}
 <span className="mx-1 text-[var(--brand-text-muted)]">|</span>
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 hover:bg-[var(--brand-bg-900)]">
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
 );
}
