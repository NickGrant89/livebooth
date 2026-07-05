# Admin panel reference

## Tabs

| Tab | Features |
|-----|----------|
| **Overview** | Platform counts including unread support |
| **Analytics** | Users, streams, tips, support, treasury metrics |
| **Users** | Search, create, delete, edit profile, balance adjust, password reset email, role, suspend |
| **Radio stations** | Create, delete, tier, transfer ownership, manage residents |
| **Settings** | Maintenance mode, welcome bonus, signup toggle, beta banner, support email alerts, bulk CSV import, admin 2FA |

## Support inbox

- **Unread badge** on Support tab when last message is from the user (and not yet read)
- Green dot on ticket cards until opened
- **Assign tickets** to admin users via dropdown on each ticket; filter by All / Assigned to me / Unassigned
- **Open / Closed tabs** — open includes in-progress tickets; closed shows resolved
- Assigning sets status to **in progress** when ticket was open; assignee gets an in-app notification
- Email to `SUPPORT_ALERT_EMAIL` (default `support@livebooth.uk`) when enabled in Settings

## Admin 2FA

1. Admin → **Settings** → Set up 2FA
2. Scan secret in authenticator app
3. Enable with 6-digit code
4. Login at `/login?next=/admin` prompts for TOTP after password

## Bulk user import

CSV with header: `username,email,displayName,password,role`

## Platform settings

Stored in `PlatformStats` id `platform_settings`. Maintenance mode blocks non-admin pages (admins can still access `/admin`).

## Treasury tab

- Fiat in (Stripe), user balances, paid withdrawals, promo revenue
- **On-chain treasury** — TipRouter platform wallet balance (when VeChain contracts configured)
- **Withdrawal queue** — approve, mark paid (auto Stripe Connect transfer when DJ onboarded), reject
- Link to public **[Transparency](/transparency)** page

### Stripe Connect setup (Vercel)

1. Enable **Connect** in Stripe Dashboard → Settings → Connect
2. Set env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_COUNTRY=GB`, `STRIPE_PAYOUT_CURRENCY=gbp`
3. Webhook events: `checkout.session.completed`, `account.updated`
4. DJs: **Wallet → Set up payouts** (Express onboarding)
5. Admin **Mark paid** triggers Stripe transfer when DJ is connected (`STRIPE_CONNECT_AUTO_PAYOUT=true`)

Set `STRIPE_CONNECT_AUTO_PAYOUT=false` for manual bank payouts only.

### On-chain treasury

TipRouter sends 10% of on-chain tips to `platformTreasury`. Public stats at `/transparency` and admin Treasury tab read balance via RPC. Optional override: `NEXT_PUBLIC_PLATFORM_TREASURY_ADDRESS`.
