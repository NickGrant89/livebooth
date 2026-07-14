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
    <div style="font-family:system-ui,sans-serif;max-width:480px;color:#111">
      <p>You requested a password reset for LiveBooth.</p>
      <p style="margin:24px 0">
        <a href="${resetUrl}" style="background:#53fc18;color:#000;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">Reset your password</a>
      </p>
      <p style="color:#666;font-size:14px">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      <p style="color:#999;font-size:12px;word-break:break-all">${resetUrl}</p>
    </div>
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
    <div style="font-family:system-ui,sans-serif;max-width:480px;color:#111">
      <p>Hi ${displayName},</p>
      <p>Thanks for signing up for LiveBooth. Confirm your email to sign in and start using your booth.</p>
      <p style="margin:24px 0">
        <a href="${verifyUrl}" style="background:#53fc18;color:#000;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">Verify my email</a>
      </p>
      <p style="color:#666;font-size:14px">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
      <p style="color:#999;font-size:12px;word-break:break-all">${verifyUrl}</p>
    </div>
  `.trim();
  const text = `Verify your LiveBooth email: ${verifyUrl}\n\nExpires in 24 hours.`;

  return sendEmail({ to, subject, html, text });
}

export async function sendBetaInviteEmail(opts: {
  to: string;
  displayName: string;
  role: string;
  tempPassword: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://livebooth.uk";
  const roleLabel =
    opts.role === "station" ? "Radio" : opts.role === "dj" ? "DJ" : opts.role === "admin" ? "Admin" : "Fan";
  const guidePath =
    opts.role === "station" ? "/help/stations" : opts.role === "dj" ? "/help/djs" : "/help/fans";
  const guideUrl = `${appUrl}${guidePath}`;
  const loginUrl = `${appUrl}/login`;

  const subject = `You're invited to LiveBooth beta (${roleLabel})`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;color:#111;line-height:1.5">
      <p>Hi ${opts.displayName},</p>
      <p>You've been invited to the <strong>LiveBooth beta</strong> as a <strong>${roleLabel}</strong> account.</p>
      <table style="margin:20px 0;font-size:15px;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#666">Login</td><td><a href="${loginUrl}">${loginUrl}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Email</td><td><strong>${opts.to}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Temp password</td><td><code style="background:#f4f4f5;padding:2px 8px;border-radius:4px">${opts.tempPassword}</code></td></tr>
      </table>
      <p style="margin:24px 0">
        <a href="${loginUrl}" style="background:#53fc18;color:#000;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">Sign in to LiveBooth</a>
      </p>
      <p style="color:#666;font-size:14px">Change your password in Settings after your first sign-in.${opts.role === "station" ? " You'll see the station setup wizard when you open Settings." : ""}</p>
      <p style="color:#666;font-size:14px"><a href="${guideUrl}">Read the ${roleLabel} guide</a> · <a href="${appUrl}/support">Get support</a></p>
    </div>
  `.trim();
  const text = `You're invited to LiveBooth beta (${roleLabel}).

Login: ${loginUrl}
Email: ${opts.to}
Temp password: ${opts.tempPassword}

Guide: ${guideUrl}`;

  return sendEmail({ to: opts.to, subject, html, text });
}
