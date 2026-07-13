# Resend email setup (password reset & signup verification)

LiveBooth sends **password reset** and **signup verification** emails via [Resend](https://resend.com). Without it, resets only work in local dev (link printed to the server console), and production signups auto-verify in non-production environments only.

---

## 1. Create a Resend account

1. Sign up at [resend.com](https://resend.com)
2. Add your domain (e.g. `livebooth.uk`) under **Domains**
3. Add the DNS records Resend provides (SPF, DKIM, optional DMARC)
4. Wait until the domain shows **Verified**

For quick testing you can use Resend’s sandbox `onboarding@resend.dev` sender — emails only deliver to the address on your Resend account.

---

## 2. Set env vars

On Vercel (or your host) and in local `.env` for testing:

```bash
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM="LiveBooth <noreply@livebooth.uk>"
NEXT_PUBLIC_APP_URL=https://livebooth.uk
```

`EMAIL_FROM` must use a verified domain (or Resend sandbox address).

Implementation: `src/lib/email.ts` → `sendPasswordResetEmail()`, `sendEmailVerificationEmail()`.

**Production signup flow:** new accounts must click the verification link before login (`/verify-email?token=…`, 24 hour expiry). Existing users are grandfathered as verified when you run the migration.

To disable verification (e.g. local demo): `REQUIRE_EMAIL_VERIFICATION=false` or use `NEXT_PUBLIC_DEMO_MODE=true`.

---

## 3. Verify password reset works

1. Deploy with the vars above (or restart local dev)
2. Open `/forgot-password`
3. Enter an email for a real account
4. Check inbox (and spam) for “Reset your LiveBooth password”
5. Link goes to `{NEXT_PUBLIC_APP_URL}/reset-password?token=…` (1 hour expiry)

## 4. Verify signup email works

1. Sign up at `/signup` with a new email
2. You should land on `/verify-email` (not logged in yet)
3. Click **Verify my email** in the inbox
4. You are signed in automatically after verification

**Local dev without Resend:** signup still works immediately (verification skipped outside production). Password reset URL is returned as `devResetUrl` / logged to console.

**Production without Resend:** password reset requests succeed silently but no email is sent — configure Resend before public beta.

---

## 5. Checklist

- [ ] Domain verified in Resend
- [ ] `RESEND_API_KEY` set on host (not committed to git)
- [ ] `EMAIL_FROM` matches verified domain
- [ ] `NEXT_PUBLIC_APP_URL` matches public HTTPS URL
- [ ] Run DB migration (`email_verification`) on production Neon
- [ ] Test reset + signup verification end-to-end on staging

See also: [BETA-LAUNCH.md](./BETA-LAUNCH.md) · [PRODUCTION-DEPLOY.md](./PRODUCTION-DEPLOY.md)
