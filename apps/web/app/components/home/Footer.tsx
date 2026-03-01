export function Footer() {
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
 <h3 className="mb-4 text-sm font-medium text-[var(--brand-text)]">プラットフォーム</h3>
 <ul className="space-y-2 text-sm text-[var(--brand-text-muted)]">
 <li>使い方</li>
 <li>機能</li>
 <li>料金</li>
 </ul>
 </div>
 <div>
 <h3 className="mb-4 text-sm font-medium text-[var(--brand-text)]">サポート</h3>
 <ul className="space-y-2 text-sm text-[var(--brand-text-muted)]">
 <li>ヘルプセンター</li>
 <li>コミュニティ</li>
 <li>ガイドライン</li>
 </ul>
 </div>
 <div>
 <h3 className="mb-4 text-sm font-medium text-[var(--brand-text)]">会社情報</h3>
 <ul className="space-y-2 text-sm text-[var(--brand-text-muted)]">
 <li>運営会社</li>
 <li>採用情報</li>
 <li>お問い合わせ</li>
 </ul>
 </div>
 </div>
 <div className="flex items-center justify-between pt-8 text-sm text-[var(--brand-text-muted)]">
 <p>© 2026 aiment. All rights reserved.</p>
 <div className="flex items-center gap-6">
 <span>プライバシーポリシー</span>
 <span>利用規約</span>
 </div>
 </div>
 </div>
 </footer>
 );
}
