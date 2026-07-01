# 11 — DJ Social Sharing

> **Status:** Phase 1 shipped · Phase 2 (recap image) pending  
> **Related:** [06-user-flows.md](./06-user-flows.md) · [09-fan-quests-set-score.md](./09-fan-quests-set-score.md)

**Goal:** Make it effortless for DJs (and fans) to promote sets on X, Instagram, TikTok, WhatsApp, and Discord — with rich link previews and shareable recap assets.

---

## 1. Current state (as built)

| Feature | Status | Location |
|---------|--------|----------|
| DJ profile URL | ✅ | `/dj/[username]` |
| Live stream URL | ✅ | `/stream/[username]` |
| Copy recap text | ✅ | `SessionRecapModal` → clipboard after end stream |
| Help copy “share on socials” | ✅ | `/help/djs` |
| Station embed iframe | ✅ | Settings → Station dashboard |
| Open Graph / Twitter cards | ✅ | `generateMetadata` + `/api/og` |
| Share buttons (X, etc.) | ✅ | `ShareMenu` component |
| Shareable recap image | ❌ | — |
| “I’m live” one-tap post | ❌ | — |
| Clip export for Reels/TikTok | ❌ | VOD clips on roadmap |

**Today:** DJs manually copy links or recap text. Links shared on social **do not** show custom preview images/titles.

---

## 2. User stories

### DJ

1. **Going live:** One tap to copy or post “I’m live” with link + set title.
2. **During set:** Copy booth link from dashboard without hunting URL.
3. **After set:** Share recap with stats (and future grade) as text + image card.
4. **Weekly promo:** Share profile + schedule (“Every Friday 8pm UTC”).

### Fan

1. Share a DJ they’re watching: “Tune in — Neon Pulse is live.”
2. After set score ships: share “I helped hit Grade A” card ([09](./09-fan-quests-set-score.md)).

### Station

1. Share station channel: `/station/kxradio` with branded OG image.
2. Embed player on website (already exists).

---

## 3. Share surfaces (where buttons live)

| Surface | Primary actions | Priority |
|---------|-----------------|----------|
| **DJ dashboard (live)** | Copy link · Share live | P0 |
| **Go live (step 4)** | Copy link · Share live | P0 |
| **Session recap modal** | Copy text · Share · Download image | P0 |
| **DJ profile (own)** | Copy profile · Share schedule | P1 |
| **Stream page (host only)** | Copy link · Share | P1 |
| **Stream page (fan)** | Share DJ live | P2 |
| **VOD page** | Share replay | P2 |
| **Set score card (future)** | Share grade image | P1 |

---

## 4. Share actions (UX)

### 4.1 Share menu component

Reusable **`ShareMenu`** dropdown:

```
┌ Share ─────────────────────┐
│ 🔗 Copy link               │
│ 🐦 Share on X              │
│ 💬 WhatsApp                │
│ 📋 Copy recap text         │
│ 🖼 Download share card     │  (when image available)
└────────────────────────────┘
```

**Web Share API:** On mobile, prefer `navigator.share({ title, text, url })` when available — native OS sheet.

**Fallback:** Platform-specific URLs:

| Platform | URL pattern |
|----------|-------------|
| X (Twitter) | `https://twitter.com/intent/tweet?text={encoded}&url={encoded}` |
| Facebook | `https://www.facebook.com/sharer/sharer.php?u={url}` |
| LinkedIn | `https://www.linkedin.com/sharing/share-offsite/?url={url}` |
| WhatsApp | `https://wa.me/?text={text}%20{url}` |
| Telegram | `https://t.me/share/url?url={url}&text={text}` |

### 4.2 Copy templates

**Live:**

```
🎧 LIVE NOW — {setTitle}
{DJ displayName} on LiveBooth · Tip the drop
{url}
```

**Profile:**

```
Follow {DJ} on LiveBooth — {genre} · {schedule slot if set}
{url}
```

**Recap (existing + enhanced):**

```
{DJ} just finished "{title}" on LiveBooth — {tips} DROP tipped · {peak} peak · Grade {grade}
Tip the drop → {url}
```

**Fan contribution (future):**

```
I helped {DJ} hit Grade {grade} ({score} pts) on LiveBooth 🎧
{url}
```

---

## 5. Open Graph & link previews (critical for social)

When someone pastes `livebooth.fm/stream/neonpulse` on X/iMessage/Discord, show:

| Field | Live stream | DJ profile | VOD |
|-------|-------------|------------|-----|
| `og:title` | `🔴 LIVE — {DJ} · {set title}` | `{DJ} · LiveBooth` | `Replay — {title}` |
| `og:description` | `{genre} · {peak} watching · Tip the drop` | Bio excerpt + follower count | Duration · tips |
| `og:image` | DJ avatar + live badge (dynamic or template) | DJ banner/avatar composite | Thumbnail or waveform art |
| `og:url` | Canonical stream URL | Profile URL | VOD URL |
| `twitter:card` | `summary_large_image` | same | same |

### Implementation approach (Next.js)

- **`generateMetadata`** on:
  - `src/app/stream/[username]/page.tsx`
  - `src/app/dj/[username]/page.tsx`
  - `src/app/vod/[id]/page.tsx`
  - `src/app/station/[slug]/page.tsx`
- **OG image options:**
  - **Phase 1:** Static template + `@vercel/og` dynamic route `/api/og/stream?user=neonpulse`
  - **Phase 2:** Live viewer count on image (cached 60s)

### OG image layout (wireframe)

```
┌────────────────────────────────────────┐
│  LIVEBOOTH          🔴 LIVE            │
│  ┌────┐  Neon Pulse                    │
│  │ NP │  Friday Night Techno          │
│  └────┘  house · 128 BPM · 84 watching │
│           Tip the drop · DROP on VeChain │
└────────────────────────────────────────┘
```

Brand colors: `#53fc18` accent on dark `#0a0a0c`.

---

## 6. Shareable recap image

After stream ends, generate **1200×630 PNG** (OG size) or **1080×1080** (Instagram):

**Content:**

- DJ name + avatar
- Set title
- Grade badge (when set score ships)
- Stats row: tips · peak · duration · unlocks
- QR code or short URL (optional)
- “livebooth.fm” watermark

**Delivery:**

1. Server generates on stream end (store in blob/S3 or generate on demand)
2. Recap modal: **Download image** + **Share**
3. Cache at `/api/og/recap/[streamId].png`

---

## 7. “I'm live” automation (v1.1)

Optional opt-in (Settings):

| Trigger | Action |
|---------|--------|
| DJ clicks **Go live** + confirm | Toast: “Share now?” → Share menu |
| Stream status → `live` (first time) | Web Push to DJ: “You’re live — share link” |
| X account connect (future) | Auto-post once per session (OAuth — high scope, defer) |

**v1:** Manual share only — no OAuth auto-post (complex + API costs).

---

## 8. Clips for TikTok / Reels (Phase 3)

| Step | Detail |
|------|--------|
| Source | VOD HLS → ffmpeg clip 15–60s |
| Trigger | DJ selects “Create clip” on VOD or timestamp tip moment |
| Export | 9:16 vertical MP4 + burned-in “LiveBooth · @{dj}” |
| Share | Download + “Open TikTok” (manual upload — no TikTok API needed) |

Depends on VOD auto-record ([07-development-phases.md](./07-development-phases.md)).

---

## 9. Analytics

Track share events (privacy-safe):

| Event | Properties |
|-------|------------|
| `share_click` | surface, platform (x/whatsapp/copy/image) |
| `share_copy_link` | url type (stream/profile/vod) |
| `og_fetch` | path (from CDN logs) |

**Success metrics (8 weeks post-launch):**

- ≥ 25% of ended streams use at least one share action
- ≥ 15% of new fan sessions arrive with `?ref=share` or UTM
- OG preview click-through rate on X/Discord (external)

### UTM convention

```
?utm_source=x&utm_medium=social&utm_campaign=dj_share&utm_content={username}
```

Append to all share URLs for attribution.

---

## 10. Implementation phases

### Phase 1 — Quick wins (≈3–5 days)

- [ ] `ShareMenu` component (copy link, X, WhatsApp, Web Share API)
- [ ] Add to dashboard (live), go-live step 4, recap modal
- [ ] `generateMetadata` + basic `/api/og/[type]` for stream + DJ profile
- [ ] UTM params on generated links

### Phase 2 — Recap assets (≈1 sprint)

- [ ] Recap OG image route
- [ ] Download share card from recap modal
- [ ] Fan share on stream page (non-host)

### Phase 3 — Clips + automation (≈2 sprints)

- [ ] VOD clip export 9:16
- [ ] Set score on share card ([09](./09-fan-quests-set-score.md))
- [ ] DJ “share reminder” notification on go-live

---

## 11. Out of scope (v1)

- OAuth auto-post to Instagram (Meta API restrictions)
- In-app X login for posting
- Paid “boost post” integration
- Affiliate/referral DROP for shares (consider later with fraud controls)

---

## 12. Content & moderation

- Share text must not include stream keys or admin URLs
- Reported streams: OG image shows “Stream ended” if not live
- Suspended DJs: profile OG shows generic “Unavailable”

---

## 13. Copy deck (DJ-facing)

**Settings tooltip:**

> Share your booth link when you go live — followers get notified, and new fans can tip in DROP.

**Go live CTA:**

> You’re live! Copy your link or share to X so fans can join.

**Empty state (no shares yet):**

> Pro tip: DJs who share their first stream get 2× more peak viewers on average.

*(Validate claim with analytics before using.)*

---

*Last updated: 2026-06 · Owner: Product · Depends on VOD for clips phase.*
