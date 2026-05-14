export type ChatSenderRole = "vtuber" | "speaker" | "listener";
export type ChatLanguage = "ja" | "en";

export type BilingualChatMessage = {
  id: string;
  sessionId: string;
  senderRole: ChatSenderRole;
  senderName?: string;
  originalText: string;
  originalLang: ChatLanguage;
  translatedText?: string;
  translatedLang?: ChatLanguage;
  createdAt: string;
};

export type ChatDataPayload = Partial<BilingualChatMessage> & {
  type?: string;
  user?: string;
  text?: string;
};

export function isChatSenderRole(value: unknown): value is ChatSenderRole {
  return value === "vtuber" || value === "speaker" || value === "listener";
}

export function isChatLanguage(value: unknown): value is ChatLanguage {
  return value === "ja" || value === "en";
}

export function parseChatDataPayload(payload: unknown, fallback: {
  sessionId: string;
  senderRole: ChatSenderRole;
  senderName?: string;
}): BilingualChatMessage | null {
  if (!payload || typeof payload !== "object") return null;
  const message = payload as ChatDataPayload;
  if (message.type !== "chat") return null;

  const id = typeof message.id === "string" ? message.id : crypto.randomUUID();
  const senderRole = isChatSenderRole(message.senderRole) ? message.senderRole : fallback.senderRole;
  const senderName =
    typeof message.senderName === "string"
      ? message.senderName
      : typeof message.user === "string"
        ? message.user
        : fallback.senderName;
  const originalText =
    typeof message.originalText === "string"
      ? message.originalText
      : typeof message.text === "string"
        ? message.text
        : "";
  if (!originalText.trim()) return null;

  const originalLang = isChatLanguage(message.originalLang)
    ? message.originalLang
    : senderRole === "vtuber"
      ? "ja"
      : "en";
  const translatedText = typeof message.translatedText === "string" ? message.translatedText : undefined;
  const translatedLang = isChatLanguage(message.translatedLang)
    ? message.translatedLang
    : translatedText
      ? originalLang === "ja"
        ? "en"
        : "ja"
      : undefined;

  return {
    id,
    sessionId: typeof message.sessionId === "string" ? message.sessionId : fallback.sessionId,
    senderRole,
    senderName,
    originalText,
    originalLang,
    translatedText,
    translatedLang,
    createdAt: typeof message.createdAt === "string" ? message.createdAt : new Date().toISOString(),
  };
}

export function primaryTextForMessage(message: BilingualChatMessage) {
  return message.originalText;
}

export function secondaryTextForMessage(message: BilingualChatMessage) {
  return message.translatedText;
}
