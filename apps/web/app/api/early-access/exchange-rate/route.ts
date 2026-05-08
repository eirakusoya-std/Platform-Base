// SOLID: S（為替レート取得のプロキシに専念。CORSを回避するためサーバーサイドで取得）
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=PHP&to=JPY", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);
    const data = (await res.json()) as { rates?: { JPY?: number } };
    const rate = data.rates?.JPY;
    if (!rate) throw new Error("JPY rate not found");
    return NextResponse.json({ rate });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch exchange rate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
