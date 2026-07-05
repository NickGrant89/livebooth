# Support live chat

Fans, DJs, and station owners can open **live support chat** at [/support](https://livebooth.uk/support).

## Behaviour

- First message creates a `SupportTicket` plus a `SupportTicketMessage`
- Guest access uses a `channelToken` stored in the browser (`localStorage`)
- Signed-in users can also access tickets tied to their account
- Messages poll every 3 seconds (Vercel-friendly, same pattern as stream chat fallback)
- Classic email-style ticket form remains available under "Prefer a one-shot ticket form?"

## Admin

- **Admin → Support** tab shows ticket threads
- Reply in the thread — message appears in the user's chat
- Status: `open` → `in_progress` (on admin reply) → `resolved`

## API

| Route | Purpose |
|-------|---------|
| `POST /api/support/chat/session` | Start chat + ticket |
| `GET /api/support/chat/[ticketId]` | Poll messages (`X-Support-Token` or session) |
| `POST /api/support/chat/[ticketId]` | User message |
| `POST /api/admin/support/messages` | Admin reply |
| `POST /api/support/tickets` | Legacy one-shot form (also creates message) |

## Notifications

- **User:** in-app bell + optional browser push when support replies (signed-in users)
- **Widget:** red badge on the chat button when a reply arrives while closed; browser notification if permission granted
- **Admin:** in-app bell + push when a user starts chat or sends a message → links to `/admin`

```bash
npx prisma migrate deploy
```

Migration: `20260705140000_support_live_chat`
