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

## Migration

`20260705170000_support_ticket_assignment` — `SupportTicket.assignedAdminId` for admin assignee.
