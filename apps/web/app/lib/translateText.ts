import type { ChatLanguage, ChatSenderRole } from "./chatMessages";

export type TranslationDirection = "ja-en" | "en-ja";

export async function translateText({
  text,
  sourceLang,
  targetLang,
}: {
  text: string;
  sourceLang: ChatLanguage;
  targetLang: ChatLanguage;
}): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("翻訳するテキストを入力してください。");
  if (trimmed.length > 300) throw new Error("翻訳は300文字以内で入力してください。");

  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: trimmed, sourceLang, targetLang }),
  });
  const payload = (await response.json().catch(() => null)) as { translatedText?: string; error?: string } | null;
  if (!response.ok || !payload?.translatedText) {
    throw new Error(payload?.error ?? "翻訳に失敗しました。");
  }
  return payload.translatedText;
}

export function logTranslationUsage({
  direction,
  sourceTextLength,
  translatedTextLength,
}: {
  sessionId?: string;
  userRole?: ChatSenderRole;
  direction: TranslationDirection;
  sourceTextLength: number;
  translatedTextLength: number;
}) {
  console.log("[aiment translation usage]", {
    provider: "deepl",
    sourceTextLength,
    translatedTextLength,
    direction,
    createdAt: new Date().toISOString(),
  });
}
