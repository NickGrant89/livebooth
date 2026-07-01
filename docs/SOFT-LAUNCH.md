# Soft launch — 5–10 creators

Use this after production deploy is live (`https://livebooth.uk` or your Vercel URL).

---

## Week 1 timeline

| Day | Task |
|-----|------|
| **Mon** | Register domain, Neon DB, Vercel deploy, smoke test |
| **Tue** | Your admin account, test go-live + tip flow on production |
| **Wed** | Invite 3 creators (1 band, 1 DJ, 1 radio station if possible) |
| **Thu–Fri** | Fix feedback, invite 2–5 more |
| **Week 2** | Stripe Pro tiers OR `/creator/` URL polish (pick one) |

Full deploy steps: [PRODUCTION-DEPLOY.md](./PRODUCTION-DEPLOY.md)

---

## Creator mix (target 5–10)

| Type | Signup | What to test |
|------|--------|--------------|
| **DJ** | Creator → DJ | Go live, track ID, tips |
| **Band** | Creator → Band | Live gig stream, tips, profile badge |
| **Musician** | Creator → Musician | Acoustic/jazz genres, weekly slot |
| **Radio station** | Radio role | Setup wizard, add 1–2 residents |
| **Fans** | Fan | Follow, tip, stake on station |

You (admin) promote creators in `/admin` → Users (role + station tier).

---

## Invite message (copy/paste)

```
You're invited to the LiveBooth beta — tip the drop.

1. Sign up: https://livebooth.uk/signup
2. Choose Creator → [DJ / Band / Musician] (or Radio for stations)
3. Complete your profile in Settings (genres + bio)
4. Go Live: https://livebooth.uk/go-live — OBS setup guide on the page

Support: https://livebooth.uk/support
Fan guide: https://livebooth.uk/help/fans
Creator guide: https://livebooth.uk/help/djs
```

---

## Admin checklist per creator

- [ ] They signed up and you see them in `/admin` → Users
- [ ] Role correct (`dj`, `station`, or `fan`)
- [ ] Station owners: completed Settings setup wizard
- [ ] Pro station: tier bumped in `/admin` → Radio stations
- [ ] They completed one test stream (even 5 min)
- [ ] Fan account tipped them once (internal DROP is fine)

---

## Production settings (you)

- [ ] `NEXT_PUBLIC_DEMO_MODE` **unset** on Vercel
- [ ] `SEED_DEMO_USERS` **unset**
- [ ] `AUTH_SECRET` is not the dev default
- [ ] `NEXT_PUBLIC_APP_URL=https://livebooth.uk` (after DNS)
- [ ] Your account: admin role in `/admin` → Users

---

## After soft launch (week 2)

**If radio stations are the focus:** Stripe subscription for Pro/Network tiers  
**If bands/musicians are the focus:** Creator URL polish (`/creator/username`), less DJ copy in achievements

See [PRODUCTION-DEPLOY.md](./PRODUCTION-DEPLOY.md) § Post-launch backlog.
