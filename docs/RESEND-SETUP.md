# Resend email setup (password reset)

LiveBooth sends password reset links via [Resend](https://resend.com). Without it, resets only work in local dev (link printed to the server console).

---

## 1. Create a Resend account

1. Sign up at [resend.com](https://resend.com)
2. Add your domain (e.g. `livebooth.fm`) under **Domains**
3. Add the DNS records Resend provides (SPF, DKIM, optional DMARC)
4. Wait until the domain shows **Verified**

For quick testing you can use Resend’s sandbox `onboarding@resend.dev` sender — emails only deliver to the address on your Resend account.

---

## 2. Set env vars

On Vercel (or your host) and in local `.env` for testing:

```bash
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM="LiveBooth <noreply@yourdomain.com>"
NEXT_PUBLIC_APP_URL=https://beta.yourdomain.com
```

`EMAIL_FROM` must use a verified domain (or Resend sandbox address).

Implementation: `src/lib/email.ts` → `sendPasswordResetEmail()`.

---

## 3. Verify it works

1. Deploy with the vars above (or restart local dev)
2. Open `/forgot-password`
3. Enter an email for a real account
4. Check inbox (and spam) for “Reset your LiveBooth password”
5. Link goes to `{NEXT_PUBLIC_APP_URL}/reset-password?token=…` (1 hour expiry)

**Local dev without Resend:** the API still returns success (no email enumeration). If `NODE_ENV !== production`, the reset URL is returned as `devResetUrl` in the JSON and logged to the console.

**Production without Resend:** reset requests succeed silently but no email is sent — configure Resend before public beta.

---

## 4. Checklist

- [ ] Domain verified in Resend
- [ ] `RESEND_API_KEY` set on host (not committed to git)
- [ ] `EMAIL_FROM` matches verified domain
- [ ] `NEXT_PUBLIC_APP_URL` matches public HTTPS URL
- [ ] Test reset end-to-end on staging

See also: [BETA-LAUNCH.md](./BETA-LAUNCH.md) · [PRODUCTION-DEPLOY.md](./PRODUCTION-DEPLOY.md)
