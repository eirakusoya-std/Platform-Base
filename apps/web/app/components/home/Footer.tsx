"use client";

import { useI18n } from "../../lib/i18n";

export function Footer() {
 const { tx } = useI18n();
 return (
 <footer className="mt-20 bg-[var(--brand-bg-900)]">
 <div className="mx-auto max-w-[1400px] px-8 py-12 lg:px-12">
 <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-12">
 <div>
 <div className="mb-4 flex items-center gap-2">
 <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--brand-primary)] text-xs font-bold text-[var(--brand-bg-900)]">A</div>
 <span className="font-medium text-[var(--brand-text)]">aiment</span>
 </div>
 <p className="text-sm leading-relaxed text-[var(--brand-text-muted)]">Beyond Chat. Unlock Distance.</p>
 </div>
 <div>
 <h3 className="mb-4 text-sm font-medium text-[var(--brand-text)]">{tx("プラットフォーム", "Platform")}</h3>
 <ul className="space-y-2 text-sm text-[var(--brand-text-muted)]">
 <li>{tx("使い方", "How it works")}</li>
 <li>{tx("機能", "Features")}</li>
 <li>{tx("料金", "Pricing")}</li>
 </ul>
 </div>
 <div>
 <h3 className="mb-4 text-sm font-medium text-[var(--brand-text)]">{tx("サポート", "Support")}</h3>
 <ul className="space-y-2 text-sm text-[var(--brand-text-muted)]">
 <li>{tx("ヘルプセンター", "Help Center")}</li>
 <li>{tx("コミュニティ", "Community")}</li>
 <li>{tx("ガイドライン", "Guidelines")}</li>
 </ul>
 </div>
 <div>
 <h3 className="mb-4 text-sm font-medium text-[var(--brand-text)]">{tx("会社情報", "Company")}</h3>
 <ul className="space-y-2 text-sm text-[var(--brand-text-muted)]">
 <li>{tx("運営会社", "About")}</li>
 <li>{tx("採用情報", "Careers")}</li>
 <li>{tx("お問い合わせ", "Contact")}</li>
 </ul>
 </div>
 </div>
 <div className="flex items-center justify-between pt-8 text-sm text-[var(--brand-text-muted)]">
 <p>© 2026 aiment. All rights reserved.</p>
 <div className="flex items-center gap-6">
 <span>{tx("プライバシーポリシー", "Privacy Policy")}</span>
 <span>{tx("利用規約", "Terms of Use")}</span>
 </div>
 </div>
 </div>
 </footer>
 );
}
