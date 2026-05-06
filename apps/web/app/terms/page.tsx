"use client";

import Link from "next/link";
import { TopNav } from "../components/home/TopNav";
import { useI18n } from "../lib/i18n";

export default function TermsPage() {
  const { tx } = useI18n();

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav />
      <main className="mx-auto max-w-3xl px-5 py-8 md:px-10 md:py-12">
        <section className="rounded-3xl border border-white/10 bg-[var(--brand-surface)] p-7">
          <h1 className="text-2xl font-semibold">{tx("利用規約", "Terms of Use")}</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--brand-text-muted)]">
            {tx(
              "本サービスの利用に際して、アカウント情報の適切な管理、他ユーザーへの迷惑行為の禁止、権利侵害コンテンツの投稿禁止、法令順守を求めます。運営は必要に応じてアカウント制限やコンテンツ削除を行う場合があります。",
              "When using this service, you must manage your account information appropriately, avoid behavior that harms other users, avoid posting content that infringes rights, and comply with applicable laws. The operations team may restrict accounts or remove content when necessary.",
            )}
          </p>
          <div className="mt-6">
            <Link href="/auth/signup" className="text-sm font-semibold text-[var(--brand-secondary)] underline-offset-2 hover:underline">
              {tx("サインアップに戻る", "Back to Sign Up")}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
