# 06 — User Flows

## Flow 1: Fan discovers and tips a DJ

```
Landing page (/)
  │
  ├─ Browse "Live Now" grid
  │
  ▼
Click stream card
  │
  ▼
Stream page (/stream/neonpulse)
  │
  ├─ Watch live player
  ├─ Read chat
  │
  ├─ [Not connected] → Click "Connect Wallet"
  │     └─ VeWorld or MetaMask / WalletConnect modal
  │     └─ Sign message to verify ownership
  │     └─ Optional: Buy DROP (Stripe on-ramp)
  │
  ├─ Click "Tip" → Select amount (10/25/50/100) → Confirm
  │     └─ TipRouter contract: 90% DJ, 10% platform
  │     └─ Tip appears highlighted in chat
  │
  ├─ Click "Unlock Track ID" (5 DROP)
  │     └─ Current track revealed
  │     └─ Saved to fan's /crate page
  │
  └─ Click "Request Track" (10 DROP)
        └─ Enter track name → Added to DJ queue
```

**Success state:** Fan has tipped, unlocked a track, feels connected to the set.

---

## Flow 2: DJ goes live and earns

```
Dashboard (/dashboard)
  │
  ├─ [Not connected] → Connect wallet (receive address)
  │
  ▼
Go Live (/go-live)
  │
  ├─ Step 1: Stream details (title, genre, BPM)
  ├─ Step 2: Audio setup (OBS RTMP key or browser capture)
  ├─ Step 3: Review → Start broadcast
  │
  ▼
Stream goes LIVE
  │
  ├─ Dashboard shows: viewers, tips rolling in, chat
  ├─ Request queue appears (crowd requests)
  ├─ Accept/decline requests
  ├─ Now playing metadata (manual or Serato sync)
  │
  ▼
During stream
  │
  ├─ Fan tips → notification + balance update
  ├─ Achievement progress updates (e.g. "847/1000 followers")
  │
  ▼
End stream
  │
  ├─ VOD saved automatically
  ├─ Earnings summary: tips, unlocks, requests
  ├─ Achievement unlocked? → Notification to claim
  │
  ▼
Claim achievements (/achievements)
  │
  └─ DROP transferred to wallet from AchievementVault
```

**Success state:** DJ earned DROP from tips + achievements, VOD available for replay.

---

## Flow 3: Achievement unlock and claim

```
DJ streams for 62 minutes (threshold: 60)
  │
  ▼
Achievement Service detects duration ≥ 3600s
  │
  ▼
Unlock "Hour Warrior" for DJ
  │
  ├─ Push notification: "You unlocked Hour Warrior!"
  ├─ Badge appears on /achievements as CLAIMABLE
  │
  ▼
DJ visits /achievements
  │
  ├─ Sees "Hour Warrior" with Claim button (+100 DROP)
  ├─ Clicks Claim
  │
  ▼
Backend verifies unlock + not claimed
  │
  ▼
AchievementVault.transfer(DJ, 100 DROP)
  │
  ├─ tx hash recorded
  ├─ Badge marked CLAIMED on profile
  └─ Wallet balance +100 DROP
```

---

## Flow 4: Crowd request

```
Fan on stream page
  │
  ▼
Click "Request Track" → Enter "Innerbloom - RÜFÜS" → Pay 10 DROP
  │
  ▼
RequestEscrow holds 10 DROP
  │
  ▼
DJ dashboard shows request in queue
  │
  ├─ ACCEPT → DROP released to DJ (minus 15% platform fee)
  │     └─ Fan notified: "Your request was played!"
  │
  └─ DECLINE → DROP refunded to fan (minus 1 DROP processing fee)
        └─ Fan notified: "Request declined, 9 DROP refunded"
```

---

## Flow 5: B2B collab stream

```
DJ A (/dashboard) → "Start Collab" → Invite DJ B by username
  │
  ▼
DJ B receives invite → Accept
  │
  ▼
Both set split ratio (default 50/50)
  │
  ▼
Collab stream goes live
  │
  ├─ Single stream page, both names displayed
  ├─ Both audio feeds mixed (or alternating)
  │
  ▼
Fan tips 100 DROP
  │
  ▼
CollabSplit contract:
  ├─ DJ A: 45 DROP (50% of 90)
  ├─ DJ B: 45 DROP (50% of 90)
  └─ Platform: 10 DROP
```

---

## Flow 6: Fan buys DROP

```
Fan clicks wallet balance → "Buy DROP"
  │
  ▼
Select amount ($10 = 100 DROP at $0.10 rate)
  │
  ├─ Pay with card (Stripe) → Platform mints/transfers DROP
  └─ Pay with ETH (Coinbase Onramp) → Swap to DROP
  │
  ▼
DROP appears in wallet → Ready to tip/unlock/request
```

---

## Flow 7: DJ withdraws earnings

```
DJ (/dashboard) → Wallet section → "Withdraw"
  │
  ▼
Enter amount (min 100 DROP)
  │
  ▼
Select destination: USDC on VeChain / ETH / Bank (via off-ramp)
  │
  ├─ [Under KYC threshold] → Instant withdrawal
  └─ [Over threshold] → KYC verification required
  │
  ▼
2% withdrawal fee deducted
  │
  ▼
Funds sent to DJ's external wallet or bank
```

---

## Flow 8: New user onboarding

```
First visit (/)
  │
  ▼
Browse without wallet (can watch, can chat with email signup)
  │
  ▼
Prompt to connect wallet when tipping/unlocking
  │
  ├─ "Connect Wallet" → VeWorld or MetaMask
  ├─ New user gets 25 DROP welcome bonus (from community pool)
  └─ Prompt: "Follow 3 DJs to earn First Explorer achievement"
  │
  ▼
Optional: DJ signup path
  │
  ├─ "Start Streaming" → Create DJ profile
  ├─ Set genres, upload avatar
  └─ Go live wizard
```

---

## State Diagram: Stream Lifecycle

```
  scheduled ──► live ──► ended
                  │         │
                  │         └──► VOD available
                  │
                  └──► achievements evaluated
                       tips finalized
                       requests closed
```

---

## Error / Edge Cases

| Scenario | Handling |
|----------|----------|
| Tip fails (insufficient DROP) | Show error, suggest buy DROP |
| Tip fails (network/gas) | Retry with gas sponsorship |
| Stream drops | Auto-reconnect, "Stream interrupted" banner |
| DJ doesn't respond to request in 10 min | Auto-decline + refund |
| Duplicate achievement unlock | Idempotent — ignore second trigger |
| Bot viewer inflation | Cap achievement progress, flag for review |
| DMCA during stream | Stream muted, DJ notified, VOD flagged |
