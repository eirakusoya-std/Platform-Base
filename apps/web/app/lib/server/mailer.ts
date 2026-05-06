// SOLID: S（メール送信責務に専念。SendGrid への依存をここに集約）

type SendGridClient = {
  setApiKey: (apiKey: string) => void;
  send: (message: {
    to: string;
    from: { email: string; name: string };
    subject: string;
    text: string;
    html: string;
  }) => Promise<unknown>;
};

type SendGridModule = SendGridClient & {
  default?: SendGridClient;
};

async function getSendGridClient(): Promise<SendGridClient | null> {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<SendGridModule>;
    const sendGridModule = await dynamicImport("@sendgrid/mail");
    const client = sendGridModule.default ?? sendGridModule;
    client.setApiKey(apiKey);
    return client;
  } catch (error) {
    console.warn("[mailer] @sendgrid/mail is not available. Skipping email send.", error);
    return null;
  }
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL?.trim() ?? "noreply@aiment.jp";

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const client = await getSendGridClient();
  if (!client) {
    // SendGrid未設定の場合はログのみ（開発環境ではdevCodeで代替）
    console.info(`[mailer] SENDGRID_API_KEY not set. Verification code for ${to}: ${code}`);
    return;
  }

  await client.send({
    to,
    from: { email: FROM_EMAIL, name: "Aiment" },
    subject: "【Aiment】メールアドレスの確認コード",
    text: `確認コード: ${code}\n\nこのコードは10分間有効です。\n身に覚えのない場合は無視してください。`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f0f14;color:#e8e8f0;border-radius:16px;">
        <h2 style="color:#a78bfa;margin-bottom:8px;">Aiment</h2>
        <h3 style="margin-top:0;">メールアドレスの確認</h3>
        <p style="color:#9090a0;">以下の確認コードを入力してください。</p>
        <div style="background:#1a1a2e;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#a78bfa;">${code}</span>
        </div>
        <p style="color:#9090a0;font-size:13px;">このコードは10分間有効です。<br>身に覚えのない場合は無視してください。</p>
      </div>
    `,
  });
}
