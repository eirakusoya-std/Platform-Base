"use client";

import Link from "next/link";
import { TopNav } from "../components/home/TopNav";
import { useI18n } from "../lib/i18n";

export default function PrivacyPage() {
  const { tx } = useI18n();

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav />
      <main className="mx-auto max-w-3xl px-5 py-8 md:px-10 md:py-12">
        <section className="rounded-3xl border border-white/10 bg-[var(--brand-surface)] p-7">
          <h1 className="text-2xl font-semibold">{tx("プライバシーポリシー", "Privacy Policy")}</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--brand-text-muted)]">
            {tx(
              "サービス提供と安全性確保のため、アカウント情報、アクセスログ、配信関連メタデータを取得します。取得した情報は認証、運用改善、不正対策、法令対応の目的で利用し、法令で認められる範囲を除き本人同意なく目的外利用しません。",
              "We collect account information, access logs, and stream-related metadata to provide the service and keep it safe. This information is used for authentication, operations improvement, abuse prevention, and legal compliance. Except where permitted by law, we do not use it for other purposes without your consent.",
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
