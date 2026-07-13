import {
  createEmailVerificationToken,
  emailVerificationEnabled,
  getVerifyEmailUrl,
} from "./email-verification";
import { isEmailConfigured, sendEmailVerificationEmail } from "./email";

export async function sendUserVerificationEmail(user: {
  id: string;
  email: string;
  displayName: string;
}) {
  if (!emailVerificationEnabled()) {
    return { ok: true as const, token: null, devVerifyUrl: null };
  }

  const token = await createEmailVerificationToken(user.id);
  const verifyUrl = getVerifyEmailUrl(token);

  if (isEmailConfigured()) {
    const sent = await sendEmailVerificationEmail(user.email, verifyUrl, user.displayName);
    if (!sent.ok && process.env.NODE_ENV === "production") {
      console.error("[email-verification] Resend failed:", sent.error);
    }
    return { ok: sent.ok, token, devVerifyUrl: null, error: sent.error };
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[email-verification] Dev verify link:", verifyUrl);
    return { ok: true, token, devVerifyUrl: verifyUrl };
  }

  console.error("[email-verification] RESEND_API_KEY / EMAIL_FROM not set — user received no email");
  return { ok: false, token, devVerifyUrl: null, error: "email_not_configured" as const };
}
