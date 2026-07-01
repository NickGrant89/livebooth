/** Transactional email — Resend when configured, no-op otherwise. */

const RESEND_API = "https://api.resend.com/emails";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { ok: false, error: "email_not_configured" };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] Resend error:", res.status, body);
      return { ok: false, error: "send_failed" };
    }

    return { ok: true };
  } catch (e) {
    console.error("[email] send failed:", e);
    return { ok: false, error: "send_failed" };
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const subject = "Reset your LiveBooth password";
  const html = `
    <p>You requested a password reset for LiveBooth.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    <p style="color:#888;font-size:12px">${resetUrl}</p>
  `.trim();
  const text = `Reset your LiveBooth password: ${resetUrl}\n\nExpires in 1 hour.`;

  return sendEmail({ to, subject, html, text });
}
