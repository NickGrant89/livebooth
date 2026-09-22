# Admin panel reference

Staff access at `/admin` — full **Admin** role or **Moderator** with scoped permissions.

## Tabs

| Tab | Features |
|-----|----------|
| **Overview** | Platform counts, unread support, streaming infrastructure health (RTMP/HLS) |
| **Analytics** | Users, streams, membership MRR, tips, support, treasury metrics |
| **Users** | Search, create, delete, edit profile, balance adjust, password reset email, role, suspend, invites |
| **Live streams** | Active booths — stop stream with reason |
| **Archive** | Ended sets with replay state (ready / remuxing / unavailable) — bulk delete |
| **Radio stations** | Create, delete, tier, transfer ownership, manage residents |
| **Promotions** | Hero / grid boosts — revenue and cancel |
| **Treasury** | Fiat in (Stripe), balances, withdrawal queue, promo revenue |
| **Moderation** | AI video scan, flagged streams, chat reports, viewer reports |
| **Support** | Ticket inbox with assignee filters and live chat replies |
| **Settings** | Maintenance mode, welcome bonus, signup toggle, beta banner, sponsor banner, bulk CSV import, admin 2FA |
| **Audit log** | Admin action history |

## Creator platform model

- **Primary economy:** in-app DROP ledger — tips, unlocks, requests, membership billing from wallet balance
- **Membership:** fans **Subscribe** to DJs or **Join as member** on stations (Member 25 DROP/mo · Supporter 75 DROP/mo)
- **Creator cash-out:** earned DROP → admin payout from Treasury tab (Stripe Connect when configured)

## Streaming infrastructure

| Endpoint | Value |
|----------|--------|
| RTMP ingest | `rtmp://rtmp.livebooth.uk:1935/live` |
| HLS origin | `https://hls.livebooth.uk` |
| Recordings | `https://hls.livebooth.uk/recordings/{ingestKey}/playback/index.m3u8` |

After a DJ ends a stream, the VPS remux watcher builds fast-start HLS replay — **usually 3–5 minutes**. Admin Archive tab shows **remuxing replay** while processing.

Overview tab pings `/api/rtmp/health` for reachability.

## Support inbox

- **Unread badge** on Support tab when last message is from the user (and not yet read)
- Green dot on ticket cards until opened
- **Assign tickets** to admin users via dropdown on each ticket; filter by All / Assigned to me / Unassigned
- **Open / Closed tabs** — open includes in-progress tickets; closed shows resolved
- Assigning sets status to **in progress** when ticket was open; assignee gets an in-app notification
- Email to `SUPPORT_ALERT_EMAIL` (default `support@livebooth.uk`) when enabled in Settings

Public FAQs: `/support` · DJ troubleshooting: `/help/djs#obs` · Replays: `/help/fans#replays`

## Admin 2FA

1. Admin → **Settings** → Set up 2FA
2. Scan secret in authenticator app
3. Enable with 6-digit code
4. Login at `/login?next=/admin` prompts for TOTP after password

## Bulk user import

CSV with header: `username,email,displayName,password,role`

Roles: `fan`, `dj`, `station` (stored as radio role), `moderator`, `admin`

## Platform settings

Stored in `PlatformStats` id `platform_settings`. Maintenance mode blocks non-admin pages (admins can still access `/admin`).

## Treasury tab

- Fiat in (Stripe), user balances, paid withdrawals, promo revenue
- **Withdrawal queue** — approve, mark paid, reject (refunds DROP)
- Link to public **[Transparency](/transparency)** page

### Stripe Connect setup (Vercel)

1. Enable **Connect** in Stripe Dashboard → Settings → Connect
2. Set env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_COUNTRY=GB`, `STRIPE_PAYOUT_CURRENCY=gbp`
3. Webhook events: `checkout.session.completed`, `account.updated`
4. DJs: **Wallet → Set up payouts** (Express onboarding)
5. Admin **Mark paid** triggers Stripe transfer when DJ is connected (`STRIPE_CONNECT_AUTO_PAYOUT=true`)

Set `STRIPE_CONNECT_AUTO_PAYOUT=false` for manual bank payouts only.
