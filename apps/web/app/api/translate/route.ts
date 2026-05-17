import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppLang = "ja" | "en";

const DEFAULT_DEEPL_API_BASE_URL = "https://api.deepl.com/v2/translate";

function isAppLang(value: unknown): value is AppLang {
  return value === "ja" || value === "en";
}

export function mapToDeepLLang(lang: AppLang, usage: "source" | "target") {
  if (lang === "ja") return "JA";
  if (lang === "en" && usage === "source") return "EN";
  return "EN-US";
}

function getDeepLApiBaseUrl() {
  return process.env.DEEPL_API_BASE_URL?.trim() || DEFAULT_DEEPL_API_BASE_URL;
}

async function logDeepLError(response: Response) {
  const body = await response.text().catch(() => "");
  if (response.status === 403) {
    console.error("DeepL API returned 403. This may mean the API key is invalid or the endpoint does not match the key type.", {
      status: response.status,
      body,
    });
    return;
  }
  if (response.status === 456) {
    console.error("DeepL API returned 456. This may mean the DeepL quota has been exceeded.", {
      status: response.status,
      body,
    });
    return;
  }
  console.error("DeepL API failure", {
    status: response.status,
    body,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      text?: unknown;
      sourceLang?: unknown;
      targetLang?: unknown;
    } | null;

    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const sourceLang = body?.sourceLang;
    const targetLang = body?.targetLang;

    if (!text) return NextResponse.json({ error: "翻訳するテキストを入力してください。" }, { status: 400 });
    if (text.length > 300) return NextResponse.json({ error: "翻訳は300文字以内で入力してください。" }, { status: 400 });
    if (!isAppLang(sourceLang) || !isAppLang(targetLang) || sourceLang === targetLang) {
      return NextResponse.json({ error: "対応していない翻訳方向です。" }, { status: 400 });
    }

    const apiKey = process.env.DEEPL_API_KEY?.trim();
    if (!apiKey || apiKey === "your_deepl_api_key_here") {
      return NextResponse.json({ error: "DeepL API key is not configured. Set DEEPL_API_KEY in .env.local." }, { status: 500 });
    }

    const baseUrl = getDeepLApiBaseUrl();
    const form = new URLSearchParams();
    form.set("text", text);
    form.set("source_lang", mapToDeepLLang(sourceLang, "source"));
    form.set("target_lang", mapToDeepLLang(targetLang, "target"));

    const deeplResponse = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    if (!deeplResponse.ok) {
      await logDeepLError(deeplResponse);
      return NextResponse.json({ error: "翻訳サービスへの接続に失敗しました。少し待ってから再試行してください。" }, { status: 500 });
    }

    const payload = (await deeplResponse.json()) as { translations?: Array<{ text?: string }> };
    const translatedText = payload.translations?.[0]?.text?.trim();
    if (!translatedText) {
      return NextResponse.json({ error: "翻訳結果を取得できませんでした。" }, { status: 500 });
    }

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error("Translate route error", error);
    return NextResponse.json({ error: "翻訳に失敗しました。少し待ってから再試行してください。" }, { status: 500 });
  }
}
