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

---

## 6. Inbox placement (avoid spam / junk)

Transactional mail (verification, password reset) lands in **Inbox** when your domain looks legitimate to Gmail, Outlook, and Apple Mail. Use this checklist:

### DNS (required)

In Resend → **Domains** → your domain, add **all** records and wait until status is **Verified**:

| Record | Purpose |
|--------|---------|
| **SPF** (TXT) | Authorizes Resend to send for your domain |
| **DKIM** (TXT/CNAME) | Cryptographic signature — biggest factor for inbox |
| **DMARC** (TXT) | Policy + alignment; start with `p=none`, move to `quarantine` later |

Example DMARC (adjust domain):

```txt
_dmarc.livebooth.uk  TXT  "v=DMARC1; p=none; rua=mailto:you@livebooth.uk; fo=1"
```

Without verified SPF + DKIM, mail often goes to **Promotions** or **Junk**.

### Sender identity

```bash
EMAIL_FROM="LiveBooth <noreply@livebooth.uk>"
```

- Use your **real verified domain** — not `@gmail.com`, not `onboarding@resend.dev` in production
- Prefer a dedicated subdomain if the root domain is new: `noreply@mail.livebooth.uk` (add `mail.livebooth.uk` as a separate Resend domain)
- Keep the display name consistent: **LiveBooth** (matches your site)

### Content & behaviour

- **Links must match your domain** — `NEXT_PUBLIC_APP_URL=https://livebooth.uk` so verify/reset URLs use `livebooth.uk`, not localhost or Vercel preview URLs
- Plain-text part is already sent (`text` in `src/lib/email.ts`) — helps reputation
- Avoid ALL CAPS subjects, excessive exclamation marks, or “free money” phrasing
- Send only **transactional** mail from this domain (no bulk marketing on the same `noreply@` without List-Unsubscribe)

### After DNS is live

1. Send a test to **Gmail** and **Outlook** — open the message → **Show original** / **View source** → confirm `spf=pass`, `dkim=pass`, `dmarc=pass`
2. If Gmail still tabs it: mark **Not spam** / move to Primary once — helps future deliverability for that mailbox
3. Register with [Google Postmaster Tools](https://postmaster.google.com/) for `livebooth.uk` (optional but useful at scale)
4. **Warm up**: don’t blast hundreds of signups on day one from a brand-new domain — normal beta traffic is fine

### Common mistakes

| Problem | Fix |
|---------|-----|
| Domain “Pending” in Resend | Finish DNS; can take up to 48h |
| `EMAIL_FROM` uses unverified domain | Must match Resend verified domain exactly |
| Preview deploys sending mail | Only set `RESEND_API_KEY` on production Vercel |
| Users never receive mail | Check Resend **Logs** for bounces/blocks |

If verification works in Resend logs but users see junk, it is almost always **incomplete DKIM/DMARC** or **domain age** — fix DNS first, then retest.
