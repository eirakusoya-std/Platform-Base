"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth");
  }, [router]);

  return (
    <main className="min-h-screen bg-[var(--brand-bg-900)] px-5 py-8 text-[var(--brand-text)] md:px-10 md:py-12">
      <p className="text-sm text-[var(--brand-text-muted)]">ログインページへ移動中...</p>
    </main>
  );
}
