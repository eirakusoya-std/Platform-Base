// SOLID: S（メール送信責務に専念。SendGrid への依存をここに集約）
import sgMail from "@sendgrid/mail";

function getSendGridClient(): typeof sgMail | null {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (!apiKey) return null;
  sgMail.setApiKey(apiKey);
  return sgMail;
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL?.trim() ?? "noreply@aiment.jp";

export async function sendEarlyAccessNotification(opts: {
  participantName: string;
  participantEmail: string;
}): Promise<void> {
  const client = getSendGridClient();
  const { participantName, participantEmail } = opts;

  if (!client) {
    console.info(`[mailer] Early access payment received: ${participantName} <${participantEmail}>`);
    return;
  }

  const notifyAddresses = ["kmc2427@kamiyama.ac.jp", "kmc2408@kamiyama.ac.jp"];
  await Promise.all(
    notifyAddresses.map((to) =>
      client.send({
        to,
        from: { email: FROM_EMAIL, name: "Aiment" },
        subject: "【Aiment】アーリーアクセス参加者の支払い完了",
        text: `アーリーアクセスへの支払いが完了しました。\n\n参加者名: ${participantName}\nメールアドレス: ${participantEmail}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f0f14;color:#e8e8f0;border-radius:16px;">
            <h2 style="color:#a78bfa;margin-bottom:8px;">Aiment</h2>
            <h3 style="margin-top:0;">アーリーアクセス参加者の支払い完了</h3>
            <table style="width:100%;border-collapse:collapse;margin:24px 0;">
              <tr><td style="color:#9090a0;padding:8px 0;border-bottom:1px solid #1a1a2e;">参加者名</td><td style="padding:8px 0;border-bottom:1px solid #1a1a2e;">${participantName}</td></tr>
              <tr><td style="color:#9090a0;padding:8px 0;">メールアドレス</td><td style="padding:8px 0;">${participantEmail}</td></tr>
            </table>
          </div>
        `,
      })
    )
  );
}

export async function sendStreamReminder(opts: {
  to: string;
  userName: string;
  sessionTitle: string;
  sessionId: string;
  startsAt: Date;
  isPaid: boolean;
}): Promise<void> {
  const { to, userName, sessionTitle, sessionId, startsAt, isPaid } = opts;
  const client = getSendGridClient();
  const joinUrl = `https://aiment.jp/join/${encodeURIComponent(sessionId)}`;
  const startStr = startsAt.toLocaleString("en-US", { timeZone: "Asia/Tokyo", hour12: false });

  const paymentWarning = isPaid
    ? ""
    : `\n\n⚠️ Payment required: Your speaker reservation is not yet paid. You will NOT be able to enter the session without completing payment. Please visit the link below and pay before the stream starts.\n${joinUrl}`;

  const paymentWarningHtml = isPaid
    ? ""
    : `
      <div style="background:#2a1a2e;border:1px solid #7c3aed;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="color:#f472b6;font-weight:bold;margin:0 0 8px;">⚠️ Payment Required</p>
        <p style="color:#e8e8f0;margin:0;font-size:14px;">Your speaker reservation is <strong>not yet paid</strong>. You will <strong>not be able to enter</strong> the session without completing payment. Please pay before the stream starts.</p>
        <a href="${joinUrl}" style="display:inline-block;margin-top:12px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;padding:10px 20px;font-weight:bold;">Pay now →</a>
      </div>`;

  if (!client) {
    console.info(`[mailer] Stream reminder for ${to}: "${sessionTitle}" starts at ${startStr}${paymentWarning}`);
    return;
  }

  await client.send({
    to,
    from: { email: FROM_EMAIL, name: "Aiment" },
    subject: `[Aiment] "${sessionTitle}" starts in 3 hours!`,
    text: `Hi ${userName},\n\nYour reserved session is starting in 3 hours!\n\nSession: ${sessionTitle}\nStarts: ${startStr} (JST)\nJoin: ${joinUrl}${paymentWarning}\n\n— Aiment Team`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f0f14;color:#e8e8f0;border-radius:16px;">
        <h2 style="color:#a78bfa;margin-bottom:4px;">Aiment</h2>
        <p style="color:#9090a0;margin:0 0 24px;font-size:13px;">Stream Reminder</p>
        <h3 style="margin:0 0 8px;font-size:18px;">Your session starts in 3 hours!</h3>
        <p style="color:#9090a0;margin:0 0 20px;">Hi ${userName}, get ready — the stream is almost here.</p>
        <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:13px;color:#9090a0;">Session</p>
          <p style="margin:0 0 16px;font-weight:bold;font-size:16px;">${sessionTitle}</p>
          <p style="margin:0 0 4px;font-size:13px;color:#9090a0;">Starts at (JST)</p>
          <p style="margin:0;font-size:15px;">${startStr}</p>
        </div>
        ${paymentWarningHtml}
        <a href="${joinUrl}" style="display:block;text-align:center;background:#7c3aed;color:#fff;text-decoration:none;border-radius:12px;padding:14px;font-weight:bold;font-size:15px;">Join the session →</a>
        <p style="color:#9090a0;font-size:12px;margin-top:24px;text-align:center;">— Aiment Team</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const client = getSendGridClient();
  if (!client) {
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
