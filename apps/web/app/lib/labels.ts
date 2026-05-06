type Translate = (jp: string, en: string) => string;

export function categoryLabel(value: string, tx: Translate): string {
  if (value === "雑談") return tx("雑談", "Chat");
  if (value === "ゲーム") return tx("ゲーム", "Games");
  if (value === "歌枠") return tx("歌枠", "Singing");
  if (value === "英語") return tx("英語", "English");
  if (value === "参加型") return tx("参加型", "Interactive");
  return value;
}

export function participationLabel(value: string, tx: Translate): string {
  if (value === "First-come" || value === "先着順") return tx("先着順", "First-come");
  if (value === "Lottery" || value === "抽選制") return tx("抽選制", "Lottery");
  if (value === "Members-only" || value === "メンバー限定") return tx("メンバー限定", "Members only");
  return value;
}
