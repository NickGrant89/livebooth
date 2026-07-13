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

export async function sendSupportTicketAlertEmail(options: {
  to: string;
  ticketId: string;
  subject: string;
  email: string;
  preview: string;
  isNew?: boolean;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://livebooth.uk";
  const title = options.isNew ? "New support chat" : "New support message";
  const html = `
    <p><strong>${title}</strong></p>
    <p>From: ${options.email}</p>
    <p>Subject: ${options.subject}</p>
    <p>${options.preview.slice(0, 500)}</p>
    <p><a href="${appUrl}/admin">Open admin support inbox</a></p>
  `.trim();
  const text = `${title}\nFrom: ${options.email}\nSubject: ${options.subject}\n\n${options.preview}\n\n${appUrl}/admin`;

  return sendEmail({ to: options.to, subject: `[LiveBooth] ${title}: ${options.subject}`, html, text });
}

export async function sendAdminPasswordResetEmail(to: string, resetUrl: string, adminName: string) {
  const subject = "LiveBooth password reset (admin initiated)";
  const html = `
    <p>An admin reset your LiveBooth password for account <strong>${adminName}</strong>.</p>
    <p><a href="${resetUrl}">Set a new password</a></p>
    <p>This link expires in 1 hour.</p>
  `.trim();
  const text = `Set a new LiveBooth password: ${resetUrl}`;

  return sendEmail({ to, subject, html, text });
}

export async function sendEmailVerificationEmail(to: string, verifyUrl: string, displayName: string) {
  const subject = "Verify your LiveBooth email";
  const html = `
    <p>Hi ${displayName},</p>
    <p>Thanks for signing up for LiveBooth. Confirm your email to sign in and start using your booth.</p>
    <p><a href="${verifyUrl}">Verify my email</a></p>
    <p>This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
    <p style="color:#888;font-size:12px">${verifyUrl}</p>
  `.trim();
  const text = `Verify your LiveBooth email: ${verifyUrl}\n\nExpires in 24 hours.`;

  return sendEmail({ to, subject, html, text });
}
